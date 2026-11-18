<?php
// 공통 함수. 이 파일을 직접 열어도 출력은 없다.

function json_out($data, $code = 200)
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

set_exception_handler(function ($e) {
    error_log('[ip-planner] ' . $e);
    json_out(['error' => 'server'], 500);
});

// 설정 파일: 웹 루트 밖(~/private/ip/config.php)을 먼저 찾는다.
function ip_config()
{
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }
    $paths = [dirname(__DIR__, 3) . '/private/ip/config.php', __DIR__ . '/config.php'];
    foreach ($paths as $p) {
        if (is_file($p)) {
            $cfg = require $p;
            return $cfg;
        }
    }
    json_out(['error' => 'config'], 500);
}

function db()
{
    static $pdo = null;
    if ($pdo) {
        return $pdo;
    }
    $c = ip_config()['db'];
    $pdo = new PDO(
        "mysql:host={$c['host']};port={$c['port']};dbname={$c['name']};charset=utf8mb4",
        $c['user'],
        $c['pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    // 옛 구조(한 사람용)면 한 번만 새 구조로 바꾼다
    require_once __DIR__ . '/_migrate.php';
    ip_ensure_schema($pdo);
    return $pdo;
}

function now_ms()
{
    return (int) round(microtime(true) * 1000);
}

function read_json($maxBytes = 8000000)
{
    $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if ($raw === false || strlen($raw) > $maxBytes) {
        json_out(['error' => 'too_large'], 413);
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        json_out(['error' => 'bad_json'], 400);
    }
    return $data;
}

function is_https()
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}

function base_path()
{
    $dir = dirname(dirname($_SERVER['SCRIPT_NAME']));
    return rtrim(str_replace('\\', '/', $dir), '/') . '/';
}

function client_ip()
{
    return substr($_SERVER['REMOTE_ADDR'] ?? '0', 0, 45);
}

// ---- 메타(관리자 비밀번호 해시, 캘린더 구독 토큰) ----

function meta_get($key)
{
    $st = db()->prepare('SELECT meta_value FROM ip_meta WHERE meta_key = ?');
    $st->execute([$key]);
    $v = $st->fetchColumn();
    return $v === false ? null : $v;
}

function meta_set($key, $value)
{
    db()->prepare(
        'INSERT INTO ip_meta (meta_key, meta_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)'
    )->execute([$key, $value]);
}

// ---- 로그인 시도 제한 ----

const IP_ATTEMPT_WINDOW = 900; // 15분
const IP_ATTEMPT_LIMIT = 5;

function attempts_locked($bucket)
{
    $pdo = db();
    $pdo->prepare('DELETE FROM ip_attempts WHERE ts < ?')->execute([time() - IP_ATTEMPT_WINDOW]);
    $st = $pdo->prepare('SELECT COUNT(*), MIN(ts) FROM ip_attempts WHERE bucket = ?');
    $st->execute([$bucket]);
    $row = $st->fetch(PDO::FETCH_NUM);
    if ((int) $row[0] >= IP_ATTEMPT_LIMIT) {
        return max(1, (int) $row[1] + IP_ATTEMPT_WINDOW - time());
    }
    return 0;
}

function attempts_add($bucket)
{
    db()->prepare('INSERT INTO ip_attempts (bucket, ts) VALUES (?, ?)')->execute([$bucket, time()]);
}

function attempts_clear($bucket)
{
    db()->prepare('DELETE FROM ip_attempts WHERE bucket = ?')->execute([$bucket]);
}

// ---- 세션(데이터베이스 저장, 30일) ----

const IP_SESSION_DAYS = 30;

function set_session_cookie($value, $expires)
{
    $attrs = ['ip_session=' . $value, 'Path=' . base_path(), 'HttpOnly', 'SameSite=Strict'];
    if ($value === '') {
        $attrs[] = 'Max-Age=0';
        $attrs[] = 'Expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } else {
        $attrs[] = 'Max-Age=' . (IP_SESSION_DAYS * 86400);
        $attrs[] = 'Expires=' . gmdate('D, d M Y H:i:s', $expires) . ' GMT';
    }
    if (is_https()) {
        $attrs[] = 'Secure';
    }
    header('Set-Cookie: ' . implode('; ', $attrs), false);
}

function create_session($userId)
{
    $token = bin2hex(random_bytes(32));
    $csrf = bin2hex(random_bytes(16));
    $exp = time() + IP_SESSION_DAYS * 86400;
    $pdo = db();
    $pdo->prepare('DELETE FROM ip_sessions WHERE expires < ?')->execute([time()]);
    $pdo->prepare('INSERT INTO ip_sessions (id, csrf, expires, user_id) VALUES (?, ?, ?, ?)')
        ->execute([hash('sha256', $token), $csrf, $exp, (int) $userId]);
    set_session_cookie($token, $exp);
    return $csrf;
}

function current_session()
{
    $t = $_COOKIE['ip_session'] ?? '';
    if (!is_string($t) || !preg_match('/^[a-f0-9]{64}$/', $t)) {
        return null;
    }
    // 사용을 막은 사용자의 로그인은 바로 무효가 된다
    $st = db()->prepare(
        'SELECT s.id, s.csrf, s.expires, s.user_id, u.username, u.display_name, u.is_admin
         FROM ip_sessions s JOIN ip_users u ON u.id = s.user_id
         WHERE s.id = ? AND s.expires > ? AND u.disabled = 0'
    );
    $st->execute([hash('sha256', $t), time()]);
    $row = $st->fetch();
    return $row ?: null;
}

// 로그인 확인. 쓰기 요청이면 POST + JSON + CSRF 토큰까지 확인한다.
function require_auth($write = false)
{
    $s = current_session();
    if (!$s) {
        json_out(['error' => 'auth'], 401);
    }
    if ($write) {
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
            json_out(['error' => 'method'], 405);
        }
        if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
            json_out(['error' => 'content_type'], 415);
        }
        $h = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
        if (!is_string($h) || !hash_equals($s['csrf'], $h)) {
            json_out(['error' => 'csrf'], 403);
        }
    }
    return $s;
}

// 관리자만. 사용자 관리에 쓴다.
function require_admin($write = false)
{
    $s = require_auth($write);
    if ((int) $s['is_admin'] !== 1) {
        json_out(['error' => 'forbidden'], 403);
    }
    return $s;
}

// ---- 사용자 ----

const IP_USERNAME_RE = '/^[a-z0-9][a-z0-9_.-]{1,29}$/';

function user_out($u)
{
    return [
        'id' => (int) $u['id'],
        'username' => $u['username'],
        'display_name' => $u['display_name'],
        'is_admin' => (int) $u['is_admin'],
    ];
}

function user_find_by_name($name)
{
    $st = db()->prepare('SELECT * FROM ip_users WHERE username = ?');
    $st->execute([$name]);
    $r = $st->fetch();
    return $r ?: null;
}

function user_create($username, $displayName, $password, $isAdmin)
{
    $pdo = db();
    $pdo->prepare('INSERT INTO ip_users (username, display_name, pass_hash, ics_token, is_admin, disabled, created) VALUES (?, ?, ?, ?, ?, 0, ?)')
        ->execute([$username, $displayName, password_hash($password, PASSWORD_DEFAULT), bin2hex(random_bytes(24)), $isAdmin ? 1 : 0, now_ms()]);
    return (int) $pdo->lastInsertId();
}

function require_post_json()
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        json_out(['error' => 'method'], 405);
    }
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
        json_out(['error' => 'content_type'], 415);
    }
}
