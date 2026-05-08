/* ══════════════════════════════
   ADMIN DASHBOARD
   ──────────────────────────────
   현재 데이터 소스: localStorage (carDatabase, banner list)
   추후 백엔드 전환 시 dataLayer 함수만 교체하면 됨.
   ══════════════════════════════ */
(function () {
  'use strict';

  /* ── DATA LAYER ─────────────────────────────────────
     데모: localStorage. 실제: AdminAuth.fetchAuthed() 로 PHP/MySQL 호출
  */
  const DataLayer = {
    async fetchCars() {
      // 실제 백엔드 시:
      // const r = await AdminAuth.fetchAuthed(API + '/cars.php'); return r.json();
      return Array.isArray(window.carDatabase) ? window.carDatabase.slice() : [];
    },
    async saveCars(cars) {
      // 실제: POST /cars.php with { cars }
      window.saveCarDatabase(cars);
    },
    async resetCars() {
      window.resetCarDatabase();
    },
    async fetchBanners() {
      return window.loadBanners();
    },
    async saveBanners(list) {
      window.saveBanners(list);
    },
    async resetBanners() {
      window.resetBanners();
    },
  };

  /* ── 사용 가능한 이미지 목록 (images/ 폴더에 실제 존재해야 함) ── */
  const AVAILABLE_IMAGES = [
    'k5-dl3.webp',
    'carnival.webp',
    'benz-e200.webp',
    'genesis-g80.webp',
  ];
  const AVAILABLE_BANNERS = [
    'banner-1.webp', 'banner-2.webp', 'banner-3.webp', 'banner-4.webp', 'banner-5.webp',
  ];

  /* ── STATE ───────────────────────────────────────── */
  let cars = [];
  let banners = [];
  let editingId = null;

  /* ── UTILS ───────────────────────────────────────── */
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);

  function toast(msg, type) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (type === 'error' ? ' error' : '');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function imageUrl(file) {
    return '../images/' + encodeURI(file).replace(/'/g, '%27');
  }

  function nextId(list) {
    return list.reduce((m, c) => Math.max(m, c.id), 0) + 1;
  }

  /* ── TAB SWITCHING ────────────────────────────────── */
  function setTab(name) {
    $$('.admin-nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $$('.tab-panel').forEach(p => p.hidden = (p.id !== 'tab-' + name));
    if (name === 'overview') renderOverview();
  }

  /* ── CARS RENDER ──────────────────────────────────── */
  function renderCars() {
    const search = ($('#carSearch').value || '').trim().toLowerCase();
    const cat = $('#catFilter').value;
    const tbody = $('#carsBody');

    const filtered = cars.filter(c => {
      if (search && !c.name.toLowerCase().includes(search)) return false;
      if (cat && !(c.category || []).includes(cat)) return false;
      return true;
    });

    $('#carCount').textContent = filtered.length === cars.length
      ? `${cars.length}대`
      : `${filtered.length} / ${cars.length}대`;

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty">조건에 맞는 차량이 없습니다.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(c => `
      <tr data-id="${c.id}">
        <td>${c.id}</td>
        <td><div class="tbl-thumb" style="background-image:url('${imageUrl(c.image || '')}')"></div></td>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td>${c.year || '-'}</td>
        <td>${(c.price || 0).toLocaleString()}원</td>
        <td>${escapeHtml(c.badge || '-')}</td>
        <td>${(c.category || []).map(x => `<span class="cat-pill">${categoryLabel(x)}</span>`).join('')}</td>
        <td>${(c.tags || []).map(t => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('')}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm" data-action="edit">수정</button>
            <button class="btn btn-danger-ghost btn-sm" data-action="delete">삭제</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(btn.closest('tr').dataset.id, 10);
        if (btn.dataset.action === 'edit') openCarModal(id);
        else if (btn.dataset.action === 'delete') deleteCar(id);
      });
    });
  }

  function categoryLabel(c) {
    return ({ monthly: '월렌트', longterm: '저신용', used: '중고차' })[c] || c;
  }

  /* ── CARS CRUD ────────────────────────────────────── */
  function openCarModal(id) {
    editingId = id;
    const car = id ? cars.find(c => c.id === id) : null;
    $('#carModalTitle').textContent = id ? '차량 수정' : '차량 추가';
    $('#cf_id').value = id || '';
    $('#cf_name').value = car ? car.name : '';
    $('#cf_year').value = car ? (car.year || '') : '';
    $('#cf_price').value = car ? car.price : '';
    $('#cf_badge').value = car ? (car.badge || '') : '';
    $('#cf_image').value = car ? (car.image || AVAILABLE_IMAGES[0]) : AVAILABLE_IMAGES[0];
    $('#cf_tags').value = car ? (car.tags || []).join(', ') : '';
    $('#cf_views').value = car ? (car.views || 0) : 0;
    $('#cf_inquiries').value = car ? (car.inquiries || 0) : 0;
    $('#cf_contracts').value = car ? (car.contracts || 0) : 0;

    $$('input[name="cf_cat"]').forEach(cb => {
      cb.checked = car ? (car.category || []).includes(cb.value) : false;
    });

    $('#carModal').classList.add('open');
    setTimeout(() => $('#cf_name').focus(), 50);
  }

  function closeCarModal() {
    $('#carModal').classList.remove('open');
    editingId = null;
  }

  async function saveCarFromForm(e) {
    e.preventDefault();

    const id = parseInt($('#cf_id').value, 10) || null;
    const name = $('#cf_name').value.trim();
    const price = parseInt($('#cf_price').value, 10);
    const yr = parseInt($('#cf_year').value, 10);
    const cats = Array.from($$('input[name="cf_cat"]:checked')).map(c => c.value);
    const tags = $('#cf_tags').value.split(',').map(s => s.trim()).filter(Boolean);

    if (!name) return toast('차량명을 입력해주세요.', 'error');
    if (!price || price < 0) return toast('가격을 올바르게 입력해주세요.', 'error');
    if (!cats.length) return toast('카테고리를 최소 1개 선택해주세요.', 'error');

    const payload = {
      id: id || nextId(cars),
      name,
      year: yr || undefined,
      price,
      badge: $('#cf_badge').value.trim() || undefined,
      image: $('#cf_image').value,
      category: cats,
      tags,
      views: parseInt($('#cf_views').value, 10) || 0,
      inquiries: parseInt($('#cf_inquiries').value, 10) || 0,
      contracts: parseInt($('#cf_contracts').value, 10) || 0,
    };

    if (id) {
      const idx = cars.findIndex(c => c.id === id);
      if (idx === -1) return toast('차량을 찾지 못했습니다.', 'error');
      cars[idx] = payload;
    } else {
      cars.push(payload);
    }

    await DataLayer.saveCars(cars);
    closeCarModal();
    renderCars();
    toast(id ? '차량 정보가 수정되었습니다.' : '차량이 추가되었습니다.');
  }

  async function deleteCar(id) {
    const car = cars.find(c => c.id === id);
    if (!car) return;
    if (!confirm(`"${car.name}" 차량을 삭제하시겠습니까?`)) return;
    cars = cars.filter(c => c.id !== id);
    await DataLayer.saveCars(cars);
    renderCars();
    toast('차량이 삭제되었습니다.');
  }

  async function resetAllCars() {
    if (!confirm('모든 변경사항을 버리고 기본 데이터로 복원하시겠습니까?')) return;
    await DataLayer.resetCars();
    cars = await DataLayer.fetchCars();
    renderCars();
    toast('기본값으로 복원되었습니다.');
  }

  /* ── BANNERS ──────────────────────────────────────── */
  function renderBanners() {
    const list = $('#bannerList');
    if (!banners.length) {
      list.innerHTML = '<div class="empty">표시할 배너가 없습니다. 아래에서 추가해주세요.</div>';
    } else {
      list.innerHTML = banners.map((b, i) => `
        <div class="banner-item" data-idx="${i}">
          <div class="banner-thumb" style="background-image:url('${imageUrl(b)}')"></div>
          <div class="banner-name">${escapeHtml(b)}</div>
          <div class="banner-actions">
            <button class="icon-btn" data-act="up" ${i === 0 ? 'disabled' : ''} title="위로">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="icon-btn" data-act="down" ${i === banners.length - 1 ? 'disabled' : ''} title="아래로">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button class="icon-btn" data-act="del" title="제거">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4a2 2 0 012-2h0a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
      `).join('');
      list.querySelectorAll('button[data-act]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.closest('.banner-item').dataset.idx, 10);
          const act = btn.dataset.act;
          if (act === 'up' && idx > 0) [banners[idx-1], banners[idx]] = [banners[idx], banners[idx-1]];
          else if (act === 'down' && idx < banners.length - 1) [banners[idx+1], banners[idx]] = [banners[idx], banners[idx+1]];
          else if (act === 'del') banners.splice(idx, 1);
          DataLayer.saveBanners(banners);
          renderBanners();
        });
      });
    }

    // populate add dropdown with banners not already in list
    const addSel = $('#bannerAddSelect');
    const remaining = AVAILABLE_BANNERS.filter(b => !banners.includes(b));
    addSel.innerHTML = remaining.length
      ? '<option value="" disabled selected>추가할 배너 이미지 선택</option>' +
        remaining.map(b => `<option value="${b}">${b}</option>`).join('')
      : '<option value="" disabled selected>추가 가능한 배너가 없습니다</option>';
    addSel.disabled = !remaining.length;
    $('#bannerAddBtn').disabled = !remaining.length;
  }

  async function addBanner() {
    const v = $('#bannerAddSelect').value;
    if (!v) return toast('배너를 선택해주세요.', 'error');
    banners.push(v);
    await DataLayer.saveBanners(banners);
    renderBanners();
    toast('배너가 추가되었습니다.');
  }

  async function resetAllBanners() {
    if (!confirm('배너 순서를 기본값으로 복원하시겠습니까?')) return;
    await DataLayer.resetBanners();
    banners = await DataLayer.fetchBanners();
    renderBanners();
    toast('기본값으로 복원되었습니다.');
  }

  /* ── OVERVIEW ─────────────────────────────────────── */
  function renderOverview() {
    $('#statCarsTotal').textContent = cars.length;
    $('#statMonthly').textContent = cars.filter(c => (c.category || []).includes('monthly')).length;
    $('#statLongterm').textContent = cars.filter(c => (c.category || []).includes('longterm')).length;
    $('#statUsed').textContent = cars.filter(c => (c.category || []).includes('used')).length;

    const engine = new window.Top5RankingEngine();
    const top5 = engine.getTopN(cars);
    $('#top5Body').innerHTML = top5.map((c, i) => `
      <tr>
        <td><strong>${i + 1}</strong></td>
        <td>${escapeHtml(c.name)}</td>
        <td>${(c.views || 0).toLocaleString()}</td>
        <td>${(c.inquiries || 0).toLocaleString()}</td>
        <td>${(c.contracts || 0).toLocaleString()}</td>
        <td>${(c.score || 0).toFixed(3)}</td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="empty">데이터가 없습니다.</td></tr>';
  }

  /* ── INIT ─────────────────────────────────────────── */
  async function init() {
    document.documentElement.classList.add('loaded');

    const user = AdminAuth.getUser();
    if (user) {
      $('#userName').textContent = user.name || user.id;
      $('#userRole').textContent = user.role || '';
    }

    cars = await DataLayer.fetchCars();
    banners = await DataLayer.fetchBanners();

    // populate image select for car form
    const imgSel = $('#cf_image');
    imgSel.innerHTML = AVAILABLE_IMAGES.map(f => `<option value="${f}">${f}</option>`).join('');

    // tab buttons
    $$('.admin-nav-item').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

    // logout
    $('#logoutBtn').addEventListener('click', () => AdminAuth.logout());

    // car table actions
    $('#addCarBtn').addEventListener('click', () => openCarModal(null));
    $('#resetCarsBtn').addEventListener('click', resetAllCars);
    $('#carSearch').addEventListener('input', renderCars);
    $('#catFilter').addEventListener('change', renderCars);

    // car modal
    $('#carModalClose').addEventListener('click', closeCarModal);
    $('#carModalCancel').addEventListener('click', closeCarModal);
    $('#carModal').addEventListener('click', (e) => { if (e.target.id === 'carModal') closeCarModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCarModal(); });
    $('#carForm').addEventListener('submit', saveCarFromForm);

    // banners
    $('#bannerAddBtn').addEventListener('click', addBanner);
    $('#resetBannersBtn').addEventListener('click', resetAllBanners);

    renderCars();
    renderBanners();
  }

  // common.js 가 carDatabase 를 세팅한 후에 시작
  function ready() {
    if (window.carDatabase && window.Top5RankingEngine) init();
    else setTimeout(ready, 30);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();
