<?php
// 최초 1회 설치: 테이블 생성과 관리자 비밀번호 설정. 성공하면 이 파일은 스스로 삭제된다.
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

ip_create_tables();
if (meta_get('admin_hash') !== null) {
    json_out(['error' => 'already_setup'], 409);
}
meta_set('admin_hash', password_hash($password, PASSWORD_DEFAULT));
meta_set('ics_token', bin2hex(random_bytes(24)));

@unlink(__FILE__);
json_out(['ok' => true]);
