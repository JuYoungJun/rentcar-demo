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
    if (!page) return;
    document.querySelectorAll('.header-nav a[data-page]').forEach(a => {
      if (a.dataset.page === page) a.classList.add('active');
    });
  }

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
    const contactEl = document.getElementById('contact');
    const goContact = () => {
      if (contactEl) contactEl.scrollIntoView({ behavior: 'smooth' });
      else window.location.href = 'index.html#contact';
    };
    const hq = document.getElementById('headerQuoteBtn');
    const mq = document.getElementById('mobileQuoteBtn');
    if (hq) hq.onclick = goContact;
    if (mq) mq.onclick = goContact;

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

  /* ── Car Database ── */
  window.carDatabase = [
    { id:1,  name:'K5 DL3',              tags:['무심사','무보증'],            price:650000,  badge:'1개월',  category:['monthly','longterm'],         inquiries:42, views:320, contracts:18 },
    { id:2,  name:'더 뉴 카니발',         tags:['19년식','무심사','무보증'],   price:750000,  badge:'1개월',  category:['monthly','longterm'],         inquiries:38, views:280, contracts:15 },
    { id:3,  name:'벤츠 E200 아방가르드', tags:['24년식','무심사','무보증'],   price:2200000, badge:'1개월',  category:['monthly','longterm','used'],  inquiries:55, views:510, contracts:22 },
    { id:4,  name:'제네시스 G80',         tags:['24년식','무심사'],           price:1800000, badge:'1개월',  category:['monthly'],                    inquiries:67, views:620, contracts:30 },
    { id:5,  name:'벤츠 E200',           tags:['23년식','무보증'],           price:1900000, badge:'1개월',  category:['monthly'],                    inquiries:50, views:450, contracts:25 },
    { id:6,  name:'BMW 320i',            tags:['23년식','무심사'],           price:1500000, badge:'1개월',  category:['monthly'],                    inquiries:45, views:400, contracts:20 },
    { id:7,  name:'볼보 S60',            tags:['22년식','무보증'],           price:1200000, badge:'1개월',  category:['monthly','longterm'],          inquiries:30, views:250, contracts:12 },
    { id:8,  name:'아반떼 CN7',           tags:['무심사','무보증'],           price:450000,  badge:'48개월', category:['longterm'],                   inquiries:35, views:300, contracts:14 },
    { id:9,  name:'쏘나타 DN8',           tags:['23년식','무심사'],           price:550000,  badge:'48개월', category:['longterm','used'],             inquiries:28, views:220, contracts:10 },
    { id:10, name:'그랜저 IG',            tags:['22년식','무보증'],           price:850000,  badge:'48개월', category:['monthly','longterm','used'],   inquiries:33, views:270, contracts:13 },
    { id:11, name:'K5 DL3',              tags:['무심사','무보증'],           price:650000,  badge:'48개월', category:['longterm','used'],             inquiries:40, views:310, contracts:17 },
    { id:12, name:'더 뉴 카니발',         tags:['19년식','무심사','무보증'],  price:750000,  badge:'48개월', category:['longterm','used'],             inquiries:36, views:275, contracts:14 },
  ];

  /* ── Render car cards ── */
  window.renderCarCards = function(containerId, cars, badgeOverride, pageCategory) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const fragment = document.createDocumentFragment();
    const temp = document.createElement('div');
    temp.innerHTML = cars.map(car => `
      <div class="card" data-car="${car.name}" data-id="${car.id}" data-price="${car.price.toLocaleString()}">
        <div class="card-thumb">
          <div class="card-thumb-inner"></div>
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
    initFadeUp();
    // Fade in page
    requestAnimationFrame(() => {
      document.documentElement.classList.add('loaded');
    });
  });

})();
