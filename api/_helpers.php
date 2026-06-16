<?php
/**
 * 공통 헬퍼 — CORS / JSON IO / 인증 검증 / rate limit
 */
require_once __DIR__ . '/_config.php';
require_once __DIR__ . '/_db.php';

/** CORS — 허용 origin 만 응답 */
function cors() {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
  }
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') { http_response_code(204); exit; }
}

/** JSON 응답 */
function json_out($data, int $status = 200): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

/** JSON 요청 본문 파싱 */
function json_in(): array {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $d = json_decode($raw, true);
  return is_array($d) ? $d : [];
}

/** Authorization: Bearer <token> 추출 */
function bearer_token(): ?string {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
  if (preg_match('/Bearer\s+([a-f0-9]{32,})/i', $h, $m)) return $m[1];
  return null;
}

/** 현재 인증된 admin 반환 — 없으면 401 */
function require_auth(): array {
  $token = bearer_token();
  if (!$token) json_out(['error' => 'NO_TOKEN'], 401);
  $st = db()->prepare('SELECT s.*, a.username, a.display_name, a.role
                       FROM sessions s
                       JOIN admins a ON a.id = s.admin_id
                       WHERE s.token = ? LIMIT 1');
  $st->execute([$token]);
  $sess = $st->fetch();
  if (!$sess) json_out(['error' => 'INVALID_TOKEN'], 401);
  $now = time();
  if (strtotime($sess['expires_at']) < $now) {
    db()->prepare('DELETE FROM sessions WHERE token = ?')->execute([$token]);
    json_out(['error' => 'SESSION_EXPIRED'], 401);
  }
  if ($now - strtotime($sess['last_activity_at']) > IDLE_TIMEOUT_SECONDS) {
    db()->prepare('DELETE FROM sessions WHERE token = ?')->execute([$token]);
    json_out(['error' => 'IDLE_TIMEOUT'], 401);
  }
  // 활동 갱신
  db()->prepare('UPDATE sessions SET last_activity_at = NOW() WHERE token = ?')->execute([$token]);
  return $sess;
}

/** CSRF 검증 — POST/PUT/DELETE 요청에서 호출 */
function require_csrf(array $sess): void {
  $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
  if (!$token || !hash_equals($sess['csrf_token'], $token)) {
    json_out(['error' => 'CSRF_FAILED'], 403);
  }
}

/** super admin 만 허용 */
function require_super(array $sess): void {
  if (($sess['role'] ?? '') !== 'super') json_out(['error' => 'FORBIDDEN'], 403);
}

function client_ip(): string {
  foreach (['HTTP_X_FORWARDED_FOR','HTTP_X_REAL_IP','REMOTE_ADDR'] as $k) {
    if (!empty($_SERVER[$k])) return trim(explode(',', $_SERVER[$k])[0]);
  }
  return '0.0.0.0';
}

function random_token(int $bytes = 32): string {
  return bin2hex(random_bytes($bytes));
}

/**
 * Brute-force 로그인 throttle (파일 기반)
 * ──────────────────────────────────────────────
 * /api/data/lock_<ip>.json 에 실패 카운트·마지막 실패 시각을 기록.
 * - LOCKOUT_WINDOW(15분) 내 누적 실패 ≥ LOCKOUT_THRESHOLD(5) → LOCKOUT_SECONDS(10분) 잠금.
 * - 잠금 중에는 어떤 로그인 시도도 401 + 잔여 시간 반환.
 * - 성공 시 카운트 리셋 호출 권장.
 *
 *  → 별도 DB 테이블 필요 없음. 카페24 공유 호스팅에서도 안전하게 동작.
 */
function _login_lock_path(string $ip): string {
  $dir = __DIR__ . '/data';
  if (!is_dir($dir)) @mkdir($dir, 0750, true);
  return $dir . '/lock_' . hash('sha256', $ip) . '.json';
}
function check_login_lockout(string $ip): void {
  $f = _login_lock_path($ip);
  if (!file_exists($f)) return;
  $d = json_decode((string)@file_get_contents($f), true);
  if (!is_array($d)) return;
  $now = time();
  // 잠금 상태?
  if (!empty($d['lockedUntil']) && $now < $d['lockedUntil']) {
    $remaining = $d['lockedUntil'] - $now;
    json_out(['ok' => false, 'code' => 'LOCKED', 'message' => '로그인 시도가 너무 많습니다. ' . ceil($remaining/60) . '분 후 다시 시도해주세요.', 'lockedFor' => $remaining], 429);
  }
  // 윈도우 만료된 카운트는 정리
  if (!empty($d['since']) && ($now - $d['since']) > LOCKOUT_WINDOW) @unlink($f);
}
function record_login_failure(string $ip): void {
  $f = _login_lock_path($ip);
  $now = time();
  $d = ['since' => $now, 'attempts' => 0, 'lockedUntil' => 0];
  if (file_exists($f)) {
    $prev = json_decode((string)@file_get_contents($f), true);
    if (is_array($prev) && ($now - ($prev['since'] ?? 0)) < LOCKOUT_WINDOW) $d = $prev;
  }
  $d['attempts'] = (int)($d['attempts'] ?? 0) + 1;
  if ($d['attempts'] >= LOCKOUT_THRESHOLD) {
    $d['lockedUntil'] = $now + LOCKOUT_SECONDS;
  }
  @file_put_contents($f, json_encode($d), LOCK_EX);
}
function clear_login_failures(string $ip): void {
  $f = _login_lock_path($ip);
  if (file_exists($f)) @unlink($f);
}

/**
 * Public form Origin/Referer 검증 (CSRF 대용)
 * same-origin 호출이면 Origin/Referer 가 운영 도메인이어야 통과.
 */
function require_same_origin(): void {
  $allowed = defined('PUBLIC_FORM_ALLOWED_HOSTS') ? PUBLIC_FORM_ALLOWED_HOSTS : [];
  if (empty($allowed)) return;  // 검증 비활성
  $origin  = $_SERVER['HTTP_ORIGIN']  ?? '';
  $referer = $_SERVER['HTTP_REFERER'] ?? '';
  $host = '';
  if ($origin)  $host = parse_url($origin,  PHP_URL_HOST) ?: '';
  if (!$host && $referer) $host = parse_url($referer, PHP_URL_HOST) ?: '';
  // Origin/Referer 둘 다 없으면 일부 브라우저/봇 — 차단
  if (!$host) json_out(['ok' => false, 'code' => 'NO_ORIGIN', 'message' => '잘못된 접근입니다.'], 403);
  if (!in_array(strtolower($host), array_map('strtolower', $allowed), true)) {
    json_out(['ok' => false, 'code' => 'BAD_ORIGIN', 'message' => '허용되지 않은 출처입니다.'], 403);
  }
}
