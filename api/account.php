<?php
// 계정 설정: 캘린더 구독 주소 확인·재발급, 비밀번호 변경
require __DIR__ . '/_lib.php';

function ics_url()
{
    $cfg = ip_config();
    $base = !empty($cfg['site_url'])
        ? rtrim($cfg['site_url'], '/') . '/'
        : (is_https() ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . base_path();
    return $base . 'api/ics.php?token=' . meta_get('ics_token');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    require_auth(false);
    json_out(['ok' => true, 'ics_url' => ics_url()]);
}

$s = require_auth(true);
$in = read_json(20000);
$action = (string) ($in['action'] ?? '');

if ($action === 'rotate_ics') {
    meta_set('ics_token', bin2hex(random_bytes(24)));
    json_out(['ok' => true, 'ics_url' => ics_url()]);
}

if ($action === 'password') {
    $current = (string) ($in['current'] ?? '');
    $next = (string) ($in['next'] ?? '');
    $bucket = 'pw:' . client_ip();
    $wait = attempts_locked($bucket);
    if ($wait > 0) {
        json_out(['error' => 'locked', 'retry' => $wait], 429);
    }
    $hash = meta_get('admin_hash');
    if ($hash === null || strlen($current) > 200 || !password_verify($current, $hash)) {
        attempts_add($bucket);
        usleep(600000);
        json_out(['error' => 'invalid'], 401);
    }
    if (strlen($next) < 10 || strlen($next) > 200) {
        json_out(['error' => 'weak_password'], 400);
    }
    attempts_clear($bucket);
    meta_set('admin_hash', password_hash($next, PASSWORD_DEFAULT));
    // 다른 기기의 로그인은 모두 끊고 지금 기기만 유지한다
    db()->prepare('DELETE FROM ip_sessions WHERE id <> ?')->execute([$s['id']]);
    json_out(['ok' => true]);
}

json_out(['error' => 'bad_action'], 400);
