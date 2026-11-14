<?php
// 테이블 정의(접두어 ip_)와 동기화 대상 필드 검증. 직접 열어도 출력은 없다.

function ip_create_tables()
{
    $opts = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';
    $sql = [
        "CREATE TABLE IF NOT EXISTS ip_meta (
            meta_key VARCHAR(40) NOT NULL PRIMARY KEY,
            meta_value TEXT NOT NULL
        ) $opts",
        "CREATE TABLE IF NOT EXISTS ip_sessions (
            id CHAR(64) NOT NULL PRIMARY KEY,
            csrf CHAR(32) NOT NULL,
            expires BIGINT NOT NULL,
            KEY idx_expires (expires)
        ) $opts",
        "CREATE TABLE IF NOT EXISTS ip_attempts (
            id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            bucket VARCHAR(60) NOT NULL,
            ts BIGINT NOT NULL,
            KEY idx_bucket (bucket, ts)
        ) $opts",
        "CREATE TABLE IF NOT EXISTS ip_events (
            id VARCHAR(40) NOT NULL PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            start_date CHAR(10) NOT NULL,
            end_date CHAR(10) NOT NULL,
            start_time CHAR(5) NULL,
            end_time CHAR(5) NULL,
            all_day TINYINT NOT NULL DEFAULT 0,
            category VARCHAR(10) NOT NULL DEFAULT 'personal',
            repeat_rule VARCHAR(10) NOT NULL DEFAULT 'none',
            alarm VARCHAR(10) NOT NULL DEFAULT 'none',
            memo TEXT NOT NULL,
            updated BIGINT NOT NULL,
            deleted TINYINT NOT NULL DEFAULT 0,
            synced_at BIGINT NOT NULL,
            KEY idx_synced (synced_at)
        ) $opts",
        "CREATE TABLE IF NOT EXISTS ip_todos (
            id VARCHAR(40) NOT NULL PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            due CHAR(10) NULL,
            done TINYINT NOT NULL DEFAULT 0,
            done_at BIGINT NULL,
            sort BIGINT NOT NULL DEFAULT 0,
            updated BIGINT NOT NULL,
            deleted TINYINT NOT NULL DEFAULT 0,
            synced_at BIGINT NOT NULL,
            KEY idx_synced (synced_at)
        ) $opts",
        "CREATE TABLE IF NOT EXISTS ip_opinions (
            id VARCHAR(40) NOT NULL PRIMARY KEY,
            content TEXT NOT NULL,
            source VARCHAR(100) NOT NULL,
            heard_on CHAR(10) NULL,
            status VARCHAR(10) NOT NULL DEFAULT 'new',
            memo TEXT NOT NULL,
            updated BIGINT NOT NULL,
            deleted TINYINT NOT NULL DEFAULT 0,
            synced_at BIGINT NOT NULL,
            KEY idx_synced (synced_at)
        ) $opts",
        "CREATE TABLE IF NOT EXISTS ip_ink (
            page_key VARCHAR(40) NOT NULL PRIMARY KEY,
            strokes MEDIUMTEXT NOT NULL,
            updated BIGINT NOT NULL,
            deleted TINYINT NOT NULL DEFAULT 0,
            synced_at BIGINT NOT NULL,
            KEY idx_synced (synced_at)
        ) $opts",
    ];
    foreach ($sql as $q) {
        db()->exec($q);
    }
}

// 동기화되는 데이터 종류와 필드 규칙
function ip_schema()
{
    $id = '/^[A-Za-z0-9-]{8,40}$/';
    return [
        'events' => [
            'table' => 'ip_events', 'key' => 'id', 'key_re' => $id,
            'fields' => [
                'title' => ['str', 200],
                'start_date' => ['date', false],
                'end_date' => ['date', false],
                'start_time' => ['time', true],
                'end_time' => ['time', true],
                'all_day' => ['bool'],
                'category' => ['enum', ['sermon', 'worship', 'dept', 'visit', 'personal']],
                'repeat_rule' => ['enum', ['none', 'weekly', 'monthly', 'yearly']],
                'alarm' => ['enum', ['none', 'at', '10m', '1h', '1d']],
                'memo' => ['str', 5000],
            ],
        ],
        'todos' => [
            'table' => 'ip_todos', 'key' => 'id', 'key_re' => $id,
            'fields' => [
                'title' => ['str', 200],
                'due' => ['date', true],
                'done' => ['bool'],
                'done_at' => ['int', true],
                'sort' => ['int', false],
            ],
        ],
        'opinions' => [
            'table' => 'ip_opinions', 'key' => 'id', 'key_re' => $id,
            'fields' => [
                'content' => ['str', 5000],
                'source' => ['str', 100],
                'heard_on' => ['date', true],
                'status' => ['enum', ['new', 'review', 'done', 'hold']],
                'memo' => ['str', 5000],
            ],
        ],
        'ink' => [
            'table' => 'ip_ink', 'key' => 'page_key',
            'key_re' => '/^(year:\d{4}|month:\d{4}-\d{2}|week:\d{4}-\d{2}-\d{2})$/',
            'fields' => [
                'strokes' => ['json'],
            ],
        ],
    ];
}

