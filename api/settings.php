<?php
/**
 * Settings store — key-value (site/business/about/banners/banner_meta/hero_banners/faq/info/form_options/terms/privacy)
 * GET    /api/settings.php?key=site        — 단일 값
 * GET    /api/settings.php                  — 전체 키 (공개)
 * PUT    /api/settings.php?key=site        — 단일 값 저장 (admin)
 */
require_once __DIR__ . '/_helpers.php';
cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
  $key = (string)($_GET['key'] ?? '');
  if ($key) {
    $st = db()->prepare('SELECT `value` FROM settings WHERE `key` = ? LIMIT 1');
    $st->execute([$key]);
    $row = $st->fetch();
    $val = $row ? json_decode($row['value'], true) : null;
    json_out(['ok' => true, 'key' => $key, 'value' => $val]);
  }
  // 전체
  $rows = db()->query('SELECT `key`, `value` FROM settings')->fetchAll();
  $out = [];
  foreach ($rows as $r) $out[$r['key']] = json_decode($r['value'], true);
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

  // upsert
  db()->prepare('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)')
     ->execute([$key, $json]);
  json_out(['ok' => true]);
}

json_out(['error' => 'METHOD'], 405);
