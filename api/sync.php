<?php
// 동기화: 기기에서 바뀐 항목을 받아 반영하고, since 이후 서버에서 바뀐 항목을 돌려준다.
require __DIR__ . '/_lib.php';
require __DIR__ . '/_schema.php';

require_auth(true);
$in = read_json();
$since = max(0, (int) ($in['since'] ?? 0));
$changes = (isset($in['changes']) && is_array($in['changes'])) ? $in['changes'] : [];
$now = now_ms();
$pdo = db();
$rejected = [];

$pdo->beginTransaction();
try {
    foreach (ip_schema() as $name => $def) {
        $list = $changes[$name] ?? [];
        if (!is_array($list)) {
            continue;
        }
        if (count($list) > 5000) {
            $pdo->rollBack();
            json_out(['error' => 'too_many'], 413);
        }
        foreach ($list as $rec) {
            if (!ip_apply($pdo, $def, $rec, $now)) {
                $rejected[] = [$name, is_array($rec) ? ($rec[$def['key']] ?? '') : ''];
            }
        }
    }
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $e;
}

$out = ['now' => $now, 'rejected' => $rejected];
foreach (ip_schema() as $name => $def) {
    $st = $pdo->prepare("SELECT * FROM {$def['table']} WHERE synced_at >= ? ORDER BY synced_at");
    $st->execute([$since]);
    $rows = [];
    foreach ($st->fetchAll() as $row) {
        $rows[] = ip_row_out($def, $row);
    }
    $out[$name] = $rows;
}
json_out($out);
