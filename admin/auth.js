/* ══════════════════════════════
   ADMIN AUTH
   ──────────────────────────────
   현재: 데모 모드 (MOCK_BACKEND=true) — localStorage / 하드코딩 자격증명
   추후: Cafe24 PHP + MySQL 백엔드로 전환 시 MOCK_BACKEND=false 만 바꾸면
         아래 fetch 호출이 실제 엔드포인트로 동작합니다.

   ⚠️ 정적 사이트 클라이언트 측 인증은 진짜 보안이 아닙니다.
      실제 운영 시 반드시 서버에서 검증하고, 토큰은 httpOnly 쿠키 사용 권장.
   ══════════════════════════════ */
(function () {
  'use strict';

  const CONFIG = {
    MOCK_BACKEND: true,                 // ← 백엔드 붙이면 false 로 변경
    API_BASE: '/api/admin',             // 실제 운영 시 PHP 엔드포인트 위치
    SESSION_KEY: 'rentcar_admin_session',
    SESSION_TTL_MS: 60 * 60 * 1000,     // 1시간
    LOGIN_PATH: 'login.html',
    DASHBOARD_PATH: 'dashboard.html',
  };

  // 데모 자격증명 (MOCK_BACKEND=true 일 때만 의미 있음)
  const DEMO_CREDENTIALS = [
    { id: 'admin', pw: 'admin1234', role: 'super', name: '최고 관리자' },
  ];

  /* ── 세션 관리 (브라우저 측) ───────────────────────── */
  function readSession() {
    try {
      const raw = sessionStorage.getItem(CONFIG.SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.expiresAt) return null;
      if (Date.now() > data.expiresAt) {
        sessionStorage.removeItem(CONFIG.SESSION_KEY);
        return null;
      }
      return data;
    } catch (e) {
      sessionStorage.removeItem(CONFIG.SESSION_KEY);
      return null;
    }
  }

  function writeSession(payload) {
    const session = {
      token: payload.token,
      user: payload.user,
      issuedAt: Date.now(),
      expiresAt: Date.now() + CONFIG.SESSION_TTL_MS,
    };
    sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function clearSession() {
    sessionStorage.removeItem(CONFIG.SESSION_KEY);
  }

  /* ── 백엔드 호출 (실제 / 모의) ─────────────────────── */
  async function backendLogin(id, pw) {
    if (CONFIG.MOCK_BACKEND) {
      // 모의 지연으로 실제 네트워크 동작 흉내
      await new Promise(r => setTimeout(r, 250));
      const found = DEMO_CREDENTIALS.find(c => c.id === id && c.pw === pw);
      if (!found) {
        return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
      }
      return {
        ok: true,
        token: 'mock-' + btoa(found.id + ':' + Date.now()).replace(/=+$/, ''),
        user: { id: found.id, name: found.name, role: found.role },
      };
    }

    // 실제 백엔드 (Cafe24 PHP 예시)
    try {
      const res = await fetch(CONFIG.API_BASE + '/login.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.message || '로그인 실패 (' + res.status + ')' };
      }
      return { ok: true, token: data.token, user: data.user };
    } catch (e) {
      return { ok: false, error: '서버에 연결할 수 없습니다.' };
    }
  }

  async function backendLogout(session) {
    if (CONFIG.MOCK_BACKEND || !session) return;
    try {
      await fetch(CONFIG.API_BASE + '/logout.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Authorization': 'Bearer ' + session.token },
      });
    } catch (e) { /* ignore — 로컬 세션은 어차피 지움 */ }
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
    if (!id || !pw) {
      return { ok: false, error: '아이디와 비밀번호를 모두 입력해주세요.' };
    }
    const result = await backendLogin(id, pw);
    if (!result.ok) return result;
    writeSession(result);
    return { ok: true, user: result.user };
  }

  async function logout() {
    const session = readSession();
    await backendLogout(session);
    clearSession();
    window.location.href = CONFIG.LOGIN_PATH;
  }

  function getSession() {
    return readSession();
  }

  function getUser() {
    const s = readSession();
    return s ? s.user : null;
  }

  function isAuthenticated() {
    return !!readSession();
  }

  function hasRole(role) {
    const u = getUser();
    if (!u) return false;
    if (!role) return true;
    return u.role === role || u.role === 'super';
  }

  /**
   * 페이지 진입 시 호출. 인증/권한 만족 못 하면 로그인 페이지로 리다이렉트.
   * @param {string} [requiredRole] 필요한 역할
   * @returns {boolean}
   */
  function requireAuth(requiredRole) {
    const session = readSession();
    if (!session) {
      window.location.replace(CONFIG.LOGIN_PATH);
      return false;
    }
    if (requiredRole && !hasRole(requiredRole)) {
      // 권한 부족: 데모에선 알림 후 대시보드로, 실제론 403 페이지가 적절
      alert('접근 권한이 없습니다.');
      window.location.replace(CONFIG.DASHBOARD_PATH);
      return false;
    }
    return true;
  }

  function redirectIfAuthed() {
    if (readSession()) {
      window.location.replace(CONFIG.DASHBOARD_PATH);
    }
  }

  /**
   * 인증 헤더가 자동으로 붙는 fetch 래퍼.
   * 실제 백엔드 연동 시 모든 관리자 API 호출은 이걸 통해서.
   */
  async function fetchAuthed(url, opts = {}) {
    const session = readSession();
    if (!session) {
      window.location.replace(CONFIG.LOGIN_PATH);
      throw new Error('NOT_AUTHENTICATED');
    }
    const headers = Object.assign({}, opts.headers, {
      'Authorization': 'Bearer ' + session.token,
    });
    const res = await fetch(url, Object.assign({}, opts, {
      headers,
      credentials: 'include',
    }));
    if (res.status === 401) {
      clearSession();
      window.location.replace(CONFIG.LOGIN_PATH);
      throw new Error('SESSION_EXPIRED');
    }
    return res;
  }

  window.AdminAuth = {
    login,
    logout,
    getSession,
    getUser,
    isAuthenticated,
    hasRole,
    requireAuth,
    redirectIfAuthed,
    fetchAuthed,
    verify: () => backendVerify(readSession()),
    config: CONFIG,
  };
})();
