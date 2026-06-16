<?php
/**
 * Health check — 배포 직후 동작 확인용
 * GET /api/health.php
 * 응답: { ok, db, php, time }
 *   - 운영 정보는 최소화 (버전·환경은 노출 안 함)
 */
require_once __DIR__ . '/_helpers.php';
cors();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') json_out(['ok' => false, 'error' => 'GET only'], 405);

$dbOk = false;
$tables = [];
try {
  $row = db()->query('SELECT 1 AS ok')->fetch();
  $dbOk = ($row && (int)$row['ok'] === 1);

  // 필수 테이블 존재 확인 (배포 시 schema.sql 누락 검출)
  $required = ['admins', 'sessions', 'cars', 'settings', 'inquiries', 'activity', 'uploaded_images'];
  $existing = [];
  foreach (db()->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $t) {
    $existing[] = strtolower($t);
  }
  foreach ($required as $t) {
    $tables[$t] = in_array($t, $existing, true);
  }
} catch (Throwable $e) {
  $dbOk = false;
}

$ok = $dbOk && !in_array(false, $tables, true);

http_response_code($ok ? 200 : 503);
json_out([
  'ok'     => $ok,
  'db'     => $dbOk,
  'tables' => $tables,
  'time'   => date('c'),
]);
