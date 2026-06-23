<?php
/**
 * Activity 관리 — admin 전용
 * ─────────────────────────────────────────────
 * DELETE /api/activity.php?all=1
 *  - activity 테이블 전체 삭제
 *  - cars.views / cars.inquiries / cars.contracts 를 0으로 초기화
 */
require_once __DIR__ . '/_helpers.php';
cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$sess = require_auth();

if ($method === 'DELETE') {
  require_csrf($sess);

  if (empty($_GET['all'])) {
    json_out(['ok' => false, 'message' => 'all=1 필수'], 400);
  }

  // 운영 지표 초기화는 실수 방지를 위해 super admin 만 허용
  require_super($sess);

  try {
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->exec('DELETE FROM activity');
    $pdo->exec('UPDATE cars SET views = 0, inquiries = 0, contracts = 0');
    $pdo->commit();

    json_out(['ok' => true, 'deleted' => 'all']);
  } catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    @error_log('[activity-reset-failed] ' . $e->getMessage());
    json_out(['ok' => false, 'message' => '활동 로그 초기화 실패'], 500);
  }
}

json_out(['error' => 'METHOD'], 405);
