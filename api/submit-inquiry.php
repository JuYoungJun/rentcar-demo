<?php
/**
 * 견적 문의 폼 수신 엔드포인트 (공개)
 * ─────────────────────────────────────────────
 * - HTTP POST (application/json 또는 x-www-form-urlencoded) 둘 다 처리
 * - 처리 순서:
 *     1) Origin/Referer 검증 (PUBLIC_FORM_ALLOWED_HOSTS)
 *     2) Honeypot · Rate limit
 *     3) 필수 입력값 검증 + 정제
 *     4) DB inquiries 테이블 INSERT (관리자 페이지에서 즉시 조회 가능)
 *     5) 매니저 이메일 발송 (mail())
 *     6) 백업 로그 (api/data/inquiries.log)
 */

require_once __DIR__ . '/_helpers.php';
cors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_out(['ok' => false, 'error' => 'POST only'], 405);
}

// 1) same-origin 검증
require_same_origin();

// 2) 입력 파싱 (JSON 우선, form-urlencoded fallback)
$raw  = file_get_contents('php://input');
$data = [];
if (!empty($raw)) {
  $j = json_decode($raw, true);
  if (is_array($j)) $data = $j;
}
if (empty($data)) $data = $_POST;

// Honeypot (봇 차단) — 폼에 숨겨진 hp 가 비어있어야 사람
if (!empty($data['hp'])) {
  // 봇에는 정상 응답 — 봇이 재시도하지 않도록
  json_out(['ok' => true, 'message' => 'received'], 200);
}

// 3) Rate-limit (IP 단위, 분당 5건)
$ip = client_ip();
$rlFile = __DIR__ . '/data/rl_' . hash('sha256', $ip) . '.json';
@mkdir(__DIR__ . '/data', 0750, true);
$now = time();
$bucket = ['since' => $now, 'count' => 0];
if (file_exists($rlFile)) {
  $prev = json_decode((string)@file_get_contents($rlFile), true);
  if (is_array($prev) && ($now - ($prev['since'] ?? 0)) < 60) $bucket = $prev;
}
if ($bucket['count'] >= 5) {
  json_out(['ok' => false, 'error' => '잠시 후 다시 시도해주세요.'], 429);
}
$bucket['count']++;
@file_put_contents($rlFile, json_encode($bucket), LOCK_EX);

// 4) 필수/선택 필드 정제
$clean = static function ($s) {
  if ($s === null) return null;
  // 헤더 인젝션 방지: CR/LF 제거
  return preg_replace('/[\r\n\t\0]+/', ' ', trim((string)$s));
};
$category  = $clean($data['category'] ?? '');
$type      = $clean($data['type']     ?? '');  // 신규: 카테고리 세부 타입
$carName   = $clean($data['carName']  ?? '');
$carId     = isset($data['carId']) && is_numeric($data['carId']) ? (int)$data['carId'] : null;
$name      = $clean($data['name']     ?? '');
$phone     = $clean($data['phone']    ?? '');
$region    = $clean($data['region']   ?? '');
$period    = $clean($data['period']   ?? '');
$startDate = $clean($data['startDate'] ?? '');
$experience= $clean($data['experience'] ?? '');
$message   = (string)($data['message'] ?? '');
$source    = $clean($data['source']   ?? 'unknown');

// 필수 검증
if ($category === '' || $name === '' || $phone === '') {
  json_out(['ok' => false, 'error' => '필수 항목이 비어 있습니다.'], 400);
}
if (!preg_match('/^[0-9\-+\s]{7,20}$/', $phone)) {
  json_out(['ok' => false, 'error' => '연락처 형식이 올바르지 않습니다.'], 400);
}
if (mb_strlen($name) > 64)     $name = mb_substr($name, 0, 64);
if (mb_strlen($message) > 2000) $message = mb_substr($message, 0, 2000);
// 메시지는 CRLF 보존 (이메일/관리자에서 줄바꿈 의미가 있음), 단 null 바이트 제거
$message = str_replace("\0", '', $message);

