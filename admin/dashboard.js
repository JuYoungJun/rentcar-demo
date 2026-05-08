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
    async fetchInquiries() {
      return window.loadInquiries();
    },
    async saveInquiries(list) {
      window.saveInquiries(list);
    },
    async fetchSettings() {
      return window.loadSettings();
    },
    async saveSettings(obj) {
      return window.saveSettings(obj);
    },
    async resetSettings() {
      window.resetSettings();
    },
    async fetchAbout() {
      return window.loadAbout();
    },
    async saveAbout(obj) {
      return window.saveAbout(obj);
    },
    async resetAbout() {
      window.resetAbout();
    },
    async fetchUploadedImages() {
      return window.loadUploadedImages();
    },
    async addUploadedImage(name, dataUrl) {
      window.addUploadedImage(name, dataUrl);
    },
    async removeUploadedImage(name) {
      window.removeUploadedImage(name);
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
  let inquiries = [];
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
    return window.resolveImageUrl ? window.resolveImageUrl(file, '../images/') : ('../images/' + encodeURI(file).replace(/'/g, '%27'));
  }

  function nextId(list) {
    return list.reduce((m, c) => Math.max(m, c.id), 0) + 1;
  }

  /* ── TAB SWITCHING ────────────────────────────────── */
  function setTab(name) {
    $$('.admin-nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $$('.tab-panel').forEach(p => p.hidden = (p.id !== 'tab-' + name));
    if (name === 'overview') renderOverview();
    else if (name === 'inquiries') renderInquiries();
    else if (name === 'settings') renderSettingsForm();
    else if (name === 'about') renderAboutForm();
    else if (name === 'images') renderImages();
  }

  /* ── 이미지 옵션 (파일 + 업로드) ─────────────────── */
  function getImageOptions() {
    const uploads = Object.keys(window.loadUploadedImages());
    return [
      ...AVAILABLE_IMAGES.map(f => ({ value: f, label: f })),
      ...uploads.map(n => ({ value: 'uploaded:' + n, label: '업로드: ' + n })),
    ];
  }
  function getBannerOptions() {
    const uploads = Object.keys(window.loadUploadedImages());
    return [
      ...AVAILABLE_BANNERS.map(f => ({ value: f, label: f })),
      ...uploads.map(n => ({ value: 'uploaded:' + n, label: '업로드: ' + n })),
    ];
  }
  function imageDisplayUrl(spec) {
    return window.resolveImageUrl(spec, '../images/');
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

    // populate add dropdown (파일 시스템 + 업로드 이미지)
    populateBannerAddSelect();
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

  /* ══════════════════════════════
     INQUIRIES (문의 관리)
     ══════════════════════════════ */
  function formatDateShort(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d)) return '-';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function renderInquiries() {
    const search = ($('#inquirySearch').value || '').trim().toLowerCase();
    const filter = $('#inquiryFilter').value;
    const tbody = $('#inquiriesBody');

    const filtered = inquiries.filter(it => {
      if (filter === 'unread' && it.isRead) return false;
      if (filter === 'read' && !it.isRead) return false;
      if (search) {
        const blob = [it.name, it.carName, it.phone, it.message, it.category].filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(search)) return false;
      }
      return true;
    });

    $('#inquiryCount').textContent = filtered.length === inquiries.length
      ? `${inquiries.length}건` : `${filtered.length} / ${inquiries.length}건`;

    const unreadCount = inquiries.filter(it => !it.isRead).length;
    const badge = $('#navInquiryBadge');
    if (badge) {
      if (unreadCount > 0) { badge.hidden = false; badge.textContent = String(unreadCount); }
      else badge.hidden = true;
    }

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty">표시할 문의가 없습니다.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(it => `
      <tr data-id="${it.id}" class="${it.isRead ? '' : 'row-unread'}">
        <td>${it.isRead ? '' : '<span class="dot-unread" title="미읽음"></span>'}</td>
        <td>${formatDateShort(it.createdAt)}</td>
        <td>${escapeHtml(it.type || '-')}</td>
        <td><strong>${escapeHtml(it.carName || '-')}</strong>${it.category ? ' <span class="cat-pill">'+escapeHtml(it.category)+'</span>' : ''}</td>
        <td>${escapeHtml(it.name || '-')}</td>
        <td>${escapeHtml(it.phone || '-')}</td>
        <td>${escapeHtml(it.source || '-')}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm" data-action="view">상세</button>
            <button class="btn btn-danger-ghost btn-sm" data-action="delete">삭제</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.closest('tr').dataset.id, 10);
        if (btn.dataset.action === 'view') openInquiryModal(id);
        else if (btn.dataset.action === 'delete') deleteInquiry(id);
      });
    });
  }

  function openInquiryModal(id) {
    const it = inquiries.find(x => x.id === id);
    if (!it) return;
    if (!it.isRead) {
      it.isRead = true;
      DataLayer.saveInquiries(inquiries);
      renderInquiries();
    }
    const rows = [
      ['접수일', formatDateShort(it.createdAt)],
      ['유형', it.type],
      ['카테고리', it.category],
      ['차량명', it.carName],
      ['희망 지역', it.region],
      ['희망 기간', it.period],
      ['이름', it.name],
      ['연락처', it.phone],
      ['희망 인수일', it.startDate],
      ['운전 경력', it.experience],
      ['출처', it.source],
      ['메시지', it.message],
    ].filter(r => r[1]);
    $('#inquiryModalBody').innerHTML = `
      <div class="inquiry-detail">
        ${rows.map(([k, v]) => `
          <div class="inq-row">
            <div class="inq-key">${k}</div>
            <div class="inq-val">${escapeHtml(String(v)).replace(/\n/g, '<br>')}</div>
          </div>
        `).join('')}
      </div>
    `;
    $('#inquiryModal').classList.add('open');
  }

  function closeInquiryModal() {
    $('#inquiryModal').classList.remove('open');
  }

  async function deleteInquiry(id) {
    if (!confirm('이 문의를 삭제하시겠습니까?')) return;
    inquiries = inquiries.filter(x => x.id !== id);
    await DataLayer.saveInquiries(inquiries);
    renderInquiries();
    toast('문의가 삭제되었습니다.');
  }

  async function markAllRead() {
    inquiries.forEach(it => { it.isRead = true; });
    await DataLayer.saveInquiries(inquiries);
    renderInquiries();
    toast('모두 읽음 처리했습니다.');
  }

  async function clearAllInquiries() {
    if (!inquiries.length) return toast('삭제할 문의가 없습니다.', 'error');
    if (!confirm(`전체 ${inquiries.length}건의 문의를 모두 삭제하시겠습니까?`)) return;
    inquiries = [];
    await DataLayer.saveInquiries(inquiries);
    renderInquiries();
    toast('전체 문의가 삭제되었습니다.');
  }

  /* ══════════════════════════════
     SETTINGS (사이트 정보)
     ══════════════════════════════ */
  const SETTING_FIELDS = [
    'topBannerText', 'footerDesc', 'footerCopyright',
    'contactPhone', 'contactHours',
    'branchName', 'branchHours',
  ];
  function renderSettingsForm() {
    const s = window.loadSettings();
    SETTING_FIELDS.forEach(k => {
      const el = $('#set_' + k);
      if (el) el.value = s[k] != null ? s[k] : '';
    });
  }
  async function saveSettingsForm() {
    const data = {};
    SETTING_FIELDS.forEach(k => {
      const el = $('#set_' + k);
      if (el) data[k] = el.value;
    });
    await DataLayer.saveSettings(data);
    toast('사이트 정보가 저장되었습니다. 공개 페이지에서 새로고침하면 반영됩니다.');
  }
  async function resetSettingsForm() {
    if (!confirm('사이트 정보를 기본값으로 복원하시겠습니까?')) return;
    await DataLayer.resetSettings();
    renderSettingsForm();
    toast('기본값으로 복원되었습니다.');
  }

  /* ══════════════════════════════
     ABOUT (회사소개)
     ══════════════════════════════ */
  const ABOUT_TEXT_FIELDS = ['heading', 'subheading', 'description'];
  const ABOUT_STAT_FIELDS = ['stat1Label','stat1Value','stat2Label','stat2Value','stat3Label','stat3Value','stat4Label','stat4Value'];
  function renderAboutForm() {
    const a = window.loadAbout();
    ABOUT_TEXT_FIELDS.forEach(k => { const el = $('#abt_' + k); if (el) el.value = a[k] || ''; });
    ABOUT_STAT_FIELDS.forEach(k => { const el = $('#abt_' + k); if (el) el.value = a[k] != null ? a[k] : ''; });
  }
  async function saveAboutForm() {
    const data = {};
    ABOUT_TEXT_FIELDS.forEach(k => { const el = $('#abt_' + k); if (el) data[k] = el.value; });
    ABOUT_STAT_FIELDS.forEach(k => {
      const el = $('#abt_' + k);
      if (!el) return;
      if (k.endsWith('Value')) data[k] = parseInt(el.value, 10) || 0;
      else data[k] = el.value;
    });
    await DataLayer.saveAbout(data);
    toast('회사소개가 저장되었습니다.');
  }
  async function resetAboutForm() {
    if (!confirm('회사소개를 기본값으로 복원하시겠습니까?')) return;
    await DataLayer.resetAbout();
    renderAboutForm();
    toast('기본값으로 복원되었습니다.');
  }

  /* ══════════════════════════════
     IMAGE UPLOADS (이미지 업로드)
     ══════════════════════════════ */
  const MAX_IMG_BYTES = 5 * 1024 * 1024; // 5MB cumulative cap (warn)

  function calcStorageBytes(map) {
    let n = 0;
    Object.values(map || {}).forEach(v => { if (typeof v === 'string') n += v.length; });
    return n;
  }
  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
    return (n/1024/1024).toFixed(2) + ' MB';
  }

  function renderImages() {
    const map = window.loadUploadedImages();
    const names = Object.keys(map);
    $('#imgStorageBytes').textContent = formatBytes(calcStorageBytes(map));

    const grid = $('#uploadedImageGrid');
    if (!names.length) {
      grid.innerHTML = '<div class="empty">아직 업로드된 이미지가 없습니다.</div>';
      return;
    }
    grid.innerHTML = names.map(n => `
      <div class="img-card" data-name="${escapeHtml(n)}">
        <div class="img-card-thumb" style="background-image:url('${map[n]}')"></div>
        <div class="img-card-name" title="${escapeHtml(n)}">${escapeHtml(n)}</div>
        <div class="img-card-actions">
          <button class="btn btn-danger-ghost btn-sm" data-act="del">삭제</button>
        </div>
      </div>
    `).join('');
    grid.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.closest('.img-card').dataset.name;
        deleteUploadedImage(name);
      });
    });
  }

  async function handleImageUpload(files) {
    if (!files || !files.length) return;
    const map = window.loadUploadedImages();
    let totalBytes = calcStorageBytes(map);
    let added = 0;

    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue;
      try {
        const dataUrl = await readFileAsDataUrl(f);
        const newBytes = totalBytes + dataUrl.length;
        if (newBytes > MAX_IMG_BYTES) {
          toast(`용량 한도(${formatBytes(MAX_IMG_BYTES)}) 초과로 "${f.name}"를 건너뜁니다.`, 'error');
          continue;
        }
        const name = uniqueImageName(map, f.name);
        map[name] = dataUrl;
        totalBytes = newBytes;
        added++;
      } catch (e) {
        toast(`"${f.name}" 읽기 실패`, 'error');
      }
    }
    window.saveUploadedImages(map);
    renderImages();
    // 차량 모달의 이미지 옵션도 갱신
    populateImageSelect();
    populateBannerAddSelect();
    if (added) toast(`${added}장의 이미지가 업로드되었습니다.`);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  function uniqueImageName(map, original) {
    let base = original.replace(/[^\w.\-가-힣]/g, '_');
    if (!map[base]) return base;
    const dot = base.lastIndexOf('.');
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const ext = dot > 0 ? base.slice(dot) : '';
    let i = 2;
    while (map[`${stem}_${i}${ext}`]) i++;
    return `${stem}_${i}${ext}`;
  }
  async function deleteUploadedImage(name) {
    if (!confirm(`업로드된 이미지 "${name}"를 삭제하시겠습니까?\n이 이미지를 사용 중인 차량/배너에서는 이미지가 빈 칸이 됩니다.`)) return;
    await DataLayer.removeUploadedImage(name);
    renderImages();
    populateImageSelect();
    populateBannerAddSelect();
    toast('이미지가 삭제되었습니다.');
  }

  /* ── 차량/배너 select 옵션 갱신 (이미지 업로드 후 호출) ── */
  function populateImageSelect() {
    const sel = $('#cf_image');
    if (!sel) return;
    const cur = sel.value;
    const opts = getImageOptions();
    sel.innerHTML = opts.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
    if (cur && opts.some(o => o.value === cur)) sel.value = cur;
  }
  function populateBannerAddSelect() {
    const addSel = $('#bannerAddSelect');
    if (!addSel) return;
    const opts = getBannerOptions().filter(o => !banners.includes(o.value));
    addSel.innerHTML = opts.length
      ? '<option value="" disabled selected>추가할 배너 이미지 선택</option>' +
        opts.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('')
      : '<option value="" disabled selected>추가 가능한 배너가 없습니다</option>';
    addSel.disabled = !opts.length;
    $('#bannerAddBtn').disabled = !opts.length;
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
    inquiries = await DataLayer.fetchInquiries();

    // populate image select for car form (파일 + 업로드 이미지)
    populateImageSelect();

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
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCarModal();
        closeInquiryModal();
      }
    });
    $('#carForm').addEventListener('submit', saveCarFromForm);

    // banners
    $('#bannerAddBtn').addEventListener('click', addBanner);
    $('#resetBannersBtn').addEventListener('click', resetAllBanners);

    // inquiries
    $('#inquirySearch').addEventListener('input', renderInquiries);
    $('#inquiryFilter').addEventListener('change', renderInquiries);
    $('#markAllReadBtn').addEventListener('click', markAllRead);
    $('#clearInquiriesBtn').addEventListener('click', clearAllInquiries);
    $('#inquiryModalClose').addEventListener('click', closeInquiryModal);
    $('#inquiryModalCancel').addEventListener('click', closeInquiryModal);
    $('#inquiryModal').addEventListener('click', (e) => { if (e.target.id === 'inquiryModal') closeInquiryModal(); });

    // settings
    $('#saveSettingsBtn').addEventListener('click', saveSettingsForm);
    $('#resetSettingsBtn').addEventListener('click', resetSettingsForm);

    // about
    $('#saveAboutBtn').addEventListener('click', saveAboutForm);
    $('#resetAboutBtn').addEventListener('click', resetAboutForm);

    // images upload
    $('#imgUploadBtn').addEventListener('click', () => $('#imgUploadInput').click());
    $('#imgUploadInput').addEventListener('change', (e) => {
      handleImageUpload(e.target.files);
      e.target.value = '';
    });

    renderCars();
    renderBanners();
    // 미읽음 뱃지 초기 갱신 (다른 탭이어도 표시)
    const unread = inquiries.filter(it => !it.isRead).length;
    const badge = $('#navInquiryBadge');
    if (badge) {
      if (unread > 0) { badge.hidden = false; badge.textContent = String(unread); }
      else badge.hidden = true;
    }
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
