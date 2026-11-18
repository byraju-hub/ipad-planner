<?php
// 내 계정 설정: 캘린더 구독 주소 확인·재발급, 비밀번호 변경
require __DIR__ . '/_lib.php';

function ics_url($uid)
{
    $cfg = ip_config();
    $base = !empty($cfg['site_url'])
        ? rtrim($cfg['site_url'], '/') . '/'
        : (is_https() ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . base_path();
    $st = db()->prepare('SELECT ics_token FROM ip_users WHERE id = ?');
    $st->execute([$uid]);
    return $base . 'api/ics.php?token=' . $st->fetchColumn();
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    $s = require_auth(false);
    json_out(['ok' => true, 'ics_url' => ics_url((int) $s['user_id'])]);
}

$s = require_auth(true);
$uid = (int) $s['user_id'];
$in = read_json(20000);
$action = (string) ($in['action'] ?? '');

if ($action === 'rotate_ics') {
    db()->prepare('UPDATE ip_users SET ics_token = ? WHERE id = ?')->execute([bin2hex(random_bytes(24)), $uid]);
    json_out(['ok' => true, 'ics_url' => ics_url($uid)]);
}

if ($action === 'password') {
    $current = (string) ($in['current'] ?? '');
    $next = (string) ($in['next'] ?? '');
    $bucket = 'pw:' . client_ip();
    $wait = attempts_locked($bucket);
    if ($wait > 0) {
        json_out(['error' => 'locked', 'retry' => $wait], 429);
    }
    $st = db()->prepare('SELECT pass_hash FROM ip_users WHERE id = ?');
    $st->execute([$uid]);
    $hash = $st->fetchColumn();
    if ($hash === false || strlen($current) > 200 || !password_verify($current, $hash)) {
        attempts_add($bucket);
        usleep(600000);
        json_out(['error' => 'invalid'], 401);
    }
    if (strlen($next) < 10 || strlen($next) > 200) {
        json_out(['error' => 'weak_password'], 400);
    }
    attempts_clear($bucket);
    db()->prepare('UPDATE ip_users SET pass_hash = ? WHERE id = ?')->execute([password_hash($next, PASSWORD_DEFAULT), $uid]);
    // 내 다른 기기의 로그인은 모두 끊고 지금 기기만 유지한다
    db()->prepare('DELETE FROM ip_sessions WHERE user_id = ? AND id <> ?')->execute([$uid, $s['id']]);
    json_out(['ok' => true]);
}

json_out(['error' => 'bad_action'], 400);