// 5) DB INSERT
$ua = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);
try {
  $stmt = db()->prepare(
    'INSERT INTO inquiries
       (source, type, category, car_name, car_id, name, phone, region, period, start_date, experience, message, ip_address, user_agent)
     VALUES
       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([
    mb_substr($source ?: 'web', 0, 32),
    mb_substr($type   ?: '',    0, 32),
    mb_substr($category,        0, 64),
    mb_substr($carName,         0, 80),
    $carId,
    mb_substr($name,            0, 64),
    mb_substr($phone,           0, 32),
    mb_substr($region,          0, 32),
    mb_substr($period,          0, 32),
    mb_substr($startDate,       0, 32),
    mb_substr($experience,      0, 32),
    $message,
    substr($ip, 0, 45),
    $ua,
  ]);
  $inquiryId = (int)db()->lastInsertId();

  // 차량별 문의 카운트 + activity 로그
  if ($carId) {
    db()->prepare('UPDATE cars SET inquiries = inquiries + 1 WHERE id = ?')->execute([$carId]);
    db()->prepare("INSERT INTO activity (car_id, kind) VALUES (?, 'inquiry')")->execute([$carId]);
  }
} catch (Throwable $e) {
  // DB 저장 실패 시 관리자 페이지에 문의가 보이지 않으므로 성공 처리하지 않음
  @error_log('[inquiry-insert-failed] ' . $e->getMessage());
  json_out([
    'ok' => false,
    'error' => 'DB_INSERT_FAILED',
    'message' => '문의 저장에 실패했습니다. 잠시 후 다시 시도해주세요.',
  ], 500);
}

// 6) 매니저 이메일 발송
$siteName = defined('NOTIFY_SITE_NAME') ? NOTIFY_SITE_NAME : '해태렌트카';
$subject  = '[' . $siteName . '] 견적 문의 — ' . ($carName ?: $category);
$body  = "■ {$siteName} 견적 문의 수신\n";
$body .= "════════════════════════════════════════\n";
$body .= "접수 일시: " . date('Y-m-d H:i:s') . "\n";
$body .= "출처: {$source}\n";
$body .= "카테고리: {$category}" . ($type ? " ({$type})" : '') . "\n";
$body .= "차량명: {$carName}" . ($carId ? " (#{$carId})" : '') . "\n";
$body .= "신청자: {$name}\n";
$body .= "연락처: {$phone}\n";
if ($region)     $body .= "희망 지역: {$region}\n";
if ($period)     $body .= "희망 기간: {$period}\n";
if ($startDate)  $body .= "이용 시작: {$startDate}\n";
if ($experience) $body .= "운전 경력: {$experience}\n";
$body .= "════════════════════════════════════════\n";
$body .= "메시지:\n{$message}\n";
$body .= "════════════════════════════════════════\n";
$body .= "DB id: {$inquiryId}\n";
$body .= "IP: {$ip}\n";
$body .= "User-Agent: {$ua}\n";

$to = defined('NOTIFY_EMAIL_TO') ? NOTIFY_EMAIL_TO : '';
$from = defined('NOTIFY_EMAIL_FROM') ? NOTIFY_EMAIL_FROM : '';
$mailOk = false;
if ($to) {
  $headers  = "From: {$siteName} <{$from}>\r\n";
  $headers .= "Reply-To: {$from}\r\n";
  $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
  $headers .= "X-Mailer: PHP/" . PHP_VERSION;
  $mailOk = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
}

// 7) 백업 로그
@file_put_contents(__DIR__ . '/data/inquiries.log',
  json_encode([
    'ts' => date('c'), 'ip' => $ip, 'dbId' => $inquiryId, 'mailSent' => $mailOk,
    'source' => $source, 'category' => $category, 'carName' => $carName,
    'name' => $name, 'phone' => $phone,
  ], JSON_UNESCAPED_UNICODE) . "\n",
  FILE_APPEND | LOCK_EX
);

json_out([
  'ok' => true,
  'id' => $inquiryId,
  'mailSent' => (bool)$mailOk,
  'message' => '견적 문의가 정상적으로 접수되었습니다.',
]);
