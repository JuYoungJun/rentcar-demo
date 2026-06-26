<?php
/**
 * Settings store — key-value
 */
require_once __DIR__ . '/_helpers.php';
cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function no_store_headers(): void {
  header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
  header('Pragma: no-cache');
  header('Expires: 0');
}

const PUBLIC_SETTING_KEYS = [
  'site',
  'business',
  'about',
  'banners',
  'banner_meta',
  'hero_banners',
  'faq',
  'info',
  'form_options',
  'terms',
  'privacy',
];

if ($method === 'GET') {
  no_store_headers();
  $key = (string)($_GET['key'] ?? '');

  if ($key) {
    if (!in_array($key, PUBLIC_SETTING_KEYS, true)) {
      require_auth();
    }

    $st = db()->prepare('SELECT `value` FROM settings WHERE `key` = ? LIMIT 1');
    $st->execute([$key]);
    $row = $st->fetch();
    $val = $row ? json_decode($row['value'], true) : null;
    json_out(['ok' => true, 'key' => $key, 'value' => $val]);
  }

  $placeholders = implode(',', array_fill(0, count(PUBLIC_SETTING_KEYS), '?'));
  $st = db()->prepare("SELECT `key`, `value` FROM settings WHERE `key` IN ($placeholders)");
  $st->execute(PUBLIC_SETTING_KEYS);

  $rows = $st->fetchAll();
  $out = [];
  foreach ($rows as $r) {
    $out[$r['key']] = json_decode($r['value'], true);
  }

  json_out(['ok' => true, 'settings' => $out]);
}

$sess = require_auth();
require_csrf($sess);

if ($method === 'PUT' || $method === 'POST') {
  $key = (string)($_GET['key'] ?? '');
  if (!$key) json_out(['ok' => false, 'message' => 'key 필수'], 400);

  $b = json_in();
  $value = $b['value'] ?? null;
  $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($json === false) json_out(['ok' => false, 'message' => 'JSON 직렬화 실패'], 400);

  db()->prepare('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)')
     ->execute([$key, $json]);
  json_out(['ok' => true]);
}

json_out(['error' => 'METHOD'], 405);
