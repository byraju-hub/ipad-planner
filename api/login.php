<?php
require __DIR__ . '/_lib.php';

require_post_json();
$in = read_json(20000);
$password = (string) ($in['password'] ?? '');
$bucket = 'login:' . client_ip();

$wait = attempts_locked($bucket);
if ($wait > 0) {
    json_out(['error' => 'locked', 'retry' => $wait], 429);
}

$hash = meta_get('admin_hash');
$ok = $hash !== null && strlen($password) > 0 && strlen($password) <= 200 && password_verify($password, $hash);
if (!$ok) {
    attempts_add($bucket);
    usleep(600000);
    json_out(['error' => 'invalid'], 401);
}

attempts_clear($bucket);
$csrf = create_session();
json_out(['ok' => true, 'csrf' => $csrf]);
