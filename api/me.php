<?php
require __DIR__ . '/_lib.php';

$s = require_auth(false);
json_out(['ok' => true, 'csrf' => $s['csrf']]);
