# 해태렌트카 API — 카페24 배포 가이드

PHP 8.x + MySQL/MariaDB 10.x 기반의 관리자/공개 API.

---

## 1. 카페24 호스팅에서 준비

1. **DB 발급**: 카페24 관리자 콘솔 → **"MySQL DB"** 메뉴에서 DB 생성 (DB명·사용자명은 보통 본인 카페24 ID 와 동일)
    - ⚠ 카페24 콘솔에서 메뉴명은 "MySQL DB" 지만 **실제로 돌아가는 엔진은 MariaDB 10.x** (업계 관행 — AWS RDS for MySQL, Synology DSM 도 동일하게 표기). PHP PDO 드라이버 `mysql:` 가 둘 다 호환하므로 본 프로젝트의 `schema.sql` 이 그대로 작동합니다. 로컬 풀스택 테스트도 정확히 같은 MariaDB 10.6 으로 검증했습니다.
2. **무료 SSL 신청**: 카페24 SSL 메뉴에서 "Let's Encrypt 무료 SSL" 신청 → 발급 완료까지 약 10분
3. **PHP 버전 확인**: PHP 설정 메뉴에서 PHP 8.x 선택 (가능하면 8.2 또는 8.4)

## 2. DB 초기화

phpMyAdmin 진입:
- `db/schema.sql` 파일을 import (utf8mb4 / utf8mb4_general_ci 로 설정)
- 정상 import 시 다음 7개 테이블이 생성됩니다:
  - `admins`, `sessions`, `cars`, `settings`, `inquiries`, `activity`, `uploaded_images`

## 3. 초기 관리자 비밀번호 설정

`schema.sql` 의 기본 admin 비밀번호 해시는 의도적으로 무효한 값입니다.
로컬 또는 카페24 SSH 에서 새 해시 생성:

```bash
php -r "echo password_hash('실비번_여기에', PASSWORD_BCRYPT) . PHP_EOL;"
```

phpMyAdmin → `admins` 테이블 → `admin` 사용자 → `password_hash` 컬럼에 결과를 붙여넣기.
첫 로그인 후 관리자 페이지에서 비밀번호 변경 권장.

## 4. 환경 설정 (`api/_config.php`)

FTP 접속 후 `api/_config.php` 열어서 다음 항목을 실제 값으로 교체:

```php
DB_HOST   = 'localhost'
DB_NAME   = '카페24_DB명'
DB_USER   = '카페24_사용자명'
DB_PASS   = '카페24_DB비번'

ALLOWED_ORIGINS = ['https://www.실도메인.com', 'https://실도메인.com']
PUBLIC_FORM_ALLOWED_HOSTS = ['www.실도메인.com', '실도메인.com']

NOTIFY_EMAIL_TO   = '문의받을이메일@gmail.com'
NOTIFY_EMAIL_FROM = 'noreply@실도메인.com'   // 카페24 메일 호스팅으로 발급한 주소 권장
NOTIFY_SITE_NAME  = '해태렌트카'
```

> ⚠ 이 파일은 **절대 GitHub 에 실제 DB 정보로 커밋하지 마세요.** `.htaccess` 가 외부 접근을 차단합니다.

## 5. 파일 업로드

FTP/SFTP 로 다음 폴더 제외하고 **전체 업로드**:

```
docs/        (개발 문서)
.claude/     (AI 도구 설정)
.git/        (버전 관리)
db/          (스키마는 한 번만 import 했으면 업로드 불필요)
node_modules/  (혹시 있다면)
```

## 6. 동작 검증

```
https://실도메인.com/api/health.php
```

응답:
```json
{ "ok": true, "db": true, "tables": { "admins": true, ... }, "time": "..." }
```

`ok: false` 면 응답 본문의 `db` / `tables` 값으로 어디가 빠졌는지 확인.

## 7. HTTPS 강제 활성화

SSL 인증서가 정상 동작하는지 확인 후, `/.htaccess` 에서 다음 라인을 주석 해제:

```apache
# RewriteCond %{HTTPS} off
# RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

→

```apache
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

같은 파일에서 HSTS 도 주석 해제:

```apache
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
```

## 8. 카카오맵 도메인 등록

`about.html` 의 카카오맵 위젯이 정상 동작하려면 [카카오 개발자 콘솔](https://developers.kakao.com/) 에서:
1. 앱 생성 (또는 기존 앱 선택)
2. 플랫폼 → Web 도메인에 실 도메인 등록 (`https://www.실도메인.com`)

## 9. 검색엔진 등록 (필수)

- [구글 서치콘솔](https://search.google.com/search-console) — 도메인 등록 → `sitemap.xml` 제출
- [네이버 서치어드바이저](https://searchadvisor.naver.com/) — 사이트 등록 → `sitemap.xml`, `robots.txt` 제출

소유 확인은 `index.html` 의 `<head>` 에 추가된 메타 태그(`google-site-verification`, `naver-site-verification`) 로 확인 가능.

---

## API 엔드포인트 요약

### 공개 (인증 없음)

| Method | Path | 용도 |
|---|---|---|
| GET | `/api/cars.php` | 차량 목록 |
| GET | `/api/settings.php` | 사이트 설정 전체 |
| GET | `/api/settings.php?key=site` | 단일 설정 |
| POST | `/api/submit-inquiry.php` | 견적 문의 등록 (Origin 검증) |
| POST | `/api/track-view.php` | 차량 조회수 +1 |
| GET | `/api/health.php` | 헬스체크 |

### 관리자 (Authorization: Bearer + X-CSRF-Token)

| Method | Path | 용도 |
|---|---|---|
| POST | `/api/login.php` | 로그인 (5회 실패 시 10분 잠금) |
| POST | `/api/logout.php` | 로그아웃 |
| GET | `/api/me.php` | 현재 세션 정보 |
| POST | `/api/change-password.php` | 비밀번호 변경 |
| POST/PUT/DELETE | `/api/cars.php` | 차량 CRUD |
| PUT | `/api/settings.php?key=X` | 설정 저장 |
| GET/PUT/DELETE | `/api/inquiries.php` | 문의 관리 |
| POST | `/api/upload-image.php` | 이미지 업로드 |

---

## 보안 체크리스트

- [x] PDO + prepared statements (SQL 인젝션 차단)
- [x] BCRYPT 비밀번호 해시
- [x] Bearer 토큰 + CSRF 토큰 이중 검증 (관리자 mutating endpoint)
- [x] 로그인 5회 실패 시 10분 IP 잠금 (`api/data/lock_*.json`)
- [x] 견적 폼 Origin/Referer 검증, IP 분당 5건 제한, 허니팟
- [x] 업로드 파일 MIME 화이트리스트 + 확장자 화이트리스트 + 랜덤 파일명
- [x] `images/uploads/.htaccess` 로 PHP 실행 차단 (이중 안전)
- [x] `api/_config.php`, `api/_lib/*`, `api/data/*` 직접 접근 차단
- [x] 관리자 페이지 `noindex` + CSP + 캐시 차단
- [x] 보안 헤더 (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [ ] (수동) SSL 발급 후 HTTPS 강제 redirect + HSTS 활성화
- [ ] (수동) `_config.php` 의 placeholder 를 실 값으로 교체
- [ ] (수동) 초기 admin 비밀번호 BCRYPT 로 재설정
