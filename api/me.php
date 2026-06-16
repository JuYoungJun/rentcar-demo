<?php
require_once __DIR__ . '/_helpers.php';
cors();

$sess = require_auth();
json_out([
  'ok'   => true,
  'user' => [
    'id'   => $sess['username'],
    'name' => $sess['display_name'],
    'role' => $sess['role'],
  ],
  'csrf' => $sess['csrf_token'],
]);
