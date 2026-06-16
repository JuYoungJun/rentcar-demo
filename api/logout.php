<?php
require_once __DIR__ . '/_helpers.php';
cors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(['error' => 'METHOD'], 405);

$token = bearer_token();
if ($token) {
  db()->prepare('DELETE FROM sessions WHERE token = ?')->execute([$token]);
}
json_out(['ok' => true]);