// 값 검증. [통과 여부, 정리된 값]
function ip_clean($def, $v)
{
    switch ($def[0]) {
        case 'str':
            if ($v === null) {
                return [true, ''];
            }
            if (!is_string($v)) {
                return [false, null];
            }
            $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $v);
            return [true, mb_substr($v, 0, $def[1])];
        case 'date':
            if ($v === null || $v === '') {
                return $def[1] ? [true, null] : [false, null];
            }
            if (!is_string($v) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $v, $m) || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
                return [false, null];
            }
            return [true, $v];
        case 'time':
            if ($v === null || $v === '') {
                return $def[1] ? [true, null] : [false, null];
            }
            if (!is_string($v) || !preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $v)) {
                return [false, null];
            }
            return [true, $v];
        case 'bool':
            return [true, empty($v) ? 0 : 1];
        case 'int':
            if ($v === null) {
                return $def[1] ? [true, null] : [false, null];
            }
            return is_numeric($v) ? [true, (int) $v] : [false, null];
        case 'enum':
            return (is_string($v) && in_array($v, $def[1], true)) ? [true, $v] : [false, null];
        case 'json':
            if (!is_array($v) || count($v) > 5000) {
                return [false, null];
            }
            $enc = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            return ($enc !== false && strlen($enc) <= 3000000) ? [true, $enc] : [false, null];
    }
    return [false, null];
}

// 변경 1건 반영. 서버에 같거나 더 새로운 기록이 있으면 건너뛴다(성공으로 취급).
function ip_apply($pdo, $def, $rec, $now)
{
    if (!is_array($rec)) {
        return false;
    }
    $key = $def['key'];
    $kv = $rec[$key] ?? null;
    if (!is_string($kv) || !preg_match($def['key_re'], $kv)) {
        return false;
    }
    $updated = $rec['updated'] ?? null;
    if (!is_int($updated) && !is_float($updated)) {
        return false;
    }
    $updated = (int) $updated;
    if ($updated <= 0 || $updated > $now + 2 * 86400000) {
        return false;
    }
    $deleted = empty($rec['deleted']) ? 0 : 1;

    $vals = [];
    foreach ($def['fields'] as $name => $fd) {
        $r = ip_clean($fd, $rec[$name] ?? null);
        if (!$r[0]) {
            return false;
        }
        $vals[$name] = $r[1];
    }

    $st = $pdo->prepare("SELECT updated FROM {$def['table']} WHERE $key = ? FOR UPDATE");
    $st->execute([$kv]);
    $existing = $st->fetchColumn();
    if ($existing !== false && (int) $existing >= $updated) {
        return true;
    }

    $cols = array_merge([$key], array_keys($vals), ['updated', 'deleted', 'synced_at']);
    $params = array_merge([$kv], array_values($vals), [$updated, $deleted, $now]);
    $place = implode(',', array_fill(0, count($cols), '?'));
    $upd = [];
    foreach ($cols as $c) {
        if ($c !== $key) {
            $upd[] = "$c = VALUES($c)";
        }
    }
    $sql = "INSERT INTO {$def['table']} (" . implode(',', $cols) . ") VALUES ($place) ON DUPLICATE KEY UPDATE " . implode(',', $upd);
    $pdo->prepare($sql)->execute($params);
    return true;
}

// 응답용으로 형 변환
function ip_row_out($def, $row)
{
    $out = [$def['key'] => $row[$def['key']]];
    foreach ($def['fields'] as $name => $fd) {
        $v = $row[$name];
        if ($fd[0] === 'bool') {
            $v = (int) $v;
        } elseif ($fd[0] === 'int') {
            $v = $v === null ? null : (int) $v;
        } elseif ($fd[0] === 'json') {
            $v = json_decode($v, true);
            if (!is_array($v)) {
                $v = [];
            }
        }
        $out[$name] = $v;
    }
    $out['updated'] = (int) $row['updated'];
    $out['deleted'] = (int) $row['deleted'];
    return $out;
}
