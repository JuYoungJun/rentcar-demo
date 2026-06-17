<?php
/**
 * 해태렌트카 API — 환경 설정
 * ══════════════════════════════════════════════════════
 *  카페24 호스팅 배포 절차:
 *   1) MySQL DB 생성 (카페24 관리자 콘솔) → phpMyAdmin 으로 db/schema.sql import
 *   2) 아래 DB_* 4개 값을 카페24가 발급한 정보로 교체
 *   3) ALLOWED_ORIGINS / NOTIFY_EMAIL_* 를 실 운영 도메인으로 교체
 *   4) FTP 로 전체 파일 업로드 후 /api/health.php 호출해 OK 확인
 *   5) 초기 비밀번호: phpMyAdmin → admins 테이블 → password_hash 컬럼을
 *      php -r "echo password_hash('실비번', PASSWORD_BCRYPT);" 결과로 교체
 *
 *  ⚠ 이 파일은 .htaccess 로 직접 접근 차단되며, 절대 GitHub 에 실제 DB 정보로 커밋하지 말 것.
 * ══════════════════════════════════════════════════════
 */

// ── DB 연결 정보 (카페24 mysql 발급 정보로 교체) ──────
define('DB_HOST',   'localhost');           // 카페24: localhost
define('DB_NAME',   'your_db_name');        // 카페24 DB 이름 (보통 사용자ID)
define('DB_USER',   'your_db_user');        // 카페24 DB 사용자 (보통 사용자ID)
define('DB_PASS',   'your_db_password');    // 카페24 DB 비밀번호
define('DB_CHARSET', 'utf8mb4');

// ── 세션 설정 ─────────────────────────────────────────
define('SESSION_TTL_SECONDS',  3600);   // 1시간 절대 만료
define('IDLE_TIMEOUT_SECONDS', 1800);   // 30분 유휴 만료
define('LOCKOUT_THRESHOLD',    5);      // 5회 연속 실패 시
define('LOCKOUT_SECONDS',      600);    // 10분 잠금
define('LOCKOUT_WINDOW',       900);    // 실패 카운트 집계 윈도우 (15분)

// ── CORS / 허용 도메인 (운영 도메인으로 교체) ────────
// same-origin 호출은 Origin 헤더가 없으므로 차단되지 않음.
// 다른 도메인에서 호출이 필요할 때만 추가.
define('ALLOWED_ORIGINS', [
  'https://www.haetae-rentcar.com',
  'https://haetae-rentcar.com',
  // 로컬 개발 시 주석 해제:
  // 'http://localhost:8000',
  // 'http://127.0.0.1:8000',
]);

// ── 문의 폼 origin 검증 (CSRF 대용; same-origin 일 때 정상값) ──
// 비어있으면 검증 생략. 운영 도메인 추가 시 ALLOWED_ORIGINS 와 함께 관리.
define('PUBLIC_FORM_ALLOWED_HOSTS', [
  'www.haetae-rentcar.com',
  'haetae-rentcar.com',
  'localhost',
  '127.0.0.1',
]);

// ── 이메일 (문의 알림) ────────────────────────────────
define('NOTIFY_EMAIL_TO',   'admin@haetae-rentcar.com');
define('NOTIFY_EMAIL_FROM', 'noreply@haetae-rentcar.com');
define('NOTIFY_SITE_NAME',  '해태렌트카');

// ── 업로드 ────────────────────────────────────────────
define('UPLOAD_DIR',         dirname(__DIR__) . '/images/uploads');
define('UPLOAD_MAX_BYTES',   5 * 1024 * 1024);   // 5MB
define('UPLOAD_ALLOWED_MIME', ['image/webp', 'image/jpeg', 'image/png']);
define('UPLOAD_ALLOWED_EXT',  ['webp', 'jpg', 'jpeg', 'png']);

// ── 환경 ──────────────────────────────────────────────
define('IS_PRODUCTION', !in_array($_SERVER['SERVER_NAME'] ?? '', ['localhost', '127.0.0.1', ''], true));

// ── 시간대·인코딩 (PHP 기본값에 의존하지 않도록 명시) ──────
// 카페24 서버 기본 timezone 이 UTC 일 가능성에 대비.
// time()/date()/strtotime() 가 모두 KST 기준으로 동작 → 세션 만료·문의 시각이 한국 시간 그대로 표시.
date_default_timezone_set('Asia/Seoul');
mb_internal_encoding('UTF-8');
mb_http_output('UTF-8');

// ── 에러 처리 ─────────────────────────────────────────
if (IS_PRODUCTION) {
  error_reporting(0);
  ini_set('display_errors', '0');
} else {
  error_reporting(E_ALL);
  ini_set('display_errors', '1');
}

// PHP 세션 보안 강화
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure',   IS_PRODUCTION ? '1' : '0');
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_only_cookies', '1');
