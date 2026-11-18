<?php
require __DIR__ . '/_lib.php';

require_post_json();
$in = read_json(20000);
$username = strtolower(trim((string) ($in['username'] ?? '')));
$password = (string) ($in['password'] ?? '');
$bucket = 'login:' . client_ip();

$wait = attempts_locked($bucket);
if ($wait > 0) {
    json_out(['error' => 'locked', 'retry' => $wait], 429);
}

$user = (strlen($username) <= 30 && preg_match(IP_USERNAME_RE, $username)) ? user_find_by_name($username) : null;
// 없는 아이디도 비슷한 시간이 걸리게 한다(아이디가 있는지 알아내지 못하도록)
if ($user && strlen($password) > 0 && strlen($password) <= 200) {
    $ok = password_verify($password, $user['pass_hash']) && (int) $user['disabled'] === 0;
} else {
    password_hash('dummy', PASSWORD_DEFAULT);
    $ok = false;
}
if (!$ok) {
    attempts_add($bucket);
    usleep(600000);
    json_out(['error' => 'invalid'], 401);
}

attempts_clear($bucket);
$csrf = create_session((int) $user['id']);
json_out(['ok' => true, 'csrf' => $csrf, 'user' => user_out($user)]);
