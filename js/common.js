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
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2400);
  };

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
    const hq = document.getElementById('headerQuoteBtn');
    const mq = document.getElementById('mobileQuoteBtn');
    if (hq) hq.onclick = goQuote;
    if (mq) mq.onclick = goQuote;

    // Login modal
    const loginBtn = document.getElementById('loginBtn');
    const modal = document.getElementById('loginModal');
    if (loginBtn && modal) {
      const close = document.getElementById('loginClose');
      loginBtn.onclick = e => { e.preventDefault(); modal.classList.add('open'); };
      close.onclick = () => modal.classList.remove('open');
      modal.onclick = e => { if (e.target === modal) modal.classList.remove('open'); };
      document.getElementById('modalLoginBtn').onclick = () => {
        const id = document.getElementById('modalId').value.trim();
        const pw = document.getElementById('modalPw').value.trim();
        if (!id || !pw) return showToast('아이디와 비밀번호를 입력해주세요.');
        modal.classList.remove('open');
        showToast(`${id}님, 환영합니다!`);
      };
    }
  }

  /* ── Scroll fade ── */
  function initFadeUp() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));
  }

  /* ── Car Database (defaults — admin can override via localStorage) ── */
  const DEFAULT_CARS = [
    { id:1,  name:'K5 DL3',              tags:['무심사','무보증'],            year:2023, price:650000,  badge:'1개월',  category:['monthly','longterm'],         inquiries:42, views:320, contracts:18, image:'k5-dl3.webp' },
    { id:2,  name:'더 뉴 카니발',         tags:['19년식','무심사','무보증'],   year:2019, price:750000,  badge:'1개월',  category:['monthly','longterm'],         inquiries:38, views:280, contracts:15, image:'carnival.webp' },
    { id:3,  name:'벤츠 E200 아방가르드', tags:['24년식','무심사','무보증'],   year:2024, price:2200000, badge:'1개월',  category:['monthly','longterm','used'],  inquiries:55, views:510, contracts:22, image:'benz-e200.webp' },
    { id:4,  name:'제네시스 G80',         tags:['24년식','무심사'],           year:2024, price:1800000, badge:'1개월',  category:['monthly'],                    inquiries:67, views:620, contracts:30, image:'genesis-g80.webp' },
    { id:5,  name:'벤츠 E200',           tags:['23년식','무보증'],           year:2023, price:1900000, badge:'1개월',  category:['monthly'],                    inquiries:50, views:450, contracts:25, image:'benz-e200.webp' },
    { id:6,  name:'BMW 320i',            tags:['23년식','무심사'],           year:2023, price:1500000, badge:'1개월',  category:['monthly'],                    inquiries:45, views:400, contracts:20, image:'genesis-g80.webp' },
    { id:7,  name:'볼보 S60',            tags:['22년식','무보증'],           year:2022, price:1200000, badge:'1개월',  category:['monthly','longterm'],          inquiries:30, views:250, contracts:12, image:'genesis-g80.webp' },
    { id:8,  name:'아반떼 CN7',           tags:['무심사','무보증'],           year:2023, price:450000,  badge:'48개월', category:['longterm'],                   inquiries:35, views:300, contracts:14, image:'k5-dl3.webp' },
    { id:9,  name:'쏘나타 DN8',           tags:['23년식','무심사'],           year:2023, price:550000,  badge:'48개월', category:['longterm','used'],             inquiries:28, views:220, contracts:10, image:'k5-dl3.webp' },
    { id:10, name:'그랜저 IG',            tags:['22년식','무보증'],           year:2022, price:850000,  badge:'48개월', category:['monthly','longterm','used'],   inquiries:33, views:270, contracts:13, image:'genesis-g80.webp' },
    { id:11, name:'K5 DL3',              tags:['무심사','무보증'],           year:2023, price:650000,  badge:'48개월', category:['longterm','used'],             inquiries:40, views:310, contracts:17, image:'k5-dl3.webp' },
    { id:12, name:'더 뉴 카니발',         tags:['19년식','무심사','무보증'],  year:2019, price:750000,  badge:'48개월', category:['longterm','used'],             inquiries:36, views:275, contracts:14, image:'carnival.webp' },
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
  const DEFAULT_BANNERS = ['banner-1.webp','banner-2.webp','banner-3.webp','banner-4.webp','banner-5.webp'];
  const BANNER_KEY = 'rentcar_admin_banners';
  window.DEFAULT_BANNERS = DEFAULT_BANNERS;
  window.loadBanners = function() {
    try {
      const saved = localStorage.getItem(BANNER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) return parsed;
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

  /* ── Settings (관리자가 변경하는 사이트 공통 정보) ── */
  const DEFAULT_SETTINGS = {
    topBannerText: '최고의 렌트카 서비스, 해태렌트카에서',
    contactPhone: '0000-0000',
    contactHours: '평일 오전 9:00 - 오후 6:00\n주말 오전 10:00 - 오후 4:00',
    branchName: '해태렌트카 광주지점',
    branchHours: '평일 09:00 - 18:00 / 주말 10:00 - 16:00',
    footerDesc: '안전과 투명한 운영을 최우선으로\n믿고 맡길 수 있는 렌트카 서비스',
    footerCopyright: '© 2026 해태렌트카. All rights reserved.',
  };
  const SETTINGS_KEY = 'rentcar_settings';
  window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  window.loadSettings = function() {
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
    heading: '설명을 넣어주세요',
    subheading: '합리적인 요금과 다양한 차량 라인업을 통해\n고객의 이동을 편리하게 지원하는 렌트카 전문 기업입니다.',
    description: '경차부터 고급 세단, SUV까지 폭넓은 선택지를 제공하여 다양한 니즈를 충족합니다. 단기·장기 렌트는 물론, 기업 고객을 위한 맞춤형 차량 운영 서비스도 지원합니다. 정기적인 점검과 체계적인 관리로 항상 최상의 차량 상태를 유지합니다. 간편한 예약 시스템과 신속한 배차로 이용 편의성을 극대화했습니다. 고객 중심의 서비스와 투명한 운영으로 신뢰를 쌓아가고 있습니다. 이동의 가치를 높이는 모빌리티 파트너로서 일상과 비즈니스를 함께합니다.',
    stat1Label: '누적 고객 수', stat1Value: 15000,
    stat2Label: '보유 차량', stat2Value: 500,
    stat3Label: '고객 만족도 (%)', stat3Value: 98,
    stat4Label: '전국 지점', stat4Value: 8,
  };
  const ABOUT_KEY = 'rentcar_about';
  window.DEFAULT_ABOUT = DEFAULT_ABOUT;
  window.loadAbout = function() {
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
    localStorage.setItem(UPLOAD_KEY, JSON.stringify(map || {}));
  };
  window.addUploadedImage = function(name, dataUrl) {
    const map = window.loadUploadedImages();
    map[name] = dataUrl;
    window.saveUploadedImages(map);
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
    localStorage.setItem(INQUIRY_KEY, JSON.stringify(list || []));
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
    window.saveInquiries(list);
    return item;
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

  /* ── Render car cards ── */
  window.renderCarCards = function(containerId, cars, badgeOverride, pageCategory) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const fragment = document.createDocumentFragment();
    const temp = document.createElement('div');
    temp.innerHTML = cars.map(car => `
      <div class="card" data-car="${car.name}" data-id="${car.id}" data-price="${car.price.toLocaleString()}">
        <div class="card-thumb">
          <div class="card-thumb-inner"${car.image ? ` style="background-image:url('${carImageUrl(car.image)}')"` : ''}></div>
          ${(badgeOverride || car.badge) ? `<div class="card-badge">${badgeOverride || car.badge}</div>` : ''}
        </div>
        <div class="card-name">${car.name}</div>
        <div class="card-tags">${car.tags.map(t => '#'+t).join(' ')}</div>
        <div class="card-price">${car.price.toLocaleString()} 원</div>
      </div>
    `).join('');
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
        if (opt.dataset.sort === 'price-low') sorted.sort((a, b) => a.price - b.price);
        else if (opt.dataset.sort === 'price-high') sorted.sort((a, b) => b.price - a.price);
        renderCarCards(containerId, sorted, badgeOverride, pageCategory);
      };
    });
  };

  /* ── TOP 5 Ranking Engine ── */
  window.Top5RankingEngine = class {
    constructor(w = {}) {
      this.w = { i: w.inquiryWeight || 0.4, v: w.viewWeight || 0.25, c: w.contractWeight || 0.35 };
      this.n = w.topN || 5;
    }
    _norm(arr) {
      const mn = Math.min(...arr), mx = Math.max(...arr);
      return mx === mn ? arr.map(() => 1) : arr.map(v => (v - mn) / (mx - mn));
    }
    getTopN(cars) {
      const ni = this._norm(cars.map(c => c.inquiries));
      const nv = this._norm(cars.map(c => c.views));
      const nc = this._norm(cars.map(c => c.contracts));
      return cars.map((car, i) => ({
        ...car,
        score: ni[i] * this.w.i + nv[i] * this.w.v + nc[i] * this.w.c
      })).sort((a, b) => b.score - a.score).slice(0, this.n);
    }
  };

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', async () => {
    await loadIncludes();
    applySiteSettings();
    applyAboutContent();
    initFadeUp();
    // Fade in page
    requestAnimationFrame(() => {
      document.documentElement.classList.add('loaded');
    });
  });

})();
