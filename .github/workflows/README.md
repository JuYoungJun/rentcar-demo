# GitHub Actions CI/CD — 카페24 자동 배포 가이드

이 디렉토리에는 두 개의 워크플로우가 있습니다.

| 워크플로우 | 트리거 | 역할 |
|---|---|---|
| `lint.yml` | push / PR | PHP syntax 검사, sitemap·webmanifest 유효성, HTML SEO 메타 누락 감지, DB schema 동기화 검증, 비밀값 누출 스캔 |
| `deploy.yml` | main push / 수동 | 카페24 호스팅으로 FTPS(또는 SFTP) 자동 배포 + 헬스체크 |

---

## 1. GitHub Secrets 등록

레포지토리 `Settings → Secrets and variables → Actions → New repository secret` 에서 등록합니다.

### 필수
| 이름 | 예시 값 | 설명 |
|---|---|---|
| `FTP_HOST`     | `ftp.<카페24ID>.cafe24.com` 또는 `<카페24ID>.cafe24.com` | 카페24 FTP 서버 호스트 |
| `FTP_USERNAME` | `<카페24ID>` | FTP 로그인 ID |
| `FTP_PASSWORD` | `••••••••` | FTP 비밀번호 (관리자 콘솔에서 재설정 가능) |

### 선택 (기본값으로 동작 가능)
| 이름 | 기본값 | 설명 |
|---|---|---|
| `FTP_PORT`        | `21`     | FTPS=21 / SFTP=22 |
| `FTP_PROTOCOL`    | `ftps`   | `ftp` / `ftps` / `sftp` 중 선택. 카페24는 FTPS 권장 |
| `FTP_SERVER_DIR`  | `/`      | 원격 루트. 카페24 비즈니스는 보통 `/` |
| `HEALTH_CHECK_URL`| (미설정 시 skip) | 예: `https://www.실도메인.com/api/health.php` |

---

## 2. Environment 보호 규칙 (권장)

`Settings → Environments → New environment` 에서 `production` 환경 생성:
- **Required reviewers**: 본인 또는 대표자 1명 → 배포 전 수동 승인
- **Deployment branches**: `main` 만 허용
- 시크릿을 Repository 가 아니라 environment 시크릿으로 옮기면 PR 빌드에서 누출되지 않음

---

## 3. 첫 배포 절차 (카페24 구매 직후)

1. 카페24 호스팅·도메인·SSL 발급 완료
2. phpMyAdmin 으로 `db/schema.sql` import
3. **FTP 클라이언트(FileZilla 등)** 로 직접 접속 → `api/_config.php` 한 번 업로드 후
   원격에서 DB 정보·ALLOWED_ORIGINS·NOTIFY_EMAIL 을 실값으로 편집·저장
   - ⚠ 이 파일은 워크플로우의 exclude 목록에 들어있어 **GitHub 에서 절대 덮어쓰지 않습니다.**
4. admins 테이블에 BCRYPT 해시로 초기 비번 설정:
   ```bash
   php -r "echo password_hash('실비번', PASSWORD_BCRYPT) . PHP_EOL;"
   ```
   phpMyAdmin → `admins` → `password_hash` 컬럼 수정
5. GitHub Secrets 등록 (위 표 참고)
6. `main` 브랜치에 push 또는 Actions 탭에서 `Deploy to Cafe24` 수동 실행
7. 헬스체크 자동 통과 → `https://실도메인.com/api/health.php` 가 `ok: true`

---

## 4. 배포에서 제외되는 항목 (보안·운영 분리)

| 제외 패턴 | 이유 |
|---|---|
| `.git*`, `.github/`, `.vscode/`, `.idea/` | 메타·로컬 도구 설정 |
| `.claude/` | AI 도구 캐시 |
| `docs/` | 개발자용 문서 |
| `db/` | 스키마 (수동 1회 import) |
| `api/_config.php` | **운영 환경 DB 비밀번호 포함, 절대 덮어쓰지 않음** |
| `api/data/`, `api/logs/` | 런타임 생성 (rate-limit, lock 파일, 로그) |
| `images/uploads/*` | 관리자 업로드 (서버에서만 누적) — `.htaccess` 만 동기화 |
| `*.log`, `*.bak`, `*.orig`, `.DS_Store` | 임시·OS 파일 |

---

## 5. lint.yml — 무엇을 검사하는가

- **PHP syntax**: `api/**/*.php` 전체 `php -l`
- **sitemap.xml**: `xmllint` 로 well-formed XML 확인
- **site.webmanifest**: `jq` 로 JSON 유효성 확인
- **robots.txt**: `Sitemap:` 디렉티브 누락 감지
- **HTML SEO 메타**: 핵심 페이지 9종에 `<title>` · `meta description` · `canonical` · `og:title` 누락 시 실패
- **DB schema**: MariaDB 10.6 컨테이너에 `db/schema.sql` import 후 필수 7개 테이블 존재 확인
- **시크릿 누출**: gitleaks 로 의도되지 않은 비밀값 커밋 감지 (`.gitleaks.toml` 의 placeholder 는 허용)

---

## 6. 운영 중 트러블슈팅

| 증상 | 점검 포인트 |
|---|---|
| `Validate required secrets` 단계 실패 | Secrets 미등록. Settings → Secrets 확인 |
| 530 Login authentication failed | `FTP_USERNAME`/`FTP_PASSWORD` 오류 또는 카페24가 IP 제한 중 |
| Health check 5회 재시도 후 실패 | DB 자격증명 오류, 도메인-IP 전파 지연, 또는 schema.sql import 누락 |
| Lint 의 PHP 검사 실패 | `php -l` 결과를 Actions 로그에서 확인 후 해당 파일 수정 |
| Deploy 가 너무 느림 | 처음 동기화는 전체 업로드라 1~3분. 이후는 변경 파일만 |

---

## 7. 수동 배포 / Dry-run

Actions 탭 → `Deploy to Cafe24` → `Run workflow` → `Dry-run` 옵션 `true` 로 실행하면
실제 업로드 없이 어떤 파일이 변경될지 로그로만 확인할 수 있습니다. 운영 환경 변경 전 검증용으로 권장.
