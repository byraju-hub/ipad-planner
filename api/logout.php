<?php
require __DIR__ . '/_lib.php';

$s = require_auth(true);
db()->prepare('DELETE FROM ip_sessions WHERE id = ?')->execute([$s['id']]);
set_session_cookie('', 0);
json_out(['ok' => true]);
