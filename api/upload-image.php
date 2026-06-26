<?php
/**
 * Image upload — admin 전용
 * GET    /api/upload-image.php              — 업로드 이미지 목록
 * POST   /api/upload-image.php  field:file  — 이미지 업로드
 * DELETE /api/upload-image.php?name=xxx     — 이미지 삭제
 */
require_once __DIR__ . '/_helpers.php';
cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$sess = require_auth();

if ($method === 'GET') {
  $rows = db()->query('SELECT id, name, path, mime, bytes, width, height, created_at FROM uploaded_images ORDER BY id DESC')->fetchAll();
  foreach ($rows as &$r) {
    $r['url'] = '/' . ltrim((string)$r['path'], '/');
  }
  json_out(['ok' => true, 'images' => $rows]);
}

require_csrf($sess);

if ($method === 'DELETE') {
  $name = trim((string)($_GET['name'] ?? ''));
  if ($name === '') json_out(['ok' => false, 'message' => 'name 필수'], 400);

  $st = db()->prepare('SELECT * FROM uploaded_images WHERE name = ? LIMIT 1');
  $st->execute([$name]);
  $row = $st->fetch();
  if (!$row) json_out(['ok' => true, 'deleted' => false]);

  $path = (string)($row['path'] ?? '');
  if (!preg_match('#^images/uploads/[0-9]{4}/[0-9]{2}/[^/]+$#', $path)) {
    json_out(['ok' => false, 'message' => '삭제할 수 없는 경로입니다.'], 400);
  }

  $abs = dirname(__DIR__) . '/' . $path;

  try {
    db()->prepare('DELETE FROM uploaded_images WHERE name = ?')->execute([$name]);
    if (is_file($abs)) @unlink($abs);
    json_out(['ok' => true, 'deleted' => true]);
  } catch (Throwable $e) {
    @error_log('[upload-image-delete-failed] ' . $e->getMessage());
    json_out(['ok' => false, 'message' => '이미지 삭제 실패'], 500);
  }
}

if ($method !== 'POST') {
  json_out(['error' => 'METHOD'], 405);
}

if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
  json_out(['ok' => false, 'message' => '업로드 실패'], 400);
}

$f = $_FILES['file'];

if ($f['size'] > UPLOAD_MAX_BYTES) {
  json_out(['ok' => false, 'message' => '5MB 초과'], 413);
}

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($f['tmp_name']);

if (!in_array($mime, UPLOAD_ALLOWED_MIME, true)) {
  json_out(['ok' => false, 'message' => '허용되지 않은 파일 형식: ' . $mime], 415);
}

$ym = date('Y/m');
$dir = UPLOAD_DIR . '/' . $ym;

if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
  json_out(['ok' => false, 'message' => '디렉토리 생성 실패'], 500);
}

$ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
  $ext = $mime === 'image/png' ? 'png' : ($mime === 'image/jpeg' ? 'jpg' : 'webp');
}

$basename = preg_replace('/[^A-Za-z0-9가-힣_\-]+/u', '_', pathinfo($f['name'], PATHINFO_FILENAME));
$basename = mb_substr($basename ?: 'image', 0, 60);

$tries = 0;
do {
  $name = $basename . '_' . substr(random_token(4), 0, 8) . '.' . $ext;
  $rel = 'images/uploads/' . $ym . '/' . $name;
  $abs = $dir . '/' . $name;
  $tries++;
} while (file_exists($abs) && $tries < 5);

if (file_exists($abs)) {
  json_out(['ok' => false, 'message' => '파일명 생성 실패'], 500);
}

if (!move_uploaded_file($f['tmp_name'], $abs)) {
  json_out(['ok' => false, 'message' => '저장 실패'], 500);
}

$size = @getimagesize($abs);

try {
  db()->prepare('INSERT INTO uploaded_images (name, path, mime, bytes, width, height, uploaded_by) VALUES (?,?,?,?,?,?,?)')
     ->execute([$name, $rel, $mime, $f['size'], $size[0] ?? null, $size[1] ?? null, $sess['admin_id']]);
} catch (Throwable $e) {
  @unlink($abs);
  @error_log('[upload-image-db-failed] ' . $e->getMessage());
  json_out(['ok' => false, 'message' => '이미지 DB 등록 실패'], 500);
}

json_out([
  'ok' => true,
  'name' => $name,
  'path' => $rel,
  'url' => '/' . $rel,
  'mime' => $mime,
  'bytes' => $f['size'],
  'width' => $size[0] ?? null,
  'height' => $size[1] ?? null,
]);
