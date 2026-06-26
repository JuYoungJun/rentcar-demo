<?php
/**
 * 차량 상세 조회 트래킹 (공개)
 * POST /api/track-view.php body: { carId: number }
 */
require_once __DIR__ . '/_helpers.php';
cors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  json_out(['ok' => false, 'error' => 'POST only'], 405);
}

require_same_origin();

function cleanup_view_dedup_files(): void {
  if (mt_rand(1, 100) !== 1) return;
  foreach (glob(__DIR__ . '/data/view_*.tmp') ?: [] as $file) {
    if (is_file($file) && time() - filemtime($file) > 3600) @unlink($file);
  }
}
cleanup_view_dedup_files();

$body = json_in();
$carId = isset($body['carId']) && is_numeric($body['carId']) ? (int)$body['carId'] : 0;
if ($carId < 1) json_out(['ok' => false, 'error' => 'carId required'], 400);

$ip = client_ip();
@mkdir(__DIR__ . '/data', 0750, true);
$dedupFile = __DIR__ . '/data/view_' . hash('sha256', $ip . '|' . $carId) . '.tmp';
if (file_exists($dedupFile) && (time() - filemtime($dedupFile)) < 30) {
  json_out(['ok' => true, 'deduped' => true]);
}
@touch($dedupFile);

try {
  $st = db()->prepare('UPDATE cars SET views = views + 1 WHERE id = ?');
  $st->execute([$carId]);

  if ($st->rowCount() < 1) {
    json_out(['ok' => false, 'error' => 'car not found'], 404);
  }

  db()->prepare("INSERT INTO activity (car_id, kind) VALUES (?, 'view')")->execute([$carId]);
  json_out(['ok' => true]);
} catch (Throwable $e) {
  @error_log('[track-view-failed] ' . $e->getMessage());
  json_out(['ok' => false, 'error' => 'tracking failed'], 200);
}
