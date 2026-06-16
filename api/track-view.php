<?php
/**
 * 차량 상세 조회 트래킹 (공개)
 * POST /api/track-view.php  body: { carId: number }
 *  - cars.views +1
 *  - activity 테이블에 kind='view' 기록
 *  - 너무 빈번한 호출(같은 IP+carId 30초 내) 무시
 *
 * 클라이언트는 fire-and-forget (응답 확인 안 함) 호출 권장.
 */
require_once __DIR__ . '/_helpers.php';
cors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['ok' => false], 405);
require_same_origin();

$body = json_in();
$carId = isset($body['carId']) && is_numeric($body['carId']) ? (int)$body['carId'] : 0;
if ($carId < 1) json_out(['ok' => false, 'error' => 'carId required'], 400);

// 같은 IP 가 같은 차량을 30초 내 재요청하면 무시 (어뷰징 방지)
$ip = client_ip();
$dedupFile = __DIR__ . '/data/view_' . hash('sha256', $ip . '|' . $carId) . '.tmp';
@mkdir(__DIR__ . '/data', 0750, true);
if (file_exists($dedupFile) && (time() - filemtime($dedupFile)) < 30) {
  json_out(['ok' => true, 'deduped' => true]);
}
@touch($dedupFile);

try {
  db()->prepare('UPDATE cars SET views = views + 1 WHERE id = ?')->execute([$carId]);
  db()->prepare("INSERT INTO activity (car_id, kind) VALUES (?, 'view')")->execute([$carId]);
  json_out(['ok' => true]);
} catch (Throwable $e) {
  // 트래킹은 실패해도 무시 — 서비스 영향 없음
  json_out(['ok' => false, 'error' => 'tracking failed'], 200);
}
