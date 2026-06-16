<?php
/**
 * Image upload — admin 전용 (multipart/form-data)
 * POST /api/upload-image.php  field: file
 * Returns: { ok, name, url }
 */
require_once __DIR__ . '/_helpers.php';
cors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(['error' => 'METHOD'], 405);

$sess = require_auth();
require_csrf($sess);

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

// 저장 경로: images/uploads/YYYY/MM/
$ym = date('Y/m');
$dir = UPLOAD_DIR . '/' . $ym;
if (!is_dir($dir) && !mkdir($dir, 0755, true)) {
  json_out(['ok' => false, 'message' => '디렉토리 생성 실패'], 500);
}

// 안전한 파일명 (xss/path-traversal 차단)
$ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) $ext = 'webp';
$basename = preg_replace('/[^A-Za-z0-9가-힣_\-]+/u', '_', pathinfo($f['name'], PATHINFO_FILENAME));
$basename = mb_substr($basename ?: 'image', 0, 60);
$name = $basename . '_' . substr(random_token(4), 0, 8) . '.' . $ext;
$rel = 'images/uploads/' . $ym . '/' . $name;
$abs = $dir . '/' . $name;

if (!move_uploaded_file($f['tmp_name'], $abs)) {
  json_out(['ok' => false, 'message' => '저장 실패'], 500);
}

// 디스크에 image 사이즈 추출
$size = @getimagesize($abs);

// DB 메타 등록
db()->prepare('INSERT INTO uploaded_images (name, path, mime, bytes, width, height, uploaded_by) VALUES (?,?,?,?,?,?,?)')
   ->execute([$name, $rel, $mime, $f['size'], $size[0] ?? null, $size[1] ?? null, $sess['admin_id']]);

json_out(['ok' => true, 'name' => $name, 'url' => '/' . $rel]);
