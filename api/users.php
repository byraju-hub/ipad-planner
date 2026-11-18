<?php
// 사용자 관리(관리자 전용): 목록, 추가, 비밀번호 다시 정하기, 사용 중지·재개
require __DIR__ . '/_lib.php';

function users_list()
{
    $rows = db()->query('SELECT id, username, display_name, is_admin, disabled, created FROM ip_users ORDER BY id')->fetchAll();
    return array_map(function ($u) {
        return user_out($u) + ['disabled' => (int) $u['disabled'], 'created' => (int) $u['created']];
    }, $rows);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    require_admin(false);
    json_out(['ok' => true, 'users' => users_list()]);
}

$s = require_admin(true);
$in = read_json(20000);
$action = (string) ($in['action'] ?? '');
$pdo = db();

if ($action === 'create') {
    $username = strtolower(trim((string) ($in['username'] ?? '')));
    $name = trim((string) ($in['display_name'] ?? ''));
    $password = (string) ($in['password'] ?? '');
    if (!preg_match(IP_USERNAME_RE, $username)) {
        json_out(['error' => 'bad_username'], 400);
    }
    if (strlen($password) < 10 || strlen($password) > 200) {
        json_out(['error' => 'weak_password'], 400);
    }
    $name = mb_substr($name === '' ? $username : $name, 0, 40);
    if (user_find_by_name($username)) {
        json_out(['error' => 'exists'], 409);
    }
    user_create($username, $name, $password, false);
    json_out(['ok' => true, 'users' => users_list()]);
}

$id = (int) ($in['id'] ?? 0);
$st = $pdo->prepare('SELECT * FROM ip_users WHERE id = ?');
$st->execute([$id]);
$target = $st->fetch();
if (!$target) {
    json_out(['error' => 'not_found'], 404);
}

if ($action === 'reset_password') {
    $password = (string) ($in['password'] ?? '');
    if (strlen($password) < 10 || strlen($password) > 200) {
        json_out(['error' => 'weak_password'], 400);
    }
    $pdo->prepare('UPDATE ip_users SET pass_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $id]);
    // 그 사용자의 로그인은 모두 끊는다(내 것이면 지금 기기만 유지)
    $pdo->prepare('DELETE FROM ip_sessions WHERE user_id = ? AND id <> ?')->execute([$id, $s['id']]);
    json_out(['ok' => true, 'users' => users_list()]);
}

if ($action === 'set_disabled') {
    $disabled = empty($in['disabled']) ? 0 : 1;
    if ($id === (int) $s['user_id'] && $disabled) {
        json_out(['error' => 'self'], 400);
    }
    $pdo->prepare('UPDATE ip_users SET disabled = ? WHERE id = ?')->execute([$disabled, $id]);
    if ($disabled) {
        $pdo->prepare('DELETE FROM ip_sessions WHERE user_id = ?')->execute([$id]);
    }
    json_out(['ok' => true, 'users' => users_list()]);
}

json_out(['error' => 'bad_action'], 400);
