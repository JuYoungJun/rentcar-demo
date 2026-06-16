<?php
/**
 * Cars CRUD — 차량 조회 (공개) + 수정 (admin)
 * GET     /api/cars.php          — 공개 차량 목록
 * POST    /api/cars.php          — 차량 추가 (admin)
 * PUT     /api/cars.php?id=X     — 차량 수정 (admin)
 * DELETE  /api/cars.php?id=X     — 차량 삭제 (admin)
 */
require_once __DIR__ . '/_helpers.php';
cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
  $rows = db()->query('SELECT * FROM cars ORDER BY sort_order ASC, id ASC')->fetchAll();
  // JSON 컬럼은 string 으로 오므로 디코딩
  foreach ($rows as &$r) {
    $r['categories'] = json_decode($r['categories'] ?? '[]', true) ?: [];
    $r['tags']       = json_decode($r['tags']       ?? '[]', true) ?: [];
    $r['features']   = json_decode($r['features']   ?? '[]', true) ?: [];
    // 프론트엔드 데이터 모델과 일치하도록 컬럼명 변환
    $r['fuelType']     = $r['fuel_type'];     unset($r['fuel_type']);
    $r['detailImage']  = $r['detail_image'];  unset($r['detail_image']);
    $r['category']     = $r['categories'];    unset($r['categories']);
  }
  json_out(['ok' => true, 'cars' => $rows]);
}

// 이하 admin 전용
$sess = require_auth();
require_csrf($sess);

if ($method === 'POST') {
  $b = json_in();
  // 입력 검증
  $name  = trim((string)($b['name'] ?? ''));
  $price = (int)($b['price'] ?? 0);
  if (!$name)        json_out(['ok' => false, 'message' => '차량명 필수'], 400);
  if ($price <= 0)   json_out(['ok' => false, 'message' => '가격은 0보다 커야 합니다'], 400);
  $cats = isset($b['category']) && is_array($b['category']) ? $b['category'] : [];
  if (!$cats)        json_out(['ok' => false, 'message' => '카테고리 1개 이상 필요'], 400);

  $sql = 'INSERT INTO cars (name, year, price, badge, image, categories, tags, fuel_type, transmission, seats, mileage, description, features, detail_image, views, inquiries, contracts)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  db()->prepare($sql)->execute([
    mb_substr($name, 0, 80),
    isset($b['year']) ? (int)$b['year'] : null,
    $price,
    $b['badge'] ?? null,
    $b['image'] ?? null,
    json_encode($cats, JSON_UNESCAPED_UNICODE),
    json_encode($b['tags'] ?? [], JSON_UNESCAPED_UNICODE),
    $b['fuelType'] ?? null,
    $b['transmission'] ?? null,
    isset($b['seats']) ? (int)$b['seats'] : null,
    isset($b['mileage']) ? (int)$b['mileage'] : null,
    $b['description'] ?? null,
    json_encode($b['features'] ?? [], JSON_UNESCAPED_UNICODE),
    $b['detailImage'] ?? null,
    (int)($b['views'] ?? 0),
    (int)($b['inquiries'] ?? 0),
    (int)($b['contracts'] ?? 0),
  ]);
  json_out(['ok' => true, 'id' => (int)db()->lastInsertId()]);
}

if ($method === 'PUT') {
  $id = (int)($_GET['id'] ?? 0);
  if (!$id) json_out(['ok' => false, 'message' => 'id 필수'], 400);
  $b = json_in();
  $sql = 'UPDATE cars SET name=?, year=?, price=?, badge=?, image=?, categories=?, tags=?, fuel_type=?, transmission=?, seats=?, mileage=?, description=?, features=?, detail_image=?, views=?, inquiries=?, contracts=? WHERE id=?';
  db()->prepare($sql)->execute([
    mb_substr((string)($b['name'] ?? ''), 0, 80),
    isset($b['year']) ? (int)$b['year'] : null,
    (int)($b['price'] ?? 0),
    $b['badge'] ?? null,
    $b['image'] ?? null,
    json_encode($b['category'] ?? [], JSON_UNESCAPED_UNICODE),
    json_encode($b['tags'] ?? [], JSON_UNESCAPED_UNICODE),
    $b['fuelType'] ?? null,
    $b['transmission'] ?? null,
    isset($b['seats']) ? (int)$b['seats'] : null,
    isset($b['mileage']) ? (int)$b['mileage'] : null,
    $b['description'] ?? null,
    json_encode($b['features'] ?? [], JSON_UNESCAPED_UNICODE),
    $b['detailImage'] ?? null,
    (int)($b['views'] ?? 0),
    (int)($b['inquiries'] ?? 0),
    (int)($b['contracts'] ?? 0),
    $id,
  ]);
  json_out(['ok' => true]);
}

if ($method === 'DELETE') {
  $id = (int)($_GET['id'] ?? 0);
  if (!$id) json_out(['ok' => false, 'message' => 'id 필수'], 400);
  db()->prepare('DELETE FROM cars WHERE id = ?')->execute([$id]);
  json_out(['ok' => true]);
}

json_out(['error' => 'METHOD'], 405);
