/* ══════════════════════════════
   COMMON JS — 해태렌트카 (optimized)
   ══════════════════════════════ */
(function() {
  'use strict';

  /* ── Page fade-in: 페이지 로드 시 깜빡임 방지 ── */
  /* CSS handles initial opacity:0, JS adds .loaded class */

  /* ── Include loader (병렬 fetch) ── */
  async function loadIncludes() {
    const h = document.getElementById('header-include');
    const f = document.getElementById('footer-include');
    const promises = [];

    if (h) promises.push(fetch('includes/header.html').then(r => r.text()).then(t => { h.innerHTML = t; }));
    if (f) promises.push(fetch('includes/footer.html').then(r => r.text()).then(t => { f.innerHTML = t; }));

    await Promise.all(promises);
    if (h) initHeader();
    setActiveNav();
  }

  /* ── Active nav ── */
  function setActiveNav() {
    const page = document.body.dataset.page;
    document.querySelectorAll('.header-nav a[data-page]').forEach(a => {
      a.classList.toggle('active', !!page && a.dataset.page === page);
    });
  }
  window.setActiveNav = setActiveNav;

  /* ── Toast ── */
  window.showToast = function(msg) {
    const t = document.getElementById('toast');
    if (!t) return;  // toast 컨테이너 없으면 무시 (운영 로그 노출 방지)
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2400);
  };

  /* ── 안전한 localStorage setter — 쿼터 초과 시 사용자 안내 ── */
  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      // QuotaExceededError 또는 SecurityError
      const isQuota = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
      if (isQuota) {
        if (typeof window.showToast === 'function') {
          window.showToast('저장 공간이 가득 찼습니다. 업로드된 이미지를 일부 삭제해주세요.');
        } else {
          alert('브라우저 저장 공간이 가득 찼습니다. 관리자 페이지의 "이미지 업로드" 탭에서 사용하지 않는 이미지를 삭제해주세요.');
        }
      } else {
        console.warn('localStorage 쓰기 실패:', key, e);
      }
      return false;
    }
  }
  window.safeSetItem = safeSetItem;

  /* ── Header init ── */
  function initHeader() {
    const hamburger = document.getElementById('hamburgerBtn');
    const mobileNav = document.getElementById('mobileNav');

    if (hamburger && mobileNav) {
      hamburger.onclick = () => {
        hamburger.classList.toggle('open');
        mobileNav.classList.toggle('open');
        document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
      };
      document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', () => {
          hamburger.classList.remove('open');
          mobileNav.classList.remove('open');
          document.body.style.overflow = '';
        });
      });
    }

    // Quote buttons
    const goQuote = () => { window.location.href = 'quote.html'; };
    const mq = document.getElementById('mobileQuoteBtn');
    if (mq) mq.onclick = goQuote;

  }

  /* ── Scroll fade ── 뷰포트 안에 이미 있는 요소는 즉시 visible (LCP 지연 방지)
     아래쪽 요소만 .pending 으로 가렸다가 IntersectionObserver 로 페이드인 */
  function initFadeUp() {
    const all = document.querySelectorAll('.fade-up');
    const vh = window.innerHeight || 800;
    all.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top > vh * 0.9) el.classList.add('pending');
    });
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-up.pending').forEach(el => obs.observe(el));
  }

  /* ── Car Database (defaults — admin can override via localStorage)
     순서: 경차·소형차(모닝/레이/캐스퍼/아반떼)를 앞쪽에 배치하여
     index.html 첫 페이지 라인과 BEST 라인에 우선 노출되도록 함.
     ── */
  const DEFAULT_CARS = [
    // ── 월렌트 (1개월 단기) ──
    { id:1,  name:'모닝',            tags:['경차','무심사'],            year:2026, price:550000,  badge:'1개월', category:['monthly'],   inquiries:88, views:720, contracts:42, image:'morning.webp' },
    { id:2,  name:'레이',            tags:['경차','무보증'],            year:2026, price:550000,  badge:'1개월', category:['monthly'],   inquiries:82, views:680, contracts:38, image:'ray.webp' },
    { id:3,  name:'캐스퍼',          tags:['경차','무심사','무보증'],   year:2026, price:600000,  badge:'1개월', category:['monthly'],   inquiries:75, views:640, contracts:34, image:'casper.webp' },
    { id:5,  name:'아반떼',          tags:['무보증'],                   year:2026, price:650000,  badge:'1개월', category:['monthly'],   inquiries:68, views:590, contracts:28, image:'avante-2.webp' },
    { id:6,  name:'K5',              tags:['무심사'],                   year:2026, price:700000,  badge:'1개월', category:['monthly'],   inquiries:55, views:480, contracts:24, image:'k5.webp' },
    { id:8,  name:'소나타',          tags:['무심사'],                   year:2026, price:700000,  badge:'1개월', category:['monthly'],   inquiries:52, views:450, contracts:23, image:'sonata.webp' },
    { id:10, name:'더 뉴 셀토스',    tags:['SUV'],                      year:2026, price:750000,  badge:'1개월', category:['monthly'],   inquiries:46, views:400, contracts:19, image:'seltos.webp' },

    // ── 12개월 기간약정 — 가격 낮은순 정렬 ──
    { id:20, name:'모닝',            tags:['경차','12개월약정','무심사'],     year:2025, price:400000,  badge:'12개월', category:['longterm'],  inquiries:90, views:730, contracts:44, image:'morning.webp' },
    { id:21, name:'레이',            tags:['경차','12개월약정','무보증'],     year:2025, price:400000,  badge:'12개월', category:['longterm'],  inquiries:85, views:690, contracts:40, image:'ray.webp' },
    { id:22, name:'캐스퍼',          tags:['경차','12개월약정','무심사'],     year:2025, price:450000,  badge:'12개월', category:['longterm'],  inquiries:78, views:650, contracts:36, image:'casper.webp' },
    { id:4,  name:'아반떼',          tags:['12개월약정','무심사'],            year:2025, price:500000,  badge:'12개월', category:['longterm'],  inquiries:72, views:620, contracts:32, image:'avante.webp' },
    { id:23, name:'K5 DL3',          tags:['12개월약정','무보증'],            year:2025, price:550000,  badge:'12개월', category:['longterm'],  inquiries:58, views:500, contracts:26, image:'k5.webp' },
    { id:7,  name:'소나타 디 엣지',  tags:['12개월약정','무심사'],            year:2024, price:600000,  badge:'12개월', category:['longterm'],  inquiries:50, views:430, contracts:22, image:'sonata-edge.webp' },
    { id:9,  name:'더 뉴 셀토스',    tags:['SUV','12개월약정'],               year:2025, price:600000,  badge:'12개월', category:['longterm'],  inquiries:48, views:410, contracts:20, image:'seltos.webp' },
    { id:25, name:'K8',              tags:['12개월약정','프리미엄'],          year:2024, price:850000,  badge:'12개월', category:['longterm'],  inquiries:36, views:330, contracts:15, image:'grandeur.webp' },
    { id:24, name:'그랜져 GN7',      tags:['12개월약정'],                     year:2025, price:950000,  badge:'12개월', category:['longterm'],  inquiries:40, views:360, contracts:17, image:'grandeur-gn7.webp' },

    // ── 중고차 장기렌트 ──
    { id:11, name:'카니발 4세대',    tags:['미니밴','무보증'],          year:2023, price:950000,  badge:'',       category:['used'],      inquiries:42, views:380, contracts:18, image:'carnival.webp' },
    { id:13, name:'쏘렌토 MQ4',      tags:['SUV','무심사','무보증'],    year:2021, price:750000,  badge:'',       category:['used'],      inquiries:36, views:330, contracts:15, image:'sorento.webp' },
    { id:14, name:'더 뉴 쏘렌토',    tags:['SUV','무심사'],             year:2023, price:900000,  badge:'',       category:['used'],      inquiries:38, views:340, contracts:16, image:'sorento.webp' },
    { id:15, name:'싼타페 MX5',      tags:['SUV','무보증'],             year:2023, price:950000,  badge:'',       category:['used'],      inquiries:35, views:320, contracts:14, image:'santafe.webp' },
    { id:16, name:'더 뉴 그랜져',    tags:['무심사','무보증'],          year:2020, price:700000,  badge:'',       category:['used'],      inquiries:30, views:280, contracts:12, image:'grandeur.webp' },
    { id:17, name:'더 뉴 그랜져',    tags:['무심사'],                   year:2021, price:750000,  badge:'',       category:['used'],      inquiries:32, views:290, contracts:13, image:'grandeur-2.webp' },
    { id:18, name:'그랜져 GN7',      tags:['무심사'],                   year:2023, price:1000000, badge:'',       category:['used'],      inquiries:34, views:300, contracts:14, image:'grandeur-gn7.webp' },
    { id:19, name:'G80 RG3',         tags:['프리미엄','무심사'],        year:2021, price:1200000, badge:'',       category:['used'],      inquiries:45, views:390, contracts:18, image:'g80.webp' },
  ];

  const STORAGE_KEY = 'rentcar_admin_cars';
  function loadCars() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) {}
    return DEFAULT_CARS;
  }
  window.DEFAULT_CARS = DEFAULT_CARS;
  window.carDatabase = loadCars();
  window.saveCarDatabase = function(cars) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cars));
    window.carDatabase = cars;
  };
  window.resetCarDatabase = function() {
    localStorage.removeItem(STORAGE_KEY);
    window.carDatabase = DEFAULT_CARS;
  };

  /* ── Banners (admin-managed) ── */
  const DEFAULT_BANNERS = ['banner_1.webp','banner_2.webp','banner_3.webp','banner_4.webp','banner_5.webp'];
  const BANNER_KEY = 'rentcar_admin_banners';
  window.DEFAULT_BANNERS = DEFAULT_BANNERS;
  window.loadBanners = function() {
    try {
      const saved = localStorage.getItem(BANNER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          // Migration: banner-N.webp / banner_N.png → banner_N.webp (성능 최적화)
          return parsed.map(b => {
            const m1 = String(b).match(/^banner-(\d+)\.webp$/);
            if (m1) return `banner_${m1[1]}.webp`;
            const m2 = String(b).match(/^banner_(\d+)\.png$/);
            if (m2) return `banner_${m2[1]}.webp`;
            return b;
          });
        }
      }
    } catch (e) {}
    return DEFAULT_BANNERS;
  };
  window.saveBanners = function(list) {
    localStorage.setItem(BANNER_KEY, JSON.stringify(list));
  };
  window.resetBanners = function() {
    localStorage.removeItem(BANNER_KEY);
  };

  /* ── Hero Banners (서브페이지: 월렌트/12개월/중고차) — admin-managed ──
     공개 페이지의 <picture><source media="(max-width: 768px)" srcset=...><img src=...>
     자리에 들어갈 desktop / mobile 이미지를 사이트 운영자가 교체 가능. */
  const HERO_BANNERS_KEY = 'rentcar_hero_banners';
  const DEFAULT_HERO_BANNERS = {
    monthly:  { desktop: 'hero_monthly.jpg',  mobile: 'hero_monthly_mobile.webp',  alt: '월렌트' },
    longterm: { desktop: 'hero_longterm.jpg', mobile: 'hero_longterm_mobile.webp', alt: '12개월 기간약정' },
    used:     { desktop: 'hero_used.jpg',     mobile: 'hero_used_mobile.webp',     alt: '중고차 장기렌트' },
  };
  window.DEFAULT_HERO_BANNERS = DEFAULT_HERO_BANNERS;
  // undefined/null/'' 값은 무시하고 truthy 값만 덮어쓰는 안전 머지
  function safeMerge(base, patch) {
    const out = Object.assign({}, base);
    if (patch && typeof patch === 'object') {
      Object.keys(patch).forEach(k => {
        const v = patch[k];
        if (v !== undefined && v !== null && v !== '') out[k] = v;
      });
    }
    return out;
  }
  window.loadHeroBanners = function() {
    try {
      const saved = localStorage.getItem(HERO_BANNERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // 누락된 page 키는 기본값으로 채움; 빈/undefined 값은 기본값 유지
          const out = {};
          Object.keys(DEFAULT_HERO_BANNERS).forEach(k => {
            out[k] = safeMerge(DEFAULT_HERO_BANNERS[k], parsed[k]);
          });
          return out;
        }
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_HERO_BANNERS));
  };
  window.saveHeroBanners = function(obj) {
    const current = window.loadHeroBanners();
    const merged = {};
    // 각 page 별로 안전 머지 — 일부 필드만 업데이트해도 나머지 유지
    Object.keys(DEFAULT_HERO_BANNERS).forEach(k => {
      const patch = obj && obj[k] ? obj[k] : null;
      merged[k] = patch ? safeMerge(current[k] || {}, patch) : (current[k] || {});
    });
    localStorage.setItem(HERO_BANNERS_KEY, JSON.stringify(merged));
    return merged;
  };
  window.resetHeroBanners = function() {
    localStorage.removeItem(HERO_BANNERS_KEY);
  };

  /* 서브페이지(body[data-page="monthly|longterm|used"]) 에서 자동 호출되어
     현재 페이지의 hero <picture>/<img> 의 src/srcset 을 관리자 설정값으로 교체.  */
  window.applyHeroBanner = function() {
    try {
      if (typeof window.resolveImageUrl !== 'function') return;
      const body = document.body;
      if (!body || !body.dataset) return;
      const page = body.dataset.page;
      if (!page || typeof window.loadHeroBanners !== 'function') return;
      const hb = window.loadHeroBanners();
      const entry = hb && hb[page];
      if (!entry) return;
      const hero = document.querySelector('.hero .hero-slide img');
      if (!hero) return;
      if (entry.desktop) {
        const desktopUrl = window.resolveImageUrl(entry.desktop);
        if (desktopUrl) hero.src = desktopUrl;
      }
      // 부모 <picture> 의 <source> 모바일 매핑 교체 (있을 때만)
      const picture = hero.closest('picture');
      if (picture && entry.mobile) {
        const mobileUrl = window.resolveImageUrl(entry.mobile);
        let src = picture.querySelector('source[media*="max-width"]');
        if (!src && mobileUrl) {
          // source 가 없으면 새로 만들어서 picture 맨 앞에 삽입
          src = document.createElement('source');
          src.media = '(max-width: 768px)';
          picture.insertBefore(src, picture.firstChild);
        }
        if (src && mobileUrl) src.srcset = mobileUrl;
      }
      if (entry.alt) hero.alt = entry.alt;
    } catch (e) {
      // 페이지 로드는 막지 않음
      console.warn('applyHeroBanner 실패:', e);
    }
  };

  /* ── Settings (관리자가 변경하는 사이트 공통 정보) ── */
  const DEFAULT_SETTINGS = {
    topBannerText: '월렌트 전문 해태렌트카',
    contactPhone: '062-714-1688',
    contactHours: '평일 오전 9:00 - 오후 19:00\n주말 오전 10:00 - 오후 19:00',
    branchName: '해태렌트카 광주지점',
    branchHours: '평일 09:00 - 19:00 / 주말 10:00 - 19:00',
    footerDesc: '안전과 투명한 운영을 최우선으로\n믿고 맡길 수 있는 렌트카 서비스',
    footerCopyright: '© 2026 해태렌트카. All rights reserved.',
    defaultDetailBanner: 'detail-page.webp',  // 모든 차량 상세 페이지 공용 하단 배너
  };
  const SETTINGS_KEY = 'rentcar_settings';
  window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  window.loadSettings = function() {
    // 1) 운영 모드: hydrateFromBackend 가 채워둔 서버 데이터 우선
    if (window._serverSiteSettings && typeof window._serverSiteSettings === 'object') {
      return Object.assign({}, DEFAULT_SETTINGS, window._serverSiteSettings);
    }
    // 2) localStorage (admin 데모/오프라인 fallback)
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return Object.assign({}, DEFAULT_SETTINGS, parsed);
      }
    } catch (e) {}
    return Object.assign({}, DEFAULT_SETTINGS);
  };
  window.saveSettings = function(obj) {
    const merged = Object.assign({}, window.loadSettings(), obj || {});
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    return merged;
  };
  window.resetSettings = function() {
    localStorage.removeItem(SETTINGS_KEY);
  };

  /* ── About content (회사소개 페이지 본문) ── */
  const DEFAULT_ABOUT = {
    heading: '경차 월렌트 전문 해태렌트카',
    subheading: '합리적인 가격과 편리한 이용을 제공하는\n경차 월렌트 전문 업체입니다.',
    description: '사회초년생, 직장인, 장기 출장 및 차량이 필요한 고객분들을 위해 부담 없는 비용으로 안정적인 월렌트 서비스를 제공하고 있습니다. 철저한 차량 관리와 신속한 배차, 친절한 상담을 바탕으로 고객 만족을 최우선으로 생각하며, 믿고 이용할 수 있는 든든한 이동 파트너가 되겠습니다.\n언제나 합리적인 가격과 최고의 서비스로 고객 여러분과 함께하겠습니다.',
    stat1Label: '누적 고객 수', stat1Value: 15000,
    stat2Label: '보유 차량', stat2Value: 500,
    stat3Label: '고객 만족도 (%)', stat3Value: 98,
    stat4Label: '전국 지점', stat4Value: 8,
  };
  const ABOUT_KEY = 'rentcar_about';
  window.DEFAULT_ABOUT = DEFAULT_ABOUT;
  window.loadAbout = function() {
    if (window._serverAboutContent && typeof window._serverAboutContent === 'object') {
      return Object.assign({}, DEFAULT_ABOUT, window._serverAboutContent);
    }
    try {
      const saved = localStorage.getItem(ABOUT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return Object.assign({}, DEFAULT_ABOUT, parsed);
      }
    } catch (e) {}
    return Object.assign({}, DEFAULT_ABOUT);
  };
  window.saveAbout = function(obj) {
    const merged = Object.assign({}, window.loadAbout(), obj || {});
    localStorage.setItem(ABOUT_KEY, JSON.stringify(merged));
    return merged;
  };
  window.resetAbout = function() {
    localStorage.removeItem(ABOUT_KEY);
  };

  /* ══════════════════════════════
     사업자 정보 (business.html / 법적 표시)
     ══════════════════════════════ */
  const DEFAULT_BUSINESS = {
    companyName:        '주식회사 해태렌트카 광주지점',
    ceoName:            '이창은',
    bizRegNumber:       '476-85-02430',
    corpRegNumber:      '205611-0017730',
    openedAt:           '2022-12-13',
    onlineSalesNumber:  '',  // 통신판매업 신고번호 (별도 신고 시 입력)
    industry:           '서비스업 / 렌트카',
    address:            '광주광역시 광산구 북문대로433번길 45 (신창동)',
    headOfficeAddress:  '전라남도 영광군 법성면 굴비로1길 146, 101호',
    contactEmail:       'contact@haetae-rentcar.com',
    privacyOfficerName: '이창은',
    privacyEmail:       'privacy@haetae-rentcar.com',
    privacyPhone:       '010-6611-6633',
    kakaoChatUrl:       'https://open.kakao.com/o/sPZhlPzi',
  };
  const BUSINESS_KEY = 'rentcar_business';
  window.DEFAULT_BUSINESS = DEFAULT_BUSINESS;
  window.loadBusiness = function() {
    if (window._serverBusinessContent && typeof window._serverBusinessContent === 'object') {
      return Object.assign({}, DEFAULT_BUSINESS, window._serverBusinessContent);
    }
    try {
      const s = localStorage.getItem(BUSINESS_KEY);
      if (s) {
        const p = JSON.parse(s);
        if (p && typeof p === 'object') return Object.assign({}, DEFAULT_BUSINESS, p);
      }
    } catch (e) {}
    return Object.assign({}, DEFAULT_BUSINESS);
  };
  window.saveBusiness = function(obj) {
    const merged = Object.assign({}, window.loadBusiness(), obj || {});
    localStorage.setItem(BUSINESS_KEY, JSON.stringify(merged));
    return merged;
  };
  window.resetBusiness = function() {
    localStorage.removeItem(BUSINESS_KEY);
  };

  /* ══════════════════════════════
     FAQ (quote.html)
     ══════════════════════════════ */
  const DEFAULT_FAQ = [
    { q: '견적 신청 후 답변까지 얼마나 걸리나요?',
      a: '영업시간(평일 09:00~19:00) 내 신청 시 평균 1시간 이내에 전담 상담사가 연락드립니다. 영업시간 외 접수 건은 다음 영업일에 순차적으로 안내해드립니다.' },
    { q: '신용 등급이 낮아도 렌트가 가능한가요?',
      a: '기간약정월렌트(6개월~24개월) 상품을 통해 신용 심사 부담을 최소화한 조건으로 이용하실 수 있습니다. 무심사·무보증 차량도 다수 보유하고 있으니 부담 없이 문의해주세요.' },
    { q: '견적 신청만 해도 비용이 발생하나요?',
      a: '견적 상담과 차량 추천 단계까지는 어떠한 비용도 발생하지 않습니다. 계약 전까지 자유롭게 비교·검토하실 수 있습니다.' },
    { q: '차량은 어디서 인수할 수 있나요?',
      a: '광주 광산구 신창동 영업장에서 직접 인수하실 수 있으며, 지역에 따라 협의 후 탁송 서비스도 가능합니다. 자세한 내용은 상담 시 안내해드립니다.' },
    { q: '계약 도중 차량을 변경할 수 있나요?',
      a: '계약 조건과 잔여 기간에 따라 차량 교체가 가능합니다. 전담 상담사를 통해 가장 합리적인 방식으로 안내해드립니다.' },
  ];
  const FAQ_KEY = 'rentcar_faq';
  window.DEFAULT_FAQ = DEFAULT_FAQ;
  window.loadFaq = function() {
    try {
      const s = localStorage.getItem(FAQ_KEY);
      if (s) {
        const p = JSON.parse(s);
        if (Array.isArray(p)) return p.filter(x => x && x.q && x.a);
      }
    } catch (e) {}
    return DEFAULT_FAQ.slice();
  };
  window.saveFaq = function(list) {
    localStorage.setItem(FAQ_KEY, JSON.stringify(list || []));
  };
  window.resetFaq = function() {
    localStorage.removeItem(FAQ_KEY);
  };

  /* ══════════════════════════════
     이용 안내 (info.html) — 섹션 단위로 편집 가능
     ══════════════════════════════ */
  const DEFAULT_INFO = {
    intro: '해태렌트카의 렌트 절차와 필요 서류를 안내해 드립니다. 추가로 궁금하신 부분은 견적 문의 또는 전화 상담으로 알려주세요.',
    sections: [
      { title: '1. 상담 및 견적', body: '홈페이지 견적 문의 양식 또는 전화로 상담을 요청하시면, 전담 상담사가 차종·기간·예산을 함께 검토하여 맞춤 견적을 안내해 드립니다. 영업시간은 평일 09:00 ~ 19:00 입니다.' },
      { title: '2. 차량 선택 및 가계약', body: '추천드린 차량을 비교·선택하신 후 가계약 단계로 진행됩니다. 운전 경력·면허 정보 등을 확인하고 인수일자를 협의합니다.' },
      { title: '3. 필요 서류', body: '신분증 사본, 운전면허증 사본, (개인) 재직증명서·소득금액증명원 / (법인) 사업자등록증·법인인감증명서 등이 필요할 수 있습니다. 차량·계약 조건에 따라 일부 서류가 면제될 수 있으니 상담 시 확인해 주세요.' },
      { title: '4. 본 계약 및 결제', body: '서류 검수 완료 후 본 계약서를 작성합니다. 보증금·월렌트료의 결제 수단은 카드·계좌이체를 지원합니다.' },
      { title: '5. 차량 인수', body: '약속된 일자에 차량을 직접 인수하거나, 일부 지역은 탁송 서비스를 이용하실 수 있습니다. 차량 상태를 함께 점검한 후 인수증을 교부해 드립니다.' },
      { title: '6. 계약 기간 중', body: '정기점검·소모품 관리는 회사 지정 협력 정비소를 통해 무상 또는 할인 진행됩니다. 사고·고장 시 24시간 긴급 출동 서비스를 운영합니다.' },
      { title: '7. 차량 반납', body: '계약 만료 시 인수 지점에서 차량을 반납하시면 됩니다. 추가 비용·페널티는 사전에 안내된 기준에 따라 정산됩니다. 재계약·교체 상담도 도와드립니다.' },
    ],
  };
  const INFO_KEY = 'rentcar_info';
  window.DEFAULT_INFO = DEFAULT_INFO;
  window.loadInfo = function() {
    try {
      const s = localStorage.getItem(INFO_KEY);
      if (s) {
        const p = JSON.parse(s);
        if (p && Array.isArray(p.sections)) return Object.assign({}, DEFAULT_INFO, p);
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_INFO));
  };
  window.saveInfo = function(obj) {
    const merged = Object.assign({}, window.loadInfo(), obj || {});
    localStorage.setItem(INFO_KEY, JSON.stringify(merged));
    return merged;
  };
  window.resetInfo = function() {
    localStorage.removeItem(INFO_KEY);
  };

  /* ══════════════════════════════
     폼 옵션 (지역/기간/운전경력/카테고리) — quote/index 폼 드롭다운
     ══════════════════════════════ */
  const DEFAULT_FORM_OPTIONS = {
    categories: ['월렌트','12개월 기간약정','중고차 장기렌트','법인 렌트'],
    regions:    ['서울','경기','인천','부산','대구','광주','대전','제주'],
    periods:    ['1개월','3개월','6개월','12개월','24개월','36개월','48개월'],
    experiences:['1년 미만','1~3년','3~5년','5년 이상'],
  };
  const FORM_OPT_KEY = 'rentcar_form_options';
  window.DEFAULT_FORM_OPTIONS = DEFAULT_FORM_OPTIONS;
  window.loadFormOptions = function() {
    try {
      const s = localStorage.getItem(FORM_OPT_KEY);
      if (s) {
        const p = JSON.parse(s);
        if (p && typeof p === 'object') return Object.assign({}, DEFAULT_FORM_OPTIONS, p);
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_FORM_OPTIONS));
  };
  window.saveFormOptions = function(obj) {
    const merged = Object.assign({}, window.loadFormOptions(), obj || {});
    localStorage.setItem(FORM_OPT_KEY, JSON.stringify(merged));
    return merged;
  };
  window.resetFormOptions = function() {
    localStorage.removeItem(FORM_OPT_KEY);
  };

  /* ══════════════════════════════
     약관 / 개인정보처리방침 — 섹션 단위 편집
     ══════════════════════════════ */
  function makeLegalLoader(key, defaultDoc) {
    return {
      load() {
        try {
          const s = localStorage.getItem(key);
          if (s) {
            const p = JSON.parse(s);
            if (p && Array.isArray(p.sections)) return Object.assign({}, defaultDoc, p);
          }
        } catch (e) {}
        return JSON.parse(JSON.stringify(defaultDoc));
      },
      save(obj) {
        const merged = Object.assign({}, this.load(), obj || {});
        localStorage.setItem(key, JSON.stringify(merged));
        return merged;
      },
      reset() { localStorage.removeItem(key); },
    };
  }

  const DEFAULT_TERMS = {
    title: '이용약관',
    effective: '시행일자 2026년 5월 8일',
    intro: '본 약관은 해태렌트카(이하 "회사")가 운영하는 웹사이트를 통해 제공하는 차량 임대차 정보 안내·견적 상담 서비스의 이용 조건과 절차에 관한 사항을 규정함을 목적으로 합니다.',
    sections: [
      { title: '제1조 (목적)', body: '본 약관은 회사가 제공하는 서비스의 이용에 관하여 회사와 이용자 사이의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.' },
      { title: '제2조 (서비스의 내용)', body: '회사는 월렌트, 기간약정월렌트(6개월~24개월), 중고차 장기렌트, 법인 렌트 등 차량 정보 제공·견적 상담·차량 임대차 계약 알선 서비스를 제공합니다.' },
      { title: '제3조 (서비스 이용 신청)', body: '이용자는 웹사이트 견적 문의 양식에 필수 항목을 기입하고 개인정보 수집·이용에 동의함으로써 서비스 이용을 신청할 수 있습니다.' },
      { title: '제4조 (이용자의 의무)', body: '이용자는 허위 정보 등록, 타인의 정보 도용, 회사의 업무 방해 행위 등을 하여서는 안 됩니다.' },
      { title: '제5조 (책임 제한)', body: '회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 책임이 면제됩니다.' },
      { title: '부칙', body: '본 약관은 2026년 5월 8일부터 시행합니다.' },
    ],
    note: '[안내] 실제 운영 시에는 사업 형태와 개별 서비스 내용에 맞게 법무 검토 후 사용하시기 바랍니다.',
  };
  const DEFAULT_PRIVACY = {
    title: '개인정보처리방침',
    effective: '시행일자 2026년 5월 8일',
    intro: '해태렌트카(이하 "회사")는 「개인정보 보호법」 등 관련 법령을 준수하여 정보주체의 개인정보를 안전하게 처리하기 위해 본 개인정보처리방침을 수립·공개합니다.',
    sections: [
      { title: '1. 수집하는 개인정보의 항목', body: '회사는 견적 문의·계약·상담 시 다음 정보를 수집합니다: 이름, 연락처, 희망 차량명, 카테고리, 희망 지역, 희망 기간, 운전 경력. 서비스 이용 과정에서 IP·쿠키·접속 기록이 자동 수집될 수 있습니다.' },
      { title: '2. 개인정보의 처리 목적', body: '수집된 정보는 견적 회신·상담, 차량 임대차 계약 체결·인수 안내, 본인 확인 및 부정 이용 방지, 통계·분석 목적으로만 사용됩니다.' },
      { title: '3. 개인정보의 보유 및 이용 기간', body: '견적 문의 정보: 회신 완료 후 1년 / 계약 관련 기록: 5년 / 표시·광고 기록: 6개월 / 방문 기록: 3개월 (관련 법령 준수)' },
      { title: '4. 개인정보의 제3자 제공', body: '회사는 정보주체의 사전 동의가 있거나 법령에 의해 요구되는 경우를 제외하고는 개인정보를 외부에 제공하지 않습니다.' },
      { title: '5. 정보주체의 권리', body: '정보주체는 언제든지 개인정보 열람·정정·삭제·처리 정지·동의 철회를 요청할 수 있으며 회사는 지체 없이 조치합니다.' },
      { title: '6. 안전성 확보 조치', body: '회사는 개인정보 취급 직원 최소화·정기 교육, 접근권한 관리·접속 기록 보관, 자료 보관소 출입 통제 등 관리·기술·물리적 조치를 시행합니다.' },
    ],
    note: '[안내] 실제 운영 시 사업자등록번호·대표자명·연락처·이메일 등은 실제 정보로 교체해야 합니다.',
  };
  const Terms   = makeLegalLoader('rentcar_terms',   DEFAULT_TERMS);
  const Privacy = makeLegalLoader('rentcar_privacy', DEFAULT_PRIVACY);
  window.DEFAULT_TERMS   = DEFAULT_TERMS;
  window.DEFAULT_PRIVACY = DEFAULT_PRIVACY;
  window.loadTerms    = () => Terms.load();
  window.saveTerms    = (o) => Terms.save(o);
  window.resetTerms   = () => Terms.reset();
  window.loadPrivacy  = () => Privacy.load();
  window.savePrivacy  = (o) => Privacy.save(o);
  window.resetPrivacy = () => Privacy.reset();

  /* ══════════════════════════════
     배너 v2 — URL/모바일 변형 지원
     기존 loadBanners(): 문자열 배열 반환 (호환 유지)
     loadBannersV2(): { image, mobileImage, url, alt } 객체 배열
     ══════════════════════════════ */
  const BANNER_META_KEY = 'rentcar_banner_meta';
  window.loadBannerMeta = function() {
    try {
      const s = localStorage.getItem(BANNER_META_KEY);
      if (s) {
        const p = JSON.parse(s);
        if (p && typeof p === 'object') return p;
      }
    } catch (e) {}
    return {};
  };
  window.saveBannerMeta = function(map) {
    localStorage.setItem(BANNER_META_KEY, JSON.stringify(map || {}));
  };
  window.loadBannersV2 = function() {
    const list = window.loadBanners();
    const meta = window.loadBannerMeta();
    return list.map(img => {
      const m = meta[img] || {};
      let mobileImage = m.mobileImage || '';
      // 자동 매핑: banner_N.{png,webp,jpg} → banner_mobile_N.webp (관리자 별도 지정 없을 때)
      // N 은 임의의 숫자 (admin 이 6번 이상 추가하거나 신규 슬라이드 생성 시에도 동작)
      if (!mobileImage) {
        const mm = String(img).match(/^banner_(\d+)\.(png|webp|jpg)$/);
        if (mm) mobileImage = `banner_mobile_${mm[1]}.webp`;
      }
      return {
        image: img,
        mobileImage,
        url: m.url || '',
        alt: m.alt || '',
      };
    });
  };

  /* ── 업로드된 이미지 (base64 데이터 URL 사전, 키=표시이름) ── */
  const UPLOAD_KEY = 'rentcar_uploaded_images';
  window.loadUploadedImages = function() {
    try {
      const saved = localStorage.getItem(UPLOAD_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {};
  };
  window.saveUploadedImages = function(map) {
    return safeSetItem(UPLOAD_KEY, JSON.stringify(map || {}));
  };
  window.addUploadedImage = function(name, dataUrl) {
    const map = window.loadUploadedImages();
    map[name] = dataUrl;
    return window.saveUploadedImages(map);  // false 반환 시 호출자가 실패 처리 가능
  };
  window.removeUploadedImage = function(name) {
    const map = window.loadUploadedImages();
    delete map[name];
    window.saveUploadedImages(map);
  };

  /* ── 문의 (폼 제출 캡처) ── */
  const INQUIRY_KEY = 'rentcar_inquiries';
  window.loadInquiries = function() {
    try {
      const saved = localStorage.getItem(INQUIRY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  };
  window.saveInquiries = function(list) {
    return safeSetItem(INQUIRY_KEY, JSON.stringify(list || []));
  };
  window.addInquiry = function(data) {
    const list = window.loadInquiries();
    const id = list.reduce((m, i) => Math.max(m, i.id || 0), 0) + 1;
    const item = Object.assign({
      id,
      createdAt: new Date().toISOString(),
      isRead: false,
    }, data || {});
    list.unshift(item);
    const ok = window.saveInquiries(list);
    if (ok === false) console.warn('문의 저장 실패 — 서버 백엔드 활성화 권장');
    // 활동 로그에도 기록 — carId가 있으면 직접, 없으면 carName으로 매칭
    const cid = item.carId || (item.carName ? window.findCarIdByName(item.carName) : null);
    if (cid) window.trackCarInquiry(cid);

    // 서버측 백엔드(PHP)로도 POST 시도 — 실패해도 무시 (정적 호스팅 fallback).
    // 운영(카페24): api/submit-inquiry.php 가 메일 발송 + 서버 로그 누적
    // 정적(GitHub Pages 등): 404로 무시되고 localStorage 만 사용
    try {
      const payload = JSON.stringify(Object.assign({ hp: '' }, item));
      fetch('api/submit-inquiry.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    } catch (e) {}

    return item;
  };

  /* ══════════════════════════════
     ACTIVITY LOG (조회·문의·계약 실시간 추적)
     ──────────────────────────────
     localStorage 기반. 30일 보관 후 자동 prune.
     "금주 TOP 5" 의 점수 소스.
     ══════════════════════════════ */
  const ACTIVITY_KEY = 'rentcar_activity';
  const ACTIVITY_SEED_KEY = 'rentcar_activity_seeded';
  const RETENTION_MS = 30 * 86400000;  // 30일
  const WEEK_MS = 7 * 86400000;

  window.loadActivity = function() {
    try {
      const s = localStorage.getItem(ACTIVITY_KEY);
      if (s) {
        const p = JSON.parse(s);
        if (p && typeof p === 'object') {
          return {
            views:     Array.isArray(p.views)     ? p.views     : [],
            inquiries: Array.isArray(p.inquiries) ? p.inquiries : [],
            contracts: Array.isArray(p.contracts) ? p.contracts : [],
          };
        }
      }
    } catch (e) {}
    return { views: [], inquiries: [], contracts: [] };
  };

  window.saveActivity = function(act) {
    // 보관 기한 지난 항목 자동 정리
    const cutoff = Date.now() - RETENTION_MS;
    const keep = e => new Date(e.ts).getTime() >= cutoff;
    const clean = {
      views:     (act.views     || []).filter(keep),
      inquiries: (act.inquiries || []).filter(keep),
      contracts: (act.contracts || []).filter(keep),
    };
    try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(clean)); } catch (e) {}
    return clean;
  };

  window.resetActivity = function() {
    localStorage.removeItem(ACTIVITY_KEY);
    localStorage.removeItem(ACTIVITY_SEED_KEY);
  };

  window.trackCarView = function(carId) {
    const id = parseInt(carId, 10);
    if (!id) return;
    const act = window.loadActivity();
    act.views.push({ carId: id, ts: new Date().toISOString() });
    window.saveActivity(act);
  };

  window.trackCarInquiry = function(carId) {
    const id = parseInt(carId, 10);
    if (!id) return;
    const act = window.loadActivity();
    act.inquiries.push({ carId: id, ts: new Date().toISOString() });
    window.saveActivity(act);
  };

  window.trackCarContract = function(carId) {
    const id = parseInt(carId, 10);
    if (!id) return;
    const act = window.loadActivity();
    act.contracts.push({ carId: id, ts: new Date().toISOString() });
    window.saveActivity(act);
  };

  // 입력된 차량명으로 carDatabase 매칭 (대소문자·공백 무시, 부분 일치)
  window.findCarIdByName = function(name) {
    if (!name || !Array.isArray(window.carDatabase)) return null;
    const norm = s => String(s).toLowerCase().replace(/\s+/g, '');
    const q = norm(name);
    if (!q) return null;
    // 1) 정확 일치 우선
    let hit = window.carDatabase.find(c => norm(c.name) === q);
    if (hit) return hit.id;
    // 2) 입력이 차량명을 포함하거나, 차량명이 입력을 포함
    hit = window.carDatabase.find(c => {
      const cn = norm(c.name);
      return cn && (cn.includes(q) || q.includes(cn));
    });
    return hit ? hit.id : null;
  };

  // 특정 차량의 최근 N일(기본 7일) 활동 집계
  window.getCarStats = function(carId, days) {
    const id = parseInt(carId, 10);
    const ms = (days || 7) * 86400000;
    const cutoff = Date.now() - ms;
    const act = window.loadActivity();
    const cnt = (arr) => arr.filter(e => e.carId === id && new Date(e.ts).getTime() >= cutoff).length;
    return {
      views:     cnt(act.views),
      inquiries: cnt(act.inquiries),
      contracts: cnt(act.contracts),
    };
  };

  // 데모용: activity 로그가 비어있으면, DEFAULT_CARS 의 lifetime 통계를 기반으로
  // 최근 7일에 분산된 가짜 활동을 한 번 생성. 실사용자 활동이 쌓이면 자연스럽게 갱신됨.
  window.seedActivityIfEmpty = function() {
    if (localStorage.getItem(ACTIVITY_SEED_KEY)) return;
    const act = window.loadActivity();
    const hasReal = act.views.length || act.inquiries.length || act.contracts.length;
    if (!hasReal && Array.isArray(window.carDatabase)) {
      const now = Date.now();
      // lifetime 통계의 약 12% 정도를 "이번 주" 활동으로 추정
      const WEEKLY_SHARE = 0.12;
      const randTs = () => new Date(now - Math.random() * WEEK_MS).toISOString();
      window.carDatabase.forEach(car => {
        const v = Math.round((car.views     || 0) * WEEKLY_SHARE);
        const q = Math.round((car.inquiries || 0) * WEEKLY_SHARE);
        const k = Math.round((car.contracts || 0) * WEEKLY_SHARE);
        for (let i = 0; i < v; i++) act.views.push({     carId: car.id, ts: randTs() });
        for (let i = 0; i < q; i++) act.inquiries.push({ carId: car.id, ts: randTs() });
        for (let i = 0; i < k; i++) act.contracts.push({ carId: car.id, ts: randTs() });
      });
      window.saveActivity(act);
    }
    try { localStorage.setItem(ACTIVITY_SEED_KEY, '1'); } catch (e) {}
  };

  /* ══════════════════════════════════════════════════════════
     이미지 최적화 헬퍼 (브라우저 측 리사이즈 + WebP 변환)
     ──────────────────────────────────────────────────────────
     File 객체 또는 Blob 을 받아서 자동으로:
     ▸ 최대 가로/세로 한도(maxDim)까지 비율 유지하며 리사이즈
     ▸ WebP 로 quality 0.82 인코딩 (브라우저 미지원 시 JPEG 폴백)
     ▸ EXIF 회전 자동 적용 (createImageBitmap의 imageOrientation 옵션)
     ▸ 원본 대비 절감률 반환
     사용:
       const out = await optimizeImageFile(file);
       // → { dataUrl, blob, name, mime, originalBytes, optimizedBytes, width, height }
     ══════════════════════════════════════════════════════════ */
  window.optimizeImageFile = async function(file, options) {
    const opts = Object.assign({
      maxDim: 1600,          // 가로/세로 한도
      quality: 0.82,          // 인코딩 품질
      preferWebp: true,
      maxOutputBytes: 600 * 1024,  // 가능한 한 600KB 이하로 떨어지면 좋음
    }, options || {});

    if (!(file instanceof Blob)) throw new Error('Blob/File 만 처리할 수 있습니다.');
    const originalBytes = file.size;
    const originalName = file.name || ('image-' + Date.now());

    // 이미지 디코딩 (EXIF 회전 자동 적용)
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (e) {
      // 폴백: Image() 사용
      const url = URL.createObjectURL(file);
      bitmap = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = err => { URL.revokeObjectURL(url); reject(err); };
        img.src = url;
      });
    }
    const srcW = bitmap.width || bitmap.naturalWidth;
    const srcH = bitmap.height || bitmap.naturalHeight;
    if (!srcW || !srcH) throw new Error('이미지를 읽을 수 없습니다.');

    // 비율 유지 리사이즈
    const scale = Math.min(1, opts.maxDim / Math.max(srcW, srcH));
    const outW = Math.round(srcW * scale);
    const outH = Math.round(srcH * scale);
    const canvas = document.createElement('canvas');
    canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, outW, outH);
    if (bitmap.close) try { bitmap.close(); } catch (e) {}

    // 출력 인코딩 (WebP → 큰 효과)
    const canvasToBlob = (mime, quality) =>
      new Promise(resolve => canvas.toBlob(b => resolve(b), mime, quality));

    let mime = opts.preferWebp ? 'image/webp' : 'image/jpeg';
    let q = opts.quality;
    let blob = await canvasToBlob(mime, q);
    // WebP 미지원 브라우저 폴백 (canvas.toBlob 이 null 반환)
    if (!blob && mime === 'image/webp') {
      mime = 'image/jpeg';
      blob = await canvasToBlob(mime, q);
    }
    // 여전히 너무 크면 quality 단계적으로 낮춰서 1회 더 시도
    if (blob && opts.maxOutputBytes && blob.size > opts.maxOutputBytes && q > 0.55) {
      const blob2 = await canvasToBlob(mime, 0.62);
      if (blob2 && blob2.size < blob.size) blob = blob2;
    }
    if (!blob) throw new Error('이미지 인코딩 실패');

    const dataUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });

    // 출력 파일명: 원본 stem + .webp/.jpg
    const ext = (mime === 'image/webp') ? '.webp' : '.jpg';
    const stem = originalName.replace(/\.[^.]+$/, '');
    const safe = (stem || 'image').replace(/[^\w가-힣.\-]/g, '_').slice(0, 60) || 'image';
    const outName = safe + ext;

    return {
      dataUrl,
      blob,
      name: outName,
      mime,
      originalBytes,
      optimizedBytes: blob.size,
      width: outW,
      height: outH,
      savedPct: originalBytes ? Math.round((1 - blob.size / originalBytes) * 100) : 0,
    };
  };

  // 클립보드 paste 이벤트에서 이미지 추출
  window.extractImagesFromClipboard = function(clipboardEvent) {
    const items = (clipboardEvent.clipboardData && clipboardEvent.clipboardData.items) || [];
    const files = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const f = it.getAsFile();
        if (f) {
          // 클립보드에서 가져온 파일은 이름이 없을 수 있음 — 자동 부여
          if (!f.name || /^image\.\w+$/i.test(f.name)) {
            const ext = (it.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
            const renamed = new File([f], `clip-${Date.now()}.${ext}`, { type: it.type });
            files.push(renamed);
          } else {
            files.push(f);
          }
        }
      }
    }
    return files;
  };

  /* ── 이미지 URL 리졸버 (uploaded:, data:, http://, 일반 파일명 처리) ── */
  window.resolveImageUrl = function(spec, baseDir) {
    if (!spec) return '';
    const s = String(spec);
    if (s.indexOf('uploaded:') === 0) {
      const name = s.slice(9);
      const uploads = window.loadUploadedImages();
      return uploads[name] || '';
    }
    if (s.indexOf('data:') === 0 || s.indexOf('http') === 0) return s;
    return (baseDir || 'images/') + encodeURI(s).replace(/'/g, '%27');
  };

  /* ── Image URL helper (차량/일반) ── */
  window.carImageUrl = function(file) {
    return window.resolveImageUrl(file, 'images/');
  };

  /* ── 사이트 설정을 페이지 DOM에 주입 ── */
  function applySiteSettings() {
    const s = window.loadSettings();
    const set = (id, val, useHtml) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (useHtml) el.innerHTML = String(val).replace(/\n/g, '<br>');
      else el.textContent = String(val);
    };
    set('topBannerText', s.topBannerText, false);
    set('footerBrandDesc', s.footerDesc, true);
    set('footerCopyright', s.footerCopyright, false);
    set('contactPhone', s.contactPhone, false);
    set('contactHours', s.contactHours, true);
    set('quotePhone', s.contactPhone, false);
    set('quoteHours', s.contactHours, true);
    set('mapBranchName', s.branchName, false);
    set('mapBranchHours', s.branchHours, false);

    // 전역 플로팅 CTA — contactPhone 으로 tel: 링크 동기화
    const phone = String(s.contactPhone || '');
    const telHref = phone ? ('tel:' + phone.replace(/[^0-9+]/g, '')) : 'tel:';
    document.querySelectorAll('a[href^="tel:"]').forEach(a => a.setAttribute('href', telHref));
    // SEO 메타 (LocalBusiness telephone) 동기화
    const ldbTel = document.getElementById('ldbTelephone');
    if (ldbTel && phone) ldbTel.setAttribute('content', phone);
  }
  window.applySiteSettings = applySiteSettings;

  /* ── 회사소개 페이지 콘텐츠 주입 ── */
  function applyAboutContent() {
    if (document.body.dataset.page !== 'about') return;
    const a = window.loadAbout();
    const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const setHtml = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = String(v).replace(/\n/g, '<br>'); };
    setText('aboutHeading', a.heading);
    setHtml('aboutSubheading', a.subheading);
    setText('aboutDescription', a.description);
    for (let i = 1; i <= 4; i++) {
      const v = document.getElementById('stat' + i + 'Value');
      const l = document.getElementById('stat' + i + 'Label');
      if (v) v.dataset.count = String(a['stat' + i + 'Value']);
      if (l) l.textContent = a['stat' + i + 'Label'];
    }
  }
  window.applyAboutContent = applyAboutContent;

  /* ── Render car cards ──
     pageCategory === 'used' (중고차 장기렌트): 가격 대신 "별도문의" 노출 */
  window.renderCarCards = function(containerId, cars, badgeOverride, pageCategory) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const hidePrice = pageCategory === 'used';
    const fragment = document.createDocumentFragment();
    const temp = document.createElement('div');
    temp.innerHTML = cars.map((car, idx) => {
      const priceLabel = hidePrice ? '별도문의' : `${car.price.toLocaleString()} 원`;
      const dataPrice  = hidePrice ? '별도문의' : car.price.toLocaleString();
      // 첫 3개 카드는 즉시 로드(LCP 후보), 나머지는 lazy.
      // background-image 는 native lazy 미지원이므로 data-bg 속성 + IntersectionObserver 사용.
      const bg = car.image ? carImageUrl(car.image) : '';
      const eager = idx < 3;
      const bgAttr = eager && bg ? ` style="background-image:url('${bg}')"` : '';
      const lazyAttr = !eager && bg ? ` data-bg="${bg}"` : '';
      return `
      <div class="card" data-car="${car.name}" data-id="${car.id}" data-price="${dataPrice}">
        <div class="card-thumb">
          <div class="card-thumb-inner"${bgAttr}${lazyAttr}></div>
          ${(badgeOverride || car.badge) ? `<div class="card-badge">${badgeOverride || car.badge}</div>` : ''}
        </div>
        <div class="card-name">${car.name}</div>
        <div class="card-tags">${car.tags.map(t => '#'+t).join(' ')}</div>
        <div class="card-price${hidePrice ? ' card-price--inquiry' : ''}">${priceLabel}</div>
      </div>
    `;
    }).join('');
    while (temp.firstChild) fragment.appendChild(temp.firstChild);
    container.innerHTML = '';
    container.appendChild(fragment);
    container.querySelectorAll('.card').forEach(c => {
      c.onclick = () => {
        const id = c.dataset.id;
        const cat = pageCategory || 'monthly';
        window.location.href = `detail.html?id=${id}&from=${cat}`;
      };
    });
    // data-bg 가진 카드 썸네일을 IntersectionObserver 로 지연 로드 (모바일 스크롤 절감)
    const lazyEls = container.querySelectorAll('.card-thumb-inner[data-bg]');
    if (lazyEls.length && 'IntersectionObserver' in window) {
      const lazyObs = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          const el = en.target;
          const url = el.dataset.bg;
          if (url) {
            el.style.backgroundImage = `url('${url}')`;
            el.removeAttribute('data-bg');
          }
          lazyObs.unobserve(el);
        });
      }, { rootMargin: '200px 0px' });
      lazyEls.forEach(el => lazyObs.observe(el));
    } else {
      // IntersectionObserver 미지원 환경: 즉시 적용 (fallback)
      lazyEls.forEach(el => { el.style.backgroundImage = `url('${el.dataset.bg}')`; el.removeAttribute('data-bg'); });
    }
  };

  /* ── Slider dots for mobile ── */
  window.initSliderDots = function(gridId, dotsId) {
    const grid = document.getElementById(gridId);
    const dotsWrap = document.getElementById(dotsId);
    if (!grid || !dotsWrap) return;

    const cards = grid.querySelectorAll('.card');
    if (!cards.length) return;

    dotsWrap.innerHTML = '';
    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `슬라이드 ${i + 1}`);
      dot.onclick = () => {
        cards[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      };
      dotsWrap.appendChild(dot);
    });

    let scrollTimer;
    grid.addEventListener('scroll', () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const gridRect = grid.getBoundingClientRect();
        let closest = 0, minDist = Infinity;
        cards.forEach((card, i) => {
          const dist = Math.abs(card.getBoundingClientRect().left - gridRect.left);
          if (dist < minDist) { minDist = dist; closest = i; }
        });
        dotsWrap.querySelectorAll('.slider-dot').forEach((d, i) => {
          d.classList.toggle('active', i === closest);
        });
      }, 50);
    }, { passive: true });
  };

  /* ── Sort ── */
  window.initSortBar = function(containerId, cars, badgeOverride, pageCategory) {
    const sortBtn = document.getElementById('sortBtn');
    const sortDD = document.getElementById('sortDropdown');
    if (!sortBtn || !sortDD) return;

    sortBtn.onclick = e => { e.stopPropagation(); sortDD.classList.toggle('open'); };
    document.addEventListener('click', () => sortDD.classList.remove('open'));

    sortDD.querySelectorAll('.sort-option').forEach(opt => {
      opt.onclick = () => {
        sortDD.querySelectorAll('.sort-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        sortBtn.querySelector('span').textContent = opt.textContent;
        sortDD.classList.remove('open');
        let sorted = [...cars];
        const k = opt.dataset.sort;
        if      (k === 'price-low')  sorted.sort((a, b) => a.price - b.price);
        else if (k === 'price-high') sorted.sort((a, b) => b.price - a.price);
        else if (k === 'year-new')   sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
        else if (k === 'year-old')   sorted.sort((a, b) => (a.year || 0) - (b.year || 0));
        renderCarCards(containerId, sorted, badgeOverride, pageCategory);
      };
    });
  };

  /* ──────────────────────────────────────────
     TOP 5 Ranking Engine
     ──────────────────────────────────────────
     getTopN(cars)        — 차량의 lifetime 정적 통계 기반 (관리자 참고용)
     getWeeklyTopN(cars)  — activity 로그의 최근 7일 활동 기반 (공개 사이트 금주 TOP 5)
     점수 = 정규화된 inquiries·views·contracts 의 가중합 (0.4 / 0.25 / 0.35).
     동점/무활동 처리: _norm 이 모두 1로 평탄화하여 다른 차원으로 정렬됨.
     ────────────────────────────────────────── */
  window.Top5RankingEngine = class {
    constructor(w = {}) {
      this.w = { i: w.inquiryWeight || 0.4, v: w.viewWeight || 0.25, c: w.contractWeight || 0.35 };
      this.n = w.topN || 5;
    }
    _norm(arr) {
      const mn = Math.min(...arr), mx = Math.max(...arr);
      return mx === mn ? arr.map(() => 1) : arr.map(v => (v - mn) / (mx - mn));
    }
    _rank(cars, statsFn) {
      const stats = cars.map(c => statsFn(c));
      const ni = this._norm(stats.map(s => s.inquiries || 0));
      const nv = this._norm(stats.map(s => s.views     || 0));
      const nc = this._norm(stats.map(s => s.contracts || 0));
      return cars
        .map((car, i) => Object.assign({}, car, {
          weeklyViews:     stats[i].views     || 0,
          weeklyInquiries: stats[i].inquiries || 0,
          weeklyContracts: stats[i].contracts || 0,
          score: ni[i] * this.w.i + nv[i] * this.w.v + nc[i] * this.w.c,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, this.n);
    }
    getTopN(cars) {
      return this._rank(cars, c => ({
        views: c.views, inquiries: c.inquiries, contracts: c.contracts,
      }));
    }
    getWeeklyTopN(cars) {
      if (typeof window.getCarStats !== 'function') return this.getTopN(cars);
      return this._rank(cars, c => window.getCarStats(c.id, 7));
    }
  };

  /* ══════════════════════════════
     HERO SLIDER — 공통 (메인/월렌트/12개월/중고차 등)
     ──────────────────────────────
     • #heroSlider 요소가 있으면 loadBannersV2() 기반으로 슬라이드 렌더
     • 데스크탑/모바일 이미지 각각 관리자 설정 사용 (없으면 자동 banner_N→banner_mobile_N)
     • 첫 슬라이드는 HTML 인라인 유지 (LCP 보호)
     • 도트·좌우 화살표 + 4.5초 오토플레이
     ══════════════════════════════ */
  window.initHeroSlider = function(elId) {
    elId = elId || 'heroSlider';
    const heroEl = document.getElementById(elId);
    if (!heroEl) return;
    // 이미 한 번 초기화된 hero 가 있으면 이전 자원 정리 (재호출 안전성)
    if (heroEl._heroCleanup) heroEl._heroCleanup();
    let heroAuto = null;
    let lastBannerSig = '';
    // 이번 호출에서 등록한 listener 들을 모아두고 다음 cleanup 시 일괄 제거
    const listeners = [];
    function listen(target, event, handler, opts) {
      target.addEventListener(event, handler, opts);
      listeners.push({ target, event, handler, opts });
    }

    function buildSlide(entry, active) {
      // entry: { image, mobileImage, url, alt } from loadBannersV2()
      const slide = document.createElement('div');
      slide.className = 'hero-slide' + (active ? ' active' : '');
      slide.dataset.banner = entry.image;
      const pic = document.createElement('picture');
      if (entry.mobileImage) {
        const src = document.createElement('source');
        src.media = '(max-width: 768px)';
        src.srcset = window.resolveImageUrl(entry.mobileImage);
        pic.appendChild(src);
      }
      const img = document.createElement('img');
      img.src = window.resolveImageUrl(entry.image);
      img.alt = entry.alt || '';
      img.decoding = 'async';
      img.loading = active ? 'eager' : 'lazy';
      pic.appendChild(img);
      // url 이 있으면 슬라이드 클릭 시 이동
      if (entry.url) {
        const a = document.createElement('a');
        a.href = entry.url;
        a.setAttribute('aria-label', entry.alt || '배너 링크');
        a.appendChild(pic);
        slide.appendChild(a);
      } else {
        slide.appendChild(pic);
      }
      return slide;
    }

    function renderHero() {
      const list = (typeof loadBannersV2 === 'function') ? loadBannersV2() : [];
      const entries = list.length ? list : [{ image: 'banner_1.webp', mobileImage: 'banner_mobile_1.webp' }];
      const sig = entries.map(e => `${e.image}|${e.mobileImage || ''}|${e.url || ''}|${e.alt || ''}`).join('::');
      if (sig === lastBannerSig) return;
      lastBannerSig = sig;
      // banners 변수는 아래 길이 체크/dots 에서 사용
      const banners = entries;

      // 첫 슬라이드 LCP 보호 — HTML 인라인된 게 같으면 유지
      const existingFirst = heroEl.querySelector('.hero-slide');
      const firstBanner = banners[0].image;
      if (existingFirst && existingFirst.dataset.banner === firstBanner) {
        heroEl.querySelectorAll('.hero-slide:not(:first-child), .hero-dots').forEach(n => n.remove());
        banners.slice(1).forEach(b => heroEl.appendChild(buildSlide(b, false)));
      } else {
        heroEl.innerHTML = '';
        banners.forEach((b, i) => heroEl.appendChild(buildSlide(b, i === 0)));
      }

      heroEl.querySelectorAll('.hero-arrow').forEach(n => n.remove());

      if (banners.length > 1) {
        const dots = document.createElement('div');
        dots.className = 'hero-dots';
        banners.forEach((_, i) => {
          const dot = document.createElement('button');
          dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
          dot.dataset.idx = i;
          dot.setAttribute('aria-label', `배너 ${i + 1}`);
          dots.appendChild(dot);
        });
        heroEl.appendChild(dots);

        const prevBtn = document.createElement('button');
        prevBtn.className = 'hero-arrow hero-arrow-prev';
        prevBtn.setAttribute('aria-label', '이전 배너');
        prevBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
        const nextBtn = document.createElement('button');
        nextBtn.className = 'hero-arrow hero-arrow-next';
        nextBtn.setAttribute('aria-label', '다음 배너');
        nextBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
        heroEl.appendChild(prevBtn);
        heroEl.appendChild(nextBtn);

        const heroSlides = heroEl.querySelectorAll('.hero-slide');
        const heroDots = heroEl.querySelectorAll('.hero-dot');
        if (heroAuto) clearInterval(heroAuto);
        let idx = 0;
        const goTo = (i) => {
          heroSlides[idx].classList.remove('active');
          heroDots[idx] && heroDots[idx].classList.remove('active');
          idx = (i + heroSlides.length) % heroSlides.length;
          heroSlides[idx].classList.add('active');
          heroDots[idx] && heroDots[idx].classList.add('active');
        };
        const restart = () => {
          clearInterval(heroAuto);
          heroAuto = setInterval(() => goTo(idx + 1), 4500);
        };
        heroAuto = setInterval(() => goTo(idx + 1), 4500);
        heroDots.forEach(d => listen(d, 'click', () => {
          goTo(parseInt(d.dataset.idx, 10));
          restart();
        }));
        listen(prevBtn, 'click', () => { goTo(idx - 1); restart(); });
        listen(nextBtn, 'click', () => { goTo(idx + 1); restart(); });
        // 탭이 백그라운드 되면 autoplay 멈춤 (배터리/메모리 절약)
        listen(document, 'visibilitychange', () => {
          if (document.hidden) { clearInterval(heroAuto); heroAuto = null; }
          else if (!heroAuto) heroAuto = setInterval(() => goTo(idx + 1), 4500);
        });
      }
    }

    // 외부에서 호출 가능한 정리 함수 — 재초기화 / 페이지 unload 대비
    heroEl._heroCleanup = function() {
      if (heroAuto) { clearInterval(heroAuto); heroAuto = null; }
      listeners.splice(0).forEach(l => {
        try { l.target.removeEventListener(l.event, l.handler, l.opts); } catch (e) {}
      });
    };

    if (typeof loadBanners === 'function') {
      renderHero();
    } else {
      // common.js defer 로딩이 늦을 경우 한 틱 후 재시도 (LCP 영향 없음)
      setTimeout(() => { if (typeof loadBanners === 'function') renderHero(); }, 0);
    }
  };

  /* ══════════════════════════════
     NAMESPACE — window.RentCar (단일 진입점)
     ──────────────────────────────
     역호환을 위해 기존 window.X 함수도 그대로 유지하지만,
     신규 코드는 RentCar.X 사용을 권장. 향후 backend 모드로 교체 시
     이 namespace 만 한 곳에서 갈아끼우면 됨.
     ══════════════════════════════ */
  window.RentCar = {
    // 차량
    loadCars: () => window.carDatabase,
    saveCars: window.saveCarDatabase,
    resetCars: window.resetCarDatabase,
    // 배너 (메인 슬라이더)
    loadBanners: window.loadBanners,
    saveBanners: window.saveBanners,
    resetBanners: window.resetBanners,
    loadBannersV2: window.loadBannersV2,
    loadBannerMeta: window.loadBannerMeta,
    saveBannerMeta: window.saveBannerMeta,
    // 히어로 배너 (서브페이지)
    loadHeroBanners: window.loadHeroBanners,
    saveHeroBanners: window.saveHeroBanners,
    resetHeroBanners: window.resetHeroBanners,
    applyHeroBanner: window.applyHeroBanner,
    // 사이트 설정 / 회사정보 / 사업자정보 / 약관 등
    loadSettings: window.loadSettings, saveSettings: window.saveSettings, resetSettings: window.resetSettings,
    loadAbout: window.loadAbout,       saveAbout: window.saveAbout,       resetAbout: window.resetAbout,
    loadBusiness: window.loadBusiness, saveBusiness: window.saveBusiness, resetBusiness: window.resetBusiness,
    loadFaq: window.loadFaq,           saveFaq: window.saveFaq,           resetFaq: window.resetFaq,
    loadInfo: window.loadInfo,         saveInfo: window.saveInfo,         resetInfo: window.resetInfo,
    loadFormOptions: window.loadFormOptions, saveFormOptions: window.saveFormOptions, resetFormOptions: window.resetFormOptions,
    loadTerms: window.loadTerms,       saveTerms: window.saveTerms,       resetTerms: window.resetTerms,
    loadPrivacy: window.loadPrivacy,   savePrivacy: window.savePrivacy,   resetPrivacy: window.resetPrivacy,
    // 이미지 업로드
    loadUploadedImages: window.loadUploadedImages,
    saveUploadedImages: window.saveUploadedImages,
    addUploadedImage: window.addUploadedImage,
    removeUploadedImage: window.removeUploadedImage,
    optimizeImageFile: window.optimizeImageFile,
    resolveImageUrl: window.resolveImageUrl,
    carImageUrl: window.carImageUrl,
    // 문의 / 활동 로그
    loadInquiries: window.loadInquiries, saveInquiries: window.saveInquiries, addInquiry: window.addInquiry,
    loadActivity: window.loadActivity, saveActivity: window.saveActivity, resetActivity: window.resetActivity,
    trackCarView: window.trackCarView, trackCarInquiry: window.trackCarInquiry, trackCarContract: window.trackCarContract,
    seedActivityIfEmpty: window.seedActivityIfEmpty,
    findCarIdByName: window.findCarIdByName,
    getCarStats: window.getCarStats,
    // UI 유틸
    showToast: window.showToast,
    initHeroSlider: window.initHeroSlider,
    renderCarCards: window.renderCarCards,
    initSliderDots: window.initSliderDots,
    initSortBar: window.initSortBar,
    Top5RankingEngine: window.Top5RankingEngine,
    applySiteSettings: window.applySiteSettings,
    applyAboutContent: window.applyAboutContent,
    safeSetItem: window.safeSetItem,
    // 백엔드 모드 토글 (향후 운영용)
    _backend: { mode: 'localStorage' },  // 'api' 로 바꾸면 PHP 호출로 전환
  };

  /* ══════════════════════════════════════════════════════════
     RUNTIME BACKEND HYDRATION (운영 모드 자동 감지)
     ──────────────────────────────────────────────────────────
     운영 도메인에서는 /api/cars.php · /api/settings.php 호출로
     실제 DB 데이터로 carDatabase / settings 를 덮어쓰고
     렌더 함수를 재실행해서 최신 데이터로 즉시 반영한다.
     ───
     - 로컬(localhost·file://·*.github.io) 에서는 호출 자체를 생략 → 정적 fallback 유지
     - 호출 실패 시 console.warn 만 남기고 정적 데이터 그대로 사용 → 화이트 페이지 방지
     ══════════════════════════════════════════════════════════ */
  function _isProdHost() {
    const h = (location.hostname || '').toLowerCase();
    if (location.protocol === 'file:' || h === 'localhost' || h === '127.0.0.1' || h === '') return false;
    if (/\.github\.io$/.test(h)) return false;
    return true;
  }

  async function hydrateFromBackend() {
    if (!_isProdHost()) return;
    const API = '/api';
    // 1) 차량 목록
    try {
      const res = await fetch(API + '/cars.php', { credentials: 'same-origin' });
      if (res.ok) {
        const d = await res.json();
        if (d && d.ok && Array.isArray(d.cars) && d.cars.length) {
          window.carDatabase = d.cars;
          window._backend = { mode: 'api' };
        }
      }
    } catch (e) { /* fallback to defaults */ }

    // 2) 사이트 설정 (site / about / business)
    try {
      const res = await fetch(API + '/settings.php', { credentials: 'same-origin' });
      if (res.ok) {
        const d = await res.json();
        if (d && d.ok && d.settings) {
          if (d.settings.site)     window._serverSiteSettings    = d.settings.site;
          if (d.settings.about)    window._serverAboutContent    = d.settings.about;
          if (d.settings.business) window._serverBusinessContent = d.settings.business;
          if (d.settings.banners)  window._serverBanners         = d.settings.banners;
          if (d.settings.hero_banners) window._serverHeroBanners = d.settings.hero_banners;
          if (d.settings.faq)      window._serverFAQ             = d.settings.faq;
        }
      }
    } catch (e) {}

    // 렌더 재실행 — 로드 직후 정적으로 그려진 화면을 DB 데이터로 갱신
    try { typeof applySiteSettings === 'function' && applySiteSettings(); } catch (e) {}
    try { typeof applyAboutContent  === 'function' && applyAboutContent();  } catch (e) {}
    try { typeof window.applyHeroBanner === 'function' && window.applyHeroBanner(); } catch (e) {}
    try { typeof window.renderCarCards === 'function' && document.querySelectorAll('[data-cars]').forEach(el => window.renderCarCards(el)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('rentcar:hydrated', { detail: { mode: window._backend && window._backend.mode } }));
  }

  /* ── 차량 상세 조회수 트래킹 (서버측, fire-and-forget) ── */
  window.trackServerCarView = function(carId) {
    if (!_isProdHost() || !carId) return;
    try {
      fetch('/api/track-view.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carId: Number(carId) }),
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => {});
    } catch (e) {}
  };

  /* ══════════════════════════════════════════════════════════
     ANALYTICS 자리 — 운영 도메인에서만 자동 로드
     ──────────────────────────────────────────────────────────
     · GA4: 카페24 배포 후 https://analytics.google.com 에서 측정 ID(G-XXXXXXXXXX) 받아서 GA4_ID 에 입력
     · Naver Analytics: https://analytics.naver.com 에서 사이트 등록 후 wcs_account 키 입력
     · 두 값 모두 빈 문자열이면 자동 skip — 운영 전 미설정 상태에서 오류·노이즈 없음
     ══════════════════════════════════════════════════════════ */
  const GA4_ID         = '';  // 예: 'G-XXXXXXXXXX'
  const NAVER_WCS_ID   = '';  // 예: 's_abcd1234'

  function loadAnalytics() {
    if (!_isProdHost()) return;
    // Google Analytics 4
    if (GA4_ID) {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){ window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', GA4_ID, { anonymize_ip: true });
    }
    // Naver Analytics (Webmaster Tool 트래커)
    if (NAVER_WCS_ID) {
      const s = document.createElement('script');
      s.async = true;
      s.src = '//wcs.naver.net/wcslog.js';
      s.onload = function() {
        if (!window.wcs_add) window.wcs_add = {};
        window.wcs_add._nasa = NAVER_WCS_ID;
        if (window.wcs && window.wcs.inflow) window.wcs.inflow();
        if (window.wcs_do) window.wcs_do();
      };
      document.head.appendChild(s);
    }
  }

  /* ── Service Worker 등록 (PWA 캐시·오프라인 fallback)
     ─ HTTPS 운영 도메인에서만 활성 (file://·localhost http 에서는 자동 skip) ── */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    // 관리자 페이지에서는 SW 사용 안 함 (no-cache 정책)
    if (location.pathname.startsWith('/admin/')) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    });
  }

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', async () => {
    await loadIncludes();
    applySiteSettings();
    applyAboutContent();
    if (typeof window.applyHeroBanner === 'function') window.applyHeroBanner();
    initFadeUp();
    // 운영 모드: 정적 렌더 직후 백엔드 데이터로 hydration
    hydrateFromBackend();
    registerServiceWorker();
    loadAnalytics();
  });

})();
