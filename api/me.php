<?php
require __DIR__ . '/_lib.php';

$s = require_auth(false);
json_out(['ok' => true, 'csrf' => $s['csrf'], 'user' => user_out(['id' => $s['user_id']] + $s)]);
