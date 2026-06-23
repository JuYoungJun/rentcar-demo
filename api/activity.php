<?php
/**
 * Activity 관리 — admin 전용
 * ─────────────────────────────────────────────
 * GET    /api/activity.php?summary=weekly
 *  - 최근 7일 activity 테이블 기준 TOP5 집계
 *
 * DELETE /api/activity.php?all=1
 *  - activity 테이블 전체 삭제
 *  - cars.views / cars.inquiries / cars.contracts 를 0으로 초기화
 */
require_once __DIR__ . '/_helpers.php';
cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$sess = require_auth();

function norm_values(array $values): array {
  if (!$values) return [];

  $min = min($values);
  $max = max($values);

  // 전체 활동이 0이면 전부 0점
  if ((int)$max === 0) {
    return array_map(fn() => 0, $values);
  }

  // 모두 같은 값이지만 0은 아니면 동일 점수
  if ($max == $min) {
    return array_map(fn() => 1, $values);
  }

  return array_map(fn($v) => ($v - $min) / ($max - $min), $values);
}

if ($method === 'GET') {
  $summary = $_GET['summary'] ?? '';

  if ($summary !== 'weekly') {
    json_out(['ok' => false, 'message' => 'summary=weekly 필수'], 400);
  }

  try {
    $pdo = db();

    // 최근 7일 activity 기준으로만 집계.
    // 활동이 하나도 없는 차량은 TOP5 후보에서 제외.
    $stmt = $pdo->query("
      SELECT
        c.id,
        c.name,
        c.image,
        COALESCE(SUM(CASE WHEN a.kind = 'view' THEN 1 ELSE 0 END), 0) AS weeklyViews,
        COALESCE(SUM(CASE WHEN a.kind = 'inquiry' THEN 1 ELSE 0 END), 0) AS weeklyInquiries,
        COALESCE(SUM(CASE WHEN a.kind = 'contract' THEN 1 ELSE 0 END), 0) AS weeklyContracts
      FROM activity a
      INNER JOIN cars c ON c.id = a.car_id
      WHERE a.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY c.id, c.name, c.image
      HAVING (weeklyViews + weeklyInquiries + weeklyContracts) > 0
      ORDER BY c.sort_order ASC, c.id ASC
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    if (!$rows) {
      json_out([
        'ok' => true,
        'top5' => [],
      ]);
    }

    $views = array_map(fn($r) => (int)$r['weeklyViews'], $rows);
    $inquiries = array_map(fn($r) => (int)$r['weeklyInquiries'], $rows);
    $contracts = array_map(fn($r) => (int)$r['weeklyContracts'], $rows);

    $nv = norm_values($views);
    $ni = norm_values($inquiries);
    $nc = norm_values($contracts);

    $top = [];
    foreach ($rows as $i => $r) {
      $score = ($ni[$i] ?? 0) * 0.4 + ($nv[$i] ?? 0) * 0.25 + ($nc[$i] ?? 0) * 0.35;

      $top[] = [
        'id' => (int)$r['id'],
        'name' => $r['name'],
        'image' => $r['image'],
        'weeklyViews' => (int)$r['weeklyViews'],
        'weeklyInquiries' => (int)$r['weeklyInquiries'],
        'weeklyContracts' => (int)$r['weeklyContracts'],
        'score' => round($score, 3),
      ];
    }

    usort($top, function($a, $b) {
      if ($a['score'] == $b['score']) {
        $aTotal = $a['weeklyViews'] + $a['weeklyInquiries'] + $a['weeklyContracts'];
        $bTotal = $b['weeklyViews'] + $b['weeklyInquiries'] + $b['weeklyContracts'];

        if ($aTotal === $bTotal) return $a['id'] <=> $b['id'];
        return $bTotal <=> $aTotal;
      }

      return $b['score'] <=> $a['score'];
    });

    json_out([
      'ok' => true,
      'top5' => array_slice($top, 0, 5),
    ]);
  } catch (Throwable $e) {
    @error_log('[activity-weekly-summary-failed] ' . $e->getMessage());
    json_out(['ok' => false, 'message' => '주간 활동 집계 실패'], 500);
  }
}

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
