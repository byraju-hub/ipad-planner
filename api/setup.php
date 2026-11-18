<?php
// 최초 1회 설치: 테이블 생성과 관리자 계정 만들기. 성공하면 이 파일은 스스로 삭제된다.
require __DIR__ . '/_lib.php';
require __DIR__ . '/_schema.php';

require_post_json();
$in = read_json(20000);
$cfg = ip_config();

$key = (string) ($in['key'] ?? '');
if (empty($cfg['setup_key']) || !hash_equals((string) $cfg['setup_key'], $key)) {
    usleep(500000);
    json_out(['error' => 'forbidden'], 403);
}

$password = (string) ($in['password'] ?? '');
if (strlen($password) < 12 || strlen($password) > 200) {
    json_out(['error' => 'weak_password'], 400);
}
$username = strtolower(trim((string) ($in['username'] ?? 'admin')));
if (!preg_match(IP_USERNAME_RE, $username)) {
    json_out(['error' => 'bad_username'], 400);
}

ip_create_tables();
if ((int) db()->query('SELECT COUNT(*) FROM ip_users')->fetchColumn() > 0) {
    json_out(['error' => 'already_setup'], 409);
}
user_create($username, '관리자', $password, true);

@unlink(__FILE__);
json_out(['ok' => true, 'username' => $username]);
