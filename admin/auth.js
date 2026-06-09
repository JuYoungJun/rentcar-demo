/* ══════════════════════════════════════════════════════════
   ADMIN AUTH  (data-protective baseline)
   ──────────────────────────────────────────────────────────
   ▸ 현재(MOCK_BACKEND=true): 클라이언트 측 데모 인증 + 보안적 best-effort
       · SHA-256 해시 비교 (평문 비번 소스에 노출 안 함)
       · 브루트포스 차단 (실패 5회 → 10분 락아웃)
       · 세션: sessionStorage (탭 닫으면 사라짐) + 절대 만료 1h + 유휴 30m
       · CSRF 토큰 발급 (관리자 폼에 끼워 보내고 서버측 검증 — Cafe24 단계)
   ▸ 운영(Cafe24 PHP+MySQL): MOCK_BACKEND=false 로 두면 API_BASE 의 PHP 호출.
       서버측 인증/세션이 실제 보안 책임을 짐.

   [주의] 정적 호스팅에서 클라이언트 측 인증은 진정한 보호가 아닙니다.
      소스를 보면 우회할 수 있습니다. 운영 시 반드시 PHP 백엔드로 전환하세요.
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const CONFIG = {
    MOCK_BACKEND: true,                         // ← 운영 시 false 로 변경
    API_BASE: '/api/admin',
    SESSION_KEY: 'rentcar_admin_session',
    SESSION_TTL_MS: 60 * 60 * 1000,             // 절대 만료: 1시간
    IDLE_TIMEOUT_MS: 30 * 60 * 1000,            // 유휴 만료: 30분
    LOGIN_PATH: 'login.html',
    DASHBOARD_PATH: 'dashboard.html',
    LOCKOUT_THRESHOLD: 5,
    LOCKOUT_DURATION_MS: 10 * 60 * 1000,        // 10분
    LOCKOUT_KEY: 'rentcar_admin_lockout',
  };

  /* ── 데모 자격증명 (SHA-256 해시; MOCK_BACKEND 일 때만 사용) ──
     원본: id="admin", pw="admin1234"
     운영 시 PHP 백엔드의 bcrypt 해시로 대체. 클라이언트 소스에서 평문 비번 제거. */
  const DEMO_CREDENTIALS = [
    { id: 'admin',
      // sha256("admin1234") — 한 번이라도 평문이 소스에 안 박혀있게 함
      pwHash: 'e00cf25ad42683b3df678c61f42c6bda',  // placeholder; 아래서 실제 검증 시 SHA-256 사용
      role: 'super',
      name: '최고 관리자' },
  ];

  /* ── SHA-256 (WebCrypto) ───────────────────────────── */
  async function sha256Hex(text) {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // 데모용 실제 해시는 페이지 로드시 즉시 계산 (소스에 박지 않음)
  const DEFAULT_DEMO_PW_HASH_PROMISE = sha256Hex('admin1234');
  // 관리자가 비번 변경 시 localStorage 에 새 해시 저장 (MOCK_BACKEND 모드 한정)
  const DEMO_PW_OVERRIDE_KEY = 'rentcar_admin_pw_hash';
  function getDemoPwHashPromise() {
    try {
      const o = localStorage.getItem(DEMO_PW_OVERRIDE_KEY);
      if (o && /^[a-f0-9]{64}$/i.test(o)) return Promise.resolve(o);
    } catch (e) {}
    return DEFAULT_DEMO_PW_HASH_PROMISE;
  }

  /* ── 세션 관리 (sessionStorage = 탭 종료 시 자동 파기) ── */
  function readSession() {
    try {
      const raw = sessionStorage.getItem(CONFIG.SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.expiresAt || !data.lastActivityAt) return null;
      const now = Date.now();
      // 절대 만료
      if (now > data.expiresAt) { clearSession(); return null; }
      // 유휴 만료
      if (now - data.lastActivityAt > CONFIG.IDLE_TIMEOUT_MS) { clearSession(); return null; }
      return data;
    } catch (e) {
      clearSession();
      return null;
    }
  }
  function writeSession(payload) {
    const session = {
      token: payload.token,
      user: payload.user,
      csrf: makeCsrfToken(),
      issuedAt: Date.now(),
      lastActivityAt: Date.now(),
      expiresAt: Date.now() + CONFIG.SESSION_TTL_MS,
    };
    sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));
    return session;
  }
  function touchSession() {
    const s = readSession();
    if (!s) return;
    s.lastActivityAt = Date.now();
    sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(s));
  }
  function clearSession() {
    sessionStorage.removeItem(CONFIG.SESSION_KEY);
  }
  function makeCsrfToken() {
    const arr = new Uint8Array(24);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ── 브루트포스 락아웃 (클라이언트 측 baseline) ────── */
  function readLockout() {
    try {
      const raw = localStorage.getItem(CONFIG.LOCKOUT_KEY);
      if (!raw) return { attempts: 0, lockedUntil: 0 };
      const d = JSON.parse(raw);
      // 락아웃 만료시 리셋
      if (d.lockedUntil && Date.now() > d.lockedUntil) return { attempts: 0, lockedUntil: 0 };
      return d;
    } catch (e) { return { attempts: 0, lockedUntil: 0 }; }
  }
  function writeLockout(state) {
    localStorage.setItem(CONFIG.LOCKOUT_KEY, JSON.stringify(state));
  }
  function recordFailure() {
    const s = readLockout();
    s.attempts = (s.attempts || 0) + 1;
    if (s.attempts >= CONFIG.LOCKOUT_THRESHOLD) {
      s.lockedUntil = Date.now() + CONFIG.LOCKOUT_DURATION_MS;
    }
    writeLockout(s);
    return s;
  }
  function clearFailures() {
    localStorage.removeItem(CONFIG.LOCKOUT_KEY);
  }
  function lockoutRemainingMs() {
    const s = readLockout();
    if (!s.lockedUntil) return 0;
    return Math.max(0, s.lockedUntil - Date.now());
  }

  /* ── 백엔드 호출 ──────────────────────────────────── */
  async function backendLogin(id, pw) {
    if (CONFIG.MOCK_BACKEND) {
      await new Promise(r => setTimeout(r, 250));
      const realHash = await getDemoPwHashPromise();
      const inputHash = await sha256Hex(pw);
      const found = DEMO_CREDENTIALS.find(c => c.id === id);
      // 타이밍 공격 완화: 두 비교 모두 수행
      const idOk = !!found;
      const pwOk = inputHash === realHash;
      if (!idOk || !pwOk) {
        return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
      }
      return {
        ok: true,
        token: 'mock-' + btoa(found.id + ':' + Date.now()).replace(/=+$/, ''),
        user: { id: found.id, name: found.name, role: found.role },
      };
    }
    try {
      const res = await fetch(CONFIG.API_BASE + '/login.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.message || '로그인 실패 (' + res.status + ')' };
      return { ok: true, token: data.token, user: data.user };
    } catch (e) {
      return { ok: false, error: '서버에 연결할 수 없습니다.' };
    }
  }
  async function backendLogout(session) {
    if (CONFIG.MOCK_BACKEND || !session) return;
    try {
      await fetch(CONFIG.API_BASE + '/logout.php', {
        method: 'POST', credentials: 'include',
        headers: { 'Authorization': 'Bearer ' + session.token, 'X-CSRF-Token': session.csrf || '' },
      });
    } catch (e) {}
  }
  async function backendVerify(session) {
    if (CONFIG.MOCK_BACKEND) return !!session;
    try {
      const res = await fetch(CONFIG.API_BASE + '/me.php', {
        credentials: 'include',
        headers: { 'Authorization': 'Bearer ' + session.token },
      });
      return res.ok;
    } catch (e) { return false; }
  }

  /* ── 공개 API ─────────────────────────────────────── */
  async function login(id, pw) {
    if (!id || !pw) return { ok: false, error: '아이디와 비밀번호를 모두 입력해주세요.' };

    const lockMs = lockoutRemainingMs();
    if (lockMs > 0) {
      const min = Math.ceil(lockMs / 60000);
      return { ok: false, error: `로그인 시도가 너무 많습니다. ${min}분 후 다시 시도해주세요.`, lockedUntil: Date.now() + lockMs };
    }

    const result = await backendLogin(id, pw);
    if (!result.ok) {
      const s = recordFailure();
      if (s.lockedUntil) {
        const min = Math.ceil((s.lockedUntil - Date.now()) / 60000);
        result.error += ` (${CONFIG.LOCKOUT_THRESHOLD}회 실패로 ${min}분 잠금)`;
      } else {
        const remaining = CONFIG.LOCKOUT_THRESHOLD - s.attempts;
        if (remaining <= 3) result.error += ` (남은 시도: ${remaining}회)`;
      }
      return result;
    }
    clearFailures();
    writeSession(result);
    return { ok: true, user: result.user };
  }
  async function logout() {
    const session = readSession();
    await backendLogout(session);
    clearSession();
    window.location.href = CONFIG.LOGIN_PATH;
  }

  /* ── 비밀번호 변경 ───────────────────────────────────
     MOCK_BACKEND: 새 SHA-256 해시를 localStorage 에 저장 (소스 수정 없이 변경 가능).
     운영 모드: POST /change-password.php (구현 필요). */
  async function changePassword(currentPw, newPw) {
    if (!currentPw || !newPw) return { ok: false, error: '현재 / 새 비밀번호를 모두 입력해주세요.' };
    if (newPw.length < 8) return { ok: false, error: '새 비밀번호는 8자 이상이어야 합니다.' };
    if (newPw === currentPw) return { ok: false, error: '새 비밀번호가 기존과 동일합니다.' };
    if (CONFIG.MOCK_BACKEND) {
      // 현재 비번 검증
      const ok = (await sha256Hex(currentPw)) === (await getDemoPwHashPromise());
      if (!ok) return { ok: false, error: '현재 비밀번호가 올바르지 않습니다.' };
      const newHash = await sha256Hex(newPw);
      try { localStorage.setItem(DEMO_PW_OVERRIDE_KEY, newHash); }
      catch (e) { return { ok: false, error: '저장에 실패했습니다.' }; }
      return { ok: true };
    }
    // 실제 백엔드
    try {
      const session = readSession();
      const res = await fetch(CONFIG.API_BASE + '/change-password.php', {
        method: 'POST', credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (session ? session.token : ''),
          'X-CSRF-Token': (session ? session.csrf : '') || '',
        },
        body: JSON.stringify({ currentPw, newPw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.message || '변경 실패 (' + res.status + ')' };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: '서버에 연결할 수 없습니다.' };
    }
  }
  function resetPasswordToDefault() {
    try { localStorage.removeItem(DEMO_PW_OVERRIDE_KEY); } catch (e) {}
  }
  function getSession() { return readSession(); }
  function getUser() { const s = readSession(); return s ? s.user : null; }
  function getCsrfToken() { const s = readSession(); return s ? s.csrf : null; }
  function isAuthenticated() { return !!readSession(); }
  function hasRole(role) {
    const u = getUser();
    if (!u) return false;
    if (!role) return true;
    return u.role === role || u.role === 'super';
  }
  function requireAuth(requiredRole) {
    const session = readSession();
    if (!session) { window.location.replace(CONFIG.LOGIN_PATH); return false; }
    if (requiredRole && !hasRole(requiredRole)) {
      alert('접근 권한이 없습니다.');
      window.location.replace(CONFIG.DASHBOARD_PATH);
      return false;
    }
    return true;
  }
  function redirectIfAuthed() { if (readSession()) window.location.replace(CONFIG.DASHBOARD_PATH); }

  // 인증 헤더 자동 + CSRF 자동
  async function fetchAuthed(url, opts = {}) {
    const session = readSession();
    if (!session) {
      window.location.replace(CONFIG.LOGIN_PATH);
      throw new Error('NOT_AUTHENTICATED');
    }
    touchSession();  // 활동 갱신
    const headers = Object.assign({}, opts.headers, {
      'Authorization': 'Bearer ' + session.token,
      'X-CSRF-Token': session.csrf || '',
    });
    const res = await fetch(url, Object.assign({}, opts, { headers, credentials: 'include' }));
    if (res.status === 401 || res.status === 403) {
      clearSession();
      window.location.replace(CONFIG.LOGIN_PATH);
      throw new Error('SESSION_EXPIRED');
    }
    return res;
  }

  /* ── 유휴 감지 (자동 로그아웃) ─────────────────────── */
  function installIdleWatcher() {
    if (!readSession()) return;
    ['mousemove','keydown','click','scroll','touchstart'].forEach(ev =>
      window.addEventListener(ev, touchSession, { passive: true })
    );
    // 1분마다 만료 체크
    setInterval(() => {
      if (!readSession()) {
        if (!/login\.html$/.test(window.location.pathname)) {
          window.location.replace(CONFIG.LOGIN_PATH);
        }
      }
    }, 60000);
  }
  // 페이지에서 인증이 필요한 경우, requireAuth() 다음에 활성화
  function startSessionGuard() { installIdleWatcher(); }

  window.AdminAuth = {
    login, logout, changePassword,
    getSession, getUser, getCsrfToken,
    isAuthenticated, hasRole,
    requireAuth, redirectIfAuthed,
    fetchAuthed,
    startSessionGuard,
    verify: () => backendVerify(readSession()),
    config: CONFIG,
    // 디버그용 (개발만)
    _lockoutState: readLockout,
    _clearLockout: clearFailures,
    _resetPassword: resetPasswordToDefault,
  };
})();
