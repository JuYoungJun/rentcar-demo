<?php
require_once __DIR__ . '/_helpers.php';
cors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(['error' => 'METHOD'], 405);

$ip = client_ip();
// 1) 잠금 상태면 즉시 차단
check_login_lockout($ip);

$body = json_in();
$id = trim((string)($body['id'] ?? ''));
$pw = (string)($body['pw'] ?? '');
if (!$id || !$pw) json_out(['ok' => false, 'message' => '아이디와 비밀번호를 입력해주세요.'], 400);

// 사용자 조회
$st = db()->prepare('SELECT * FROM admins WHERE username = ? LIMIT 1');
$st->execute([$id]);
$user = $st->fetch();

// 타이밍 공격 방지 — 사용자 없어도 password_verify 호출
$dummyHash = '$2y$10$abcdefghijklmnopqrstuv1234567890abcdefghijklmnopqrstuv1234';
$hash = $user['password_hash'] ?? $dummyHash;
if (!$user || !password_verify($pw, $hash)) {
  record_login_failure($ip);
  json_out(['ok' => false, 'message' => '아이디 또는 비밀번호가 올바르지 않습니다.'], 401);
}

// 성공 → 실패 카운트 리셋
clear_login_failures($ip);

// 세션 발급
$token = random_token(32);
$csrf  = random_token(24);
$now   = date('Y-m-d H:i:s');
$exp   = date('Y-m-d H:i:s', time() + SESSION_TTL_SECONDS);
db()->prepare('INSERT INTO sessions (token, admin_id, csrf_token, ip_address, user_agent, last_activity_at, expires_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)')
   ->execute([$token, $user['id'], $csrf, client_ip(), $_SERVER['HTTP_USER_AGENT'] ?? '', $now, $exp]);

// last_login 업데이트
db()->prepare('UPDATE admins SET last_login_at = NOW() WHERE id = ?')->execute([$user['id']]);

json_out([
  'ok'    => true,
  'token' => $token,
  'csrf'  => $csrf,
  'user'  => [
    'id'   => $user['username'],
    'name' => $user['display_name'],
    'role' => $user['role'],
  ],
]);
