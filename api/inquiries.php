<?php
/**
 * Inquiries — admin 전용
 * GET    /api/inquiries.php                    — 전체 목록
 * PUT    /api/inquiries.php?id=X               — 상태/읽음 업데이트
 * DELETE /api/inquiries.php?id=X               — 삭제
 * DELETE /api/inquiries.php?all=1              — 전체 삭제
 */
require_once __DIR__ . '/_helpers.php';
cors();

$sess = require_auth();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
  $rows = db()->query('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 1000')->fetchAll();
  // 컬럼명 → 프론트엔드 카멜케이스
  foreach ($rows as &$r) {
    $r['createdAt']  = $r['created_at']; unset($r['created_at']);
    $r['carName']    = $r['car_name'];   unset($r['car_name']);
    $r['carId']      = $r['car_id'];     unset($r['car_id']);
    $r['startDate']  = $r['start_date']; unset($r['start_date']);
    $r['isRead']     = (bool)$r['is_read']; unset($r['is_read']);
    $r['ip']         = $r['ip_address']; unset($r['ip_address']);
    $r['userAgent']  = $r['user_agent']; unset($r['user_agent']);
  }
  json_out(['ok' => true, 'inquiries' => $rows]);
}

require_csrf($sess);

if ($method === 'PUT') {
  $id = (int)($_GET['id'] ?? 0);
  if (!$id) json_out(['ok' => false, 'message' => 'id 필수'], 400);
  $b = json_in();
  $fields = []; $vals = [];
  if (isset($b['status']))  { $fields[] = '`status` = ?';  $vals[] = $b['status']; }
  if (isset($b['isRead']))  { $fields[] = '`is_read` = ?'; $vals[] = $b['isRead'] ? 1 : 0; }
  if (!$fields) json_out(['ok' => false, 'message' => '업데이트 필드 없음'], 400);
  $vals[] = $id;
  db()->prepare('UPDATE inquiries SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($vals);
  json_out(['ok' => true]);
}

if ($method === 'DELETE') {
  if (!empty($_GET['all'])) {
    db()->exec('DELETE FROM inquiries');
    json_out(['ok' => true, 'deleted' => 'all']);
  }
  $id = (int)($_GET['id'] ?? 0);
  if (!$id) json_out(['ok' => false, 'message' => 'id 필수'], 400);
  db()->prepare('DELETE FROM inquiries WHERE id = ?')->execute([$id]);
  json_out(['ok' => true]);
}

json_out(['error' => 'METHOD'], 405);
