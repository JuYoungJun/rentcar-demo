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

function no_store_headers(): void {
  header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
  header('Pragma: no-cache');
  header('Expires: 0');
}

function normalize_car_payload(array $b): array {
  $name  = trim((string)($b['name'] ?? ''));
  $price = (int)($b['price'] ?? 0);
  $cats  = isset($b['category']) && is_array($b['category']) ? $b['category'] : [];

  $cats = array_values(array_filter($cats, function ($v) {
    return in_array($v, ['monthly', 'longterm', 'used'], true);
  }));

  if ($name === '') json_out(['ok' => false, 'message' => '차량명 필수'], 400);
  if (mb_strlen($name) > 80) $name = mb_substr($name, 0, 80);
  if ($price <= 0) json_out(['ok' => false, 'message' => '가격은 0보다 커야 합니다'], 400);
  if (!$cats) json_out(['ok' => false, 'message' => '카테고리 1개 이상 필요'], 400);

  $year = isset($b['year']) && $b['year'] !== '' ? (int)$b['year'] : null;
  if ($year !== null && ($year < 1990 || $year > 2099)) {
    json_out(['ok' => false, 'message' => '연식은 1990~2099 사이여야 합니다'], 400);
  }

  $seats = isset($b['seats']) && $b['seats'] !== '' ? (int)$b['seats'] : null;
  if ($seats !== null && ($seats < 1 || $seats > 20)) {
    json_out(['ok' => false, 'message' => '승차 인원은 1~20명 사이여야 합니다'], 400);
  }

  $mileage = isset($b['mileage']) && $b['mileage'] !== '' ? (int)$b['mileage'] : null;
  if ($mileage !== null && $mileage < 0) {
    json_out(['ok' => false, 'message' => '주행거리는 0 이상이어야 합니다'], 400);
  }

  $image = trim((string)($b['image'] ?? ''));
  $detailImage = trim((string)($b['detailImage'] ?? ''));
  if (mb_strlen($image) > 255) $image = mb_substr($image, 0, 255);
  if (mb_strlen($detailImage) > 255) $detailImage = mb_substr($detailImage, 0, 255);

  return [
    'name' => $name,
    'year' => $year,
    'price' => $price,
    'badge' => mb_substr((string)($b['badge'] ?? ''), 0, 20) ?: null,
    'image' => $image !== '' ? $image : null,
    'category' => $cats,
    'tags' => isset($b['tags']) && is_array($b['tags']) ? $b['tags'] : [],
    'fuelType' => $b['fuelType'] ?? null,
    'transmission' => $b['transmission'] ?? null,
    'seats' => $seats,
    'mileage' => $mileage,
    'description' => $b['description'] ?? null,
    'features' => isset($b['features']) && is_array($b['features']) ? $b['features'] : [],
    'detailImage' => $detailImage !== '' ? $detailImage : null,
    'views' => max(0, (int)($b['views'] ?? 0)),
    'inquiries' => max(0, (int)($b['inquiries'] ?? 0)),
    'contracts' => max(0, (int)($b['contracts'] ?? 0)),
  ];
}

if ($method === 'GET') {
  no_store_headers();
  $rows = db()->query('SELECT * FROM cars ORDER BY sort_order ASC, id ASC')->fetchAll();
  foreach ($rows as &$r) {
    $r['categories'] = json_decode($r['categories'] ?? '[]', true) ?: [];
    $r['tags']       = json_decode($r['tags']       ?? '[]', true) ?: [];
    $r['features']   = json_decode($r['features']   ?? '[]', true) ?: [];
    $r['fuelType']     = $r['fuel_type'];     unset($r['fuel_type']);
    $r['detailImage']  = $r['detail_image'];  unset($r['detail_image']);
    $r['category']     = $r['categories'];    unset($r['categories']);
  }
  json_out(['ok' => true, 'cars' => $rows]);
}

$sess = require_auth();
require_csrf($sess);

if ($method === 'POST') {
  $b = normalize_car_payload(json_in());

  $sql = 'INSERT INTO cars (name, year, price, badge, image, categories, tags, fuel_type, transmission, seats, mileage, description, features, detail_image, views, inquiries, contracts)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  db()->prepare($sql)->execute([
    $b['name'],
    $b['year'],
    $b['price'],
    $b['badge'],
    $b['image'],
    json_encode($b['category'], JSON_UNESCAPED_UNICODE),
    json_encode($b['tags'], JSON_UNESCAPED_UNICODE),
    $b['fuelType'],
    $b['transmission'],
    $b['seats'],
    $b['mileage'],
    $b['description'],
    json_encode($b['features'], JSON_UNESCAPED_UNICODE),
    $b['detailImage'],
    $b['views'],
    $b['inquiries'],
    $b['contracts'],
  ]);
  json_out(['ok' => true, 'id' => (int)db()->lastInsertId()]);
}

if ($method === 'PUT') {
  $id = (int)($_GET['id'] ?? 0);
  if (!$id) json_out(['ok' => false, 'message' => 'id 필수'], 400);

  $b = normalize_car_payload(json_in());

  $sql = 'UPDATE cars SET name=?, year=?, price=?, badge=?, image=?, categories=?, tags=?, fuel_type=?, transmission=?, seats=?, mileage=?, description=?, features=?, detail_image=?, views=?, inquiries=?, contracts=? WHERE id=?';
  $st = db()->prepare($sql);
  $st->execute([
    $b['name'],
    $b['year'],
    $b['price'],
    $b['badge'],
    $b['image'],
    json_encode($b['category'], JSON_UNESCAPED_UNICODE),
    json_encode($b['tags'], JSON_UNESCAPED_UNICODE),
    $b['fuelType'],
    $b['transmission'],
    $b['seats'],
    $b['mileage'],
    $b['description'],
    json_encode($b['features'], JSON_UNESCAPED_UNICODE),
    $b['detailImage'],
    $b['views'],
    $b['inquiries'],
    $b['contracts'],
    $id,
  ]);
  json_out(['ok' => true, 'updated' => $st->rowCount()]);
}

if ($method === 'DELETE') {
  $id = (int)($_GET['id'] ?? 0);
  if (!$id) json_out(['ok' => false, 'message' => 'id 필수'], 400);

  $pdo = db();
  $pdo->beginTransaction();

  try {
    $pdo->prepare('DELETE FROM activity WHERE car_id = ?')->execute([$id]);
    $pdo->prepare('UPDATE inquiries SET car_id = NULL WHERE car_id = ?')->execute([$id]);
    $st = $pdo->prepare('DELETE FROM cars WHERE id = ?');
    $st->execute([$id]);

    $pdo->commit();
    json_out(['ok' => true, 'deleted' => $st->rowCount()]);
  } catch (Throwable $e) {
    $pdo->rollBack();
    @error_log('[car-delete-failed] ' . $e->getMessage());
    json_out(['ok' => false, 'message' => '차량 삭제 실패'], 500);
  }
}

json_out(['error' => 'METHOD'], 405);
