<?php
// 데이터베이스 구조 변환. 직접 열어도 출력은 없다.
// 버전 2: 여러 사용자(계정별 데이터). 기존 한 사람용 데이터는 첫 사용자(관리자)에게 연결한다.
// 되돌릴 수 있게 원래 표는 ip_bak1_* 로 복사해 둔다. 여러 번 실행해도 안전하다(이미 한 단계는 건너뜀).

const IP_SCHEMA_VERSION = 2;

function ip_col_exists($pdo, $table, $col)
{
    $st = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $st->execute([$table, $col]);
    return (int) $st->fetchColumn() > 0;
}

function ip_users_sql($p)
{
    return "CREATE TABLE IF NOT EXISTS {$p}users (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(30) NOT NULL,
        display_name VARCHAR(40) NOT NULL,
        pass_hash VARCHAR(255) NOT NULL,
        ics_token CHAR(48) NOT NULL,
        is_admin TINYINT NOT NULL DEFAULT 0,
        disabled TINYINT NOT NULL DEFAULT 0,
        created BIGINT NOT NULL,
        UNIQUE KEY uq_username (username),
        UNIQUE KEY uq_ics (ics_token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";
}

// 표 이름 접두어($p)를 바꿔 시험해 볼 수 있다(기본은 실제 표 ip_).
function ip_migrate_v2($pdo, $p = 'ip_')
{
    $meta = function ($k) use ($pdo, $p) {
        $st = $pdo->prepare("SELECT meta_value FROM {$p}meta WHERE meta_key = ?");
        $st->execute([$k]);
        $v = $st->fetchColumn();
        return $v === false ? null : $v;
    };

    $pdo->exec(ip_users_sql($p));

    // 1) 백업(처음 한 번만 만든다)
    foreach (['events', 'todos', 'opinions', 'ink'] as $t) {
        $pdo->exec("CREATE TABLE IF NOT EXISTS {$p}bak1_$t AS SELECT * FROM {$p}$t");
    }

    // 2) 사용자 번호 칸 추가
    foreach (['events', 'todos', 'opinions'] as $t) {
        if (!ip_col_exists($pdo, "{$p}$t", 'user_id')) {
            $pdo->exec("ALTER TABLE {$p}$t ADD COLUMN user_id INT NOT NULL DEFAULT 0, ADD KEY idx_user_synced (user_id, synced_at)");
        }
    }
    if (!ip_col_exists($pdo, "{$p}ink", 'user_id')) {
        $pdo->exec("ALTER TABLE {$p}ink ADD COLUMN user_id INT NOT NULL DEFAULT 0 FIRST, DROP PRIMARY KEY, ADD PRIMARY KEY (user_id, page_key)");
    }
    if (!ip_col_exists($pdo, "{$p}sessions", 'user_id')) {
        $pdo->exec("ALTER TABLE {$p}sessions ADD COLUMN user_id INT NOT NULL DEFAULT 0");
    }

    // 3) 첫 사용자: 지금까지 쓰던 비밀번호와 캘린더 구독 주소를 그대로 이어받는다
    $adminId = $pdo->query("SELECT id FROM {$p}users WHERE is_admin = 1 ORDER BY id LIMIT 1")->fetchColumn();
    if ($adminId === false) {
        $hash = $meta('admin_hash');
        if ($hash === null) {
            return; // 아직 설치 전: 옮길 데이터가 없다
        }
        $token = $meta('ics_token');
        if (!is_string($token) || !preg_match('/^[a-f0-9]{48}$/', $token)) {
            $token = bin2hex(random_bytes(24));
        }
        $pdo->prepare("INSERT INTO {$p}users (username, display_name, pass_hash, ics_token, is_admin, disabled, created) VALUES ('admin', '관리자', ?, ?, 1, 0, ?)")
            ->execute([$hash, $token, (int) round(microtime(true) * 1000)]);
        $adminId = (int) $pdo->lastInsertId();
    }
    $adminId = (int) $adminId;

    // 4) 기존 데이터와 로그인 상태를 첫 사용자에게 연결
    foreach (['events', 'todos', 'opinions', 'ink', 'sessions'] as $t) {
        $pdo->prepare("UPDATE {$p}$t SET user_id = ? WHERE user_id = 0")->execute([$adminId]);
    }

    $pdo->prepare("INSERT INTO {$p}meta (meta_key, meta_value) VALUES ('schema_version', ?) ON DUPLICATE KEY UPDATE meta_value = VALUES(meta_value)")
        ->execute([(string) IP_SCHEMA_VERSION]);
}

// 요청마다 호출된다: 구조가 옛것이면 한 번만 변환한다.
function ip_ensure_schema($pdo)
{
    try {
        $v = $pdo->query("SELECT meta_value FROM ip_meta WHERE meta_key = 'schema_version'")->fetchColumn();
    } catch (Throwable $e) {
        return; // 표가 아직 없다(설치 전)
    }
    if ($v !== false && (int) $v >= IP_SCHEMA_VERSION) {
        return;
    }
    $got = $pdo->query("SELECT GET_LOCK('ip_planner_migrate', 20)")->fetchColumn();
    if ((int) $got !== 1) {
        throw new RuntimeException('migration lock');
    }
    try {
        $v = $pdo->query("SELECT meta_value FROM ip_meta WHERE meta_key = 'schema_version'")->fetchColumn();
        if ($v === false || (int) $v < IP_SCHEMA_VERSION) {
            ip_migrate_v2($pdo, 'ip_');
        }
    } finally {
        $pdo->query("SELECT RELEASE_LOCK('ip_planner_migrate')")->fetchColumn();
    }
}
