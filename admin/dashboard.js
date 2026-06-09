/* ══════════════════════════════
   ADMIN DASHBOARD
   ──────────────────────────────
   현재 데이터 소스: localStorage (carDatabase, banner list)
   추후 백엔드 전환 시 dataLayer 함수만 교체하면 됨.
   ══════════════════════════════ */
(function () {
  'use strict';

  /* ══════════════════════════════
     DATA LAYER
     ──────────────────────────────
     MOCK_BACKEND=true  → localStorage (현재 데모 / GitHub Pages)
     MOCK_BACKEND=false → /api/*.php  (운영 — 서버 + 도메인 확보 후)
     스위치만 바꾸면 admin 전체가 백엔드 호출로 전환됨.
     ══════════════════════════════ */
  const API = (window.AdminAuth && window.AdminAuth.config && window.AdminAuth.config.API_BASE) || '/api';
  const USE_BACKEND = () => !!(window.AdminAuth && window.AdminAuth.config && window.AdminAuth.config.MOCK_BACKEND === false);

  async function apiGet(path) {
    const r = await AdminAuth.fetchAuthed(API + path);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || ('HTTP ' + r.status));
    return d;
  }
  async function apiSend(method, path, body) {
    const r = await AdminAuth.fetchAuthed(API + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body == null ? undefined : JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.message || ('HTTP ' + r.status));
    return d;
  }

  const DataLayer = {
    async fetchCars() {
      if (USE_BACKEND()) {
        const d = await apiGet('/cars.php');
        // 백엔드 응답을 window.carDatabase 에도 sync (다른 코드 호환)
        if (Array.isArray(d.cars)) window.carDatabase = d.cars;
        return d.cars || [];
      }
      return Array.isArray(window.carDatabase) ? window.carDatabase.slice() : [];
    },
    async saveCars(cars) {
      if (USE_BACKEND()) {
        // 운영: 추가/수정은 카드별로 호출, 여기서는 전체 sync 가 아니라 caller 가 개별 처리하도록 권장
        // 단순 fallback — POST 로 전체 교체는 비효율적이므로 caller 가 saveCar(car) 사용 권장
        return;
      }
      window.saveCarDatabase(cars);
    },
    async saveCar(car) {  // 신규 — admin 단일 차량 저장 (운영 모드 친화적)
      if (USE_BACKEND()) {
        if (car.id) return apiSend('PUT', '/cars.php?id=' + car.id, car);
        return apiSend('POST', '/cars.php', car);
      }
      // localStorage 모드 — 기존 saveCars 와 동일
      const list = Array.isArray(window.carDatabase) ? window.carDatabase.slice() : [];
      const idx = list.findIndex(c => c.id === car.id);
      if (idx >= 0) list[idx] = car; else list.push(car);
      window.saveCarDatabase(list);
    },
    async deleteCar(id) {
      if (USE_BACKEND()) return apiSend('DELETE', '/cars.php?id=' + id);
      const list = (window.carDatabase || []).filter(c => c.id !== id);
      window.saveCarDatabase(list);
    },
    async resetCars() {
      if (USE_BACKEND()) return; // 운영 모드는 기본값 복원 불가 (DB 직접 수정)
      window.resetCarDatabase();
    },
    // settings 계열 — 단일 key-value 헬퍼
    async fetchSetting(key, fallback) {
      if (USE_BACKEND()) {
        const d = await apiGet('/settings.php?key=' + encodeURIComponent(key));
        return d.value || fallback;
      }
      return fallback;
    },
    async saveSetting(key, value) {
      if (USE_BACKEND()) return apiSend('PUT', '/settings.php?key=' + encodeURIComponent(key), { value });
      // localStorage 는 각 loader 가 자체 키 사용 — 여기선 no-op
    },
    // 기존 localStorage 헬퍼는 그대로 유지 (역호환)
    async fetchBanners() {
      if (USE_BACKEND()) return (await this.fetchSetting('banners', [])) || [];
      return window.loadBanners();
    },
    async saveBanners(list) {
      if (USE_BACKEND()) return this.saveSetting('banners', list);
      window.saveBanners(list);
    },
    async resetBanners() {
      if (USE_BACKEND()) return;
      window.resetBanners();
    },
    async fetchInquiries() {
      if (USE_BACKEND()) {
        const d = await apiGet('/inquiries.php');
        return d.inquiries || [];
      }
      return window.loadInquiries();
    },
    async saveInquiries(list) {
      // 운영 모드: 개별 PUT/DELETE 권장 — 전체 교체 미지원
      if (USE_BACKEND()) return;
      window.saveInquiries(list);
    },
    async updateInquiry(id, patch) {
      if (USE_BACKEND()) return apiSend('PUT', '/inquiries.php?id=' + id, patch);
      const list = window.loadInquiries();
      const it = list.find(x => x.id === id);
      if (it) Object.assign(it, patch);
      window.saveInquiries(list);
    },
    async deleteInquiry(id) {
      if (USE_BACKEND()) return apiSend('DELETE', '/inquiries.php?id=' + id);
      window.saveInquiries(window.loadInquiries().filter(x => x.id !== id));
    },
    async fetchSettings() {
      if (USE_BACKEND()) return (await this.fetchSetting('site', window.DEFAULT_SETTINGS || {})) || {};
      return window.loadSettings();
    },
    async saveSettings(obj) {
      if (USE_BACKEND()) return this.saveSetting('site', obj);
      return window.saveSettings(obj);
    },
    async resetSettings() {
      if (USE_BACKEND()) return;
      window.resetSettings();
    },
    async fetchAbout() {
      if (USE_BACKEND()) return (await this.fetchSetting('about', window.DEFAULT_ABOUT || {})) || {};
      return window.loadAbout();
    },
    async saveAbout(obj) {
      if (USE_BACKEND()) return this.saveSetting('about', obj);
      return window.saveAbout(obj);
    },
    async resetAbout() {
      if (USE_BACKEND()) return;
      window.resetAbout();
    },
    async fetchUploadedImages() {
      // 운영 모드는 파일 시스템 + DB 메타로 관리되어 localStorage 와 모델이 다름 — 추후 확장
      return window.loadUploadedImages();
    },
    async addUploadedImage(name, dataUrl) {
      window.addUploadedImage(name, dataUrl);
    },
    async removeUploadedImage(name) {
      window.removeUploadedImage(name);
    },
  };

  /* ── 사용 가능한 이미지 목록 (images/ 폴더에 실제 존재해야 함)
     ─ 신규 차량/배너 파일은 1) 이 목록에 추가하거나
                         2) admin 의 "이미지 업로드" 탭으로 업로드하면 자동 노출됨 ── */
  const AVAILABLE_IMAGES = [
    // 경차·소형차
    'morning.webp', 'ray.webp', 'casper.webp',
    // 준중형
    'avante.webp', 'avante-2.webp',
    // 중형 세단
    'k5.webp', 'sonata.webp', 'sonata-edge.webp',
    // SUV
    'seltos.webp', 'sorento.webp', 'santafe.webp',
    // 미니밴
    'carnival.webp',
    // 대형/프리미엄
    'grandeur.webp', 'grandeur-2.webp', 'grandeur-gn7.webp', 'g80.webp',
  ].sort();
  const AVAILABLE_BANNERS = [
    'banner_1.webp', 'banner_2.webp', 'banner_3.webp', 'banner_4.webp', 'banner_5.webp',
  ];
  // 카테고리·기존 데이터에서 자동 발견된 이미지도 옵션에 포함 (하드코딩 누락 보완)
  function getAllKnownImages() {
    const set = new Set(AVAILABLE_IMAGES);
    (Array.isArray(window.carDatabase) ? window.carDatabase : []).forEach(c => {
      if (c && c.image && !/^uploaded:|^data:|^https?:/.test(c.image)) set.add(c.image);
    });
    return Array.from(set).sort();
  }

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
  async function setTab(name) {
    $$('.admin-nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $$('.tab-panel').forEach(p => p.hidden = (p.id !== 'tab-' + name));
    // 활성 패널의 모든 textarea 에 auto-grow + counter 적용
    requestAnimationFrame(() => {
      const panel = document.getElementById('tab-' + name);
      if (panel) enhanceAllTextareas(panel);
    });

    // 탭 전환 시 항상 최신 상태를 localStorage에서 다시 읽어옴
    // (공개 페이지에서의 변경, 다른 탭에서의 변경이 즉시 반영되도록)
    if (name === 'cars') {
      cars = await DataLayer.fetchCars();
      populateImageSelect();
      renderCars();
    }
    else if (name === 'banners') {
      banners = await DataLayer.fetchBanners();
      populateImageSelect();
      renderBanners();
    }
    else if (name === 'heroes') {
      renderHeroBanners();
    }
    else if (name === 'inquiries') {
      inquiries = await DataLayer.fetchInquiries();
      renderInquiries();
    }
    else if (name === 'overview') {
      cars = await DataLayer.fetchCars();
      renderOverview();
    }
    else if (name === 'settings') renderSettingsForm();
    else if (name === 'about') renderAboutForm();
    else if (name === 'business') renderBusinessForm();
    else if (name === 'faq') renderFaq();
    else if (name === 'info') renderInfoForm();
    else if (name === 'formopts') renderFormOpts();
    else if (name === 'legal') renderLegalForm();
    else if (name === 'images') renderImages();
  }

  /* ── 이미지 옵션 (파일 + 업로드) ─────────────────── */
  function getImageOptions() {
    const uploads = Object.keys(window.loadUploadedImages());
    return [
      ...getAllKnownImages().map(f => ({ value: f, label: f })),
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
            <button class="btn btn-ghost btn-sm" data-action="preview" title="이 차량의 상세 페이지를 새 창으로 열기">상세</button>
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
        else if (btn.dataset.action === 'preview') openDetailPreview(id);
      });
    });
  }

  function categoryLabel(c) {
    return ({ monthly: '월렌트', longterm: '기간약정', used: '중고차' })[c] || c;
  }

  /* ── CARS CRUD ────────────────────────────────────── */
  /* ──────────────────────────────────────────
     상세 페이지 iframe 미리보기 모달
     ────────────────────────────────────────── */
  function openDetailPreview(carId) {
    const id = parseInt(carId, 10);
    if (!id) return;
    const car = cars.find(c => c.id === id);
    const titleEl  = $('#detailPreviewTitle');
    const frame    = $('#detailPreviewFrame');
    const openLink = $('#detailPreviewOpenLink');
    const modal    = $('#detailPreviewModal');
    const viewport = $('#detailPreviewViewport');
    if (!frame || !modal) return;
    if (titleEl) titleEl.textContent = car ? `상세 페이지 미리보기 — ${car.name}` : '상세 페이지 미리보기';
    const url = `../detail.html?id=${id}&from=monthly&preview=admin`;
    frame.src = url;
    if (openLink) openLink.href = url;
    if (viewport) {
      viewport.value = '100%';
      frame.style.maxWidth = '100%';
    }
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDetailPreview() {
    const modal = $('#detailPreviewModal');
    const frame = $('#detailPreviewFrame');
    if (modal) modal.classList.remove('open');
    if (frame) frame.src = 'about:blank';  // 메모리 해제 (이전 페이지 unload)
    document.body.style.overflow = '';
  }

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
    // 신규 필드 — detail.html 에서 사용
    $('#cf_fuelType').value = car ? (car.fuelType || '') : '';
    $('#cf_transmission').value = car ? (car.transmission || '') : '';
    $('#cf_seats').value = car ? (car.seats || '') : '';
    $('#cf_mileage').value = car ? (car.mileage || '') : '';
    $('#cf_description').value = car ? (car.description || '') : '';
    $('#cf_features').value = car ? ((car.features || []).join(', ')) : '';
    $('#cf_detailImage').value = car ? (car.detailImage || '') : '';
    // 통계
    $('#cf_views').value = car ? (car.views || 0) : 0;
    $('#cf_inquiries').value = car ? (car.inquiries || 0) : 0;
    $('#cf_contracts').value = car ? (car.contracts || 0) : 0;

    $$('input[name="cf_cat"]').forEach(cb => {
      cb.checked = car ? (car.category || []).includes(cb.value) : false;
    });

    // 새로 추가/수정 시 옵션 목록도 최신화 + 미리보기 갱신 (메인 + 상세 모두)
    populateImageSelect();
    if (car && car.image) {
      $('#cf_image').value = car.image;
      updateImagePreview('cfImagePreview', car.image);
    } else {
      updateImagePreview('cfImagePreview', $('#cf_image').value);
    }
    updateImagePreview('cfDetailImagePreview', $('#cf_detailImage').value);

    // 미리보기 버튼은 기존 차량 편집 시에만 사용 가능 (새 차량은 ID 없음)
    const previewBtn = $('#cfPreviewDetailBtn');
    if (previewBtn) previewBtn.style.display = id ? '' : 'none';

    $('#carModal').classList.add('open');
    // 모달 본문 스크롤 위치 초기화
    const body = $('#carModal .modal-body');
    if (body) body.scrollTop = 0;
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
    if (isNaN(price) || price <= 0) return toast('가격을 1원 이상으로 입력해주세요.', 'error');
    // 연식·인원·주행거리 추가 검증 (음수 차단)
    const yrV = parseInt($('#cf_year').value, 10);
    if ($('#cf_year').value && (isNaN(yrV) || yrV < 1990 || yrV > 2099)) return toast('연식은 1990~2099 사이로 입력해주세요.', 'error');
    const seatsV = parseInt($('#cf_seats').value, 10);
    if ($('#cf_seats').value && (isNaN(seatsV) || seatsV < 1 || seatsV > 20)) return toast('승차 인원은 1~20명 사이로 입력해주세요.', 'error');
    const mileageV = parseInt($('#cf_mileage').value, 10);
    if ($('#cf_mileage').value && (isNaN(mileageV) || mileageV < 0)) return toast('주행거리는 0 이상의 숫자로 입력해주세요.', 'error');
    if (!cats.length) return toast('카테고리를 최소 1개 선택해주세요.', 'error');

    const features = ($('#cf_features').value || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      id: id || nextId(cars),
      name,
      year: yr || undefined,
      price,
      badge: $('#cf_badge').value.trim() || undefined,
      image: $('#cf_image').value,
      category: cats,
      tags,
      // detail.html 노출 필드
      fuelType:     $('#cf_fuelType').value     || undefined,
      transmission: $('#cf_transmission').value || undefined,
      seats:        parseInt($('#cf_seats').value, 10)   || undefined,
      mileage:      parseInt($('#cf_mileage').value, 10) || undefined,
      description:  $('#cf_description').value.trim() || undefined,
      features:     features.length ? features : undefined,
      detailImage:  $('#cf_detailImage').value || undefined,
      // 통계
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

  /* ══════════════════════════════
     BANNERS — 메인 슬라이드 (PC + 모바일 변형)
     ══════════════════════════════ */
  function getBannerMobileAuto(image) {
    // banner_N.webp / banner_N.png → banner_mobile_N.webp 자동 매핑 (없을 때만)
    const m = String(image).match(/^banner_([1-5])\.(webp|png|jpg)$/);
    return m ? `banner_mobile_${m[1]}.webp` : '';
  }
  function getBannerMeta(image) {
    const meta = window.loadBannerMeta();
    return meta[image] || {};
  }
  function saveBannerMetaFor(image, patch) {
    const meta = window.loadBannerMeta();
    meta[image] = Object.assign({}, meta[image] || {}, patch);
    window.saveBannerMeta(meta);
  }
  function renderBanners() {
    const list = $('#bannerListV2');
    if (!list) return;
    if (!banners.length) {
      list.innerHTML = '<div class="empty">표시할 배너가 없습니다. 우측 상단 "+ 배너 추가" 버튼으로 시작하세요.</div>';
      return;
    }
    list.innerHTML = banners.map((image, i) => {
      const meta = getBannerMeta(image);
      const mobile = meta.mobileImage || getBannerMobileAuto(image);
      const isAutoMobile = !meta.mobileImage && mobile;
      return `
        <div class="banner-card" data-idx="${i}">
          <div class="banner-card-head">
            <strong class="banner-card-order">슬라이드 ${i + 1}</strong>
            <div class="banner-card-actions">
              <button class="icon-btn" data-act="up" ${i === 0 ? 'disabled' : ''} title="위로 이동">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
              </button>
              <button class="icon-btn" data-act="down" ${i === banners.length - 1 ? 'disabled' : ''} title="아래로 이동">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <button class="icon-btn icon-btn-danger" data-act="del" title="이 슬라이드 제거">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
              </button>
            </div>
          </div>
          <div class="banner-card-row">
            <div class="banner-pick">
              <label>PC 배너 <span class="lab-spec">(권장 2400 × 608)</span></label>
              <div class="image-picker">
                <select data-act="desktop"></select>
                <button type="button" class="btn btn-ghost btn-sm" data-act="upload-desktop">업로드</button>
                <input type="file" data-act="upload-desktop-input" accept="image/*" hidden>
              </div>
              <div class="image-preview hero-prev" data-prev="desktop" style="${image ? `background-image:url('${imageUrl(image)}')` : ''}"></div>
            </div>
            <div class="banner-pick">
              <label>모바일 배너 <span class="lab-spec">(권장 800 × 1423)</span> ${isAutoMobile ? '<span class="auto-tag" title="banner_N → banner_mobile_N 자동 매핑">자동</span>' : ''}</label>
              <div class="image-picker">
                <select data-act="mobile"></select>
                <button type="button" class="btn btn-ghost btn-sm" data-act="upload-mobile">업로드</button>
                <input type="file" data-act="upload-mobile-input" accept="image/*" hidden>
              </div>
              <div class="image-preview hero-prev hero-prev--mobile" data-prev="mobile" style="${mobile ? `background-image:url('${imageUrl(mobile)}')` : ''}"></div>
            </div>
          </div>
          <div class="banner-card-row banner-card-row--meta">
            <div class="field"><label>이미지 alt (SEO/접근성)</label>
              <input type="text" data-act="alt" value="${escapeHtml(meta.alt || '')}" placeholder="배너 ${i+1}">
            </div>
            <div class="field"><label>클릭 이동 URL (선택)</label>
              <input type="text" data-act="url" value="${escapeHtml(meta.url || '')}" placeholder="https://... 또는 quote.html">
            </div>
          </div>
        </div>
      `;
    }).join('');

    // populate 모든 select (모든 카드 동일 옵션 리스트)
    const opts = getImageOptions();
    const optsHtml = (selected, allowEmpty) => (allowEmpty ? '<option value="">(자동 매핑 / 사용 안 함)</option>' : '') +
      opts.map(o => `<option value="${escapeHtml(o.value)}"${o.value === selected ? ' selected' : ''}>${escapeHtml(o.label)}</option>`).join('');

    list.querySelectorAll('.banner-card').forEach(card => {
      const idx = parseInt(card.dataset.idx, 10);
      const image = banners[idx];
      const meta = getBannerMeta(image);
      const mobile = meta.mobileImage || '';
      card.querySelector('select[data-act="desktop"]').innerHTML = optsHtml(image, false);
      card.querySelector('select[data-act="mobile"]').innerHTML  = optsHtml(mobile, true);

      // 인터랙션
      card.querySelectorAll('button[data-act]').forEach(btn => {
        const act = btn.dataset.act;
        btn.addEventListener('click', async () => {
          if (act === 'up' && idx > 0) {
            [banners[idx-1], banners[idx]] = [banners[idx], banners[idx-1]];
            await DataLayer.saveBanners(banners); renderBanners();
          } else if (act === 'down' && idx < banners.length - 1) {
            [banners[idx+1], banners[idx]] = [banners[idx], banners[idx+1]];
            await DataLayer.saveBanners(banners); renderBanners();
          } else if (act === 'del') {
            if (!confirm(`슬라이드 ${idx+1} 을(를) 제거하시겠습니까?`)) return;
            banners.splice(idx, 1);
            await DataLayer.saveBanners(banners); renderBanners();
            toast('배너가 제거되었습니다.');
          } else if (act === 'upload-desktop' || act === 'upload-mobile') {
            const variant = act.replace('upload-', '');
            const fileIn = card.querySelector(`input[data-act="upload-${variant}-input"]`);
            fileIn.click();
          }
        });
      });
      // 파일 input
      card.querySelectorAll('input[type="file"]').forEach(fileIn => {
        const variant = fileIn.dataset.act.replace('upload-', '').replace('-input', '');
        fileIn.addEventListener('change', async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          // PC=1920 / 모바일=900
          const maxDim = variant === 'mobile' ? 900 : 1920;
          const opt = await window.optimizeImageFile(file, { maxDim, quality: 0.82 });
          const map = window.loadUploadedImages();
          const name = uniqueImageName(map, opt.name);
          map[name] = opt.dataUrl;
          window.saveUploadedImages(map);
          const newVal = 'uploaded:' + name;
          if (variant === 'desktop') {
            // 데스크탑 변경 = banners[idx] 자체를 바꿈 + 기존 meta 보존
            const oldImage = banners[idx];
            const oldMeta  = window.loadBannerMeta()[oldImage];
            banners[idx] = newVal;
            if (oldMeta) saveBannerMetaFor(newVal, oldMeta);
            await DataLayer.saveBanners(banners);
          } else {
            // 모바일 변경 = meta.mobileImage 업데이트
            saveBannerMetaFor(banners[idx], { mobileImage: newVal });
          }
          renderBanners();
          toast(`업로드 완료 — ${name}`);
          fileIn.value = '';
        });
      });
      // select 변경
      card.querySelector('select[data-act="desktop"]').addEventListener('change', async (e) => {
        const newVal = e.target.value;
        const oldImage = banners[idx];
        const oldMeta  = window.loadBannerMeta()[oldImage];
        banners[idx] = newVal;
        if (oldMeta) saveBannerMetaFor(newVal, oldMeta);
        await DataLayer.saveBanners(banners);
        renderBanners();
      });
      card.querySelector('select[data-act="mobile"]').addEventListener('change', (e) => {
        saveBannerMetaFor(banners[idx], { mobileImage: e.target.value });
        renderBanners();
      });
      card.querySelector('input[data-act="alt"]').addEventListener('change', (e) => {
        saveBannerMetaFor(banners[idx], { alt: e.target.value });
      });
      card.querySelector('input[data-act="url"]').addEventListener('change', (e) => {
        saveBannerMetaFor(banners[idx], { url: e.target.value.trim() });
      });
    });
  }

  async function addBanner() {
    // 신규 슬라이드는 기본 안내 이미지로 추가 (관리자가 곧바로 desktop 업로드 가능)
    const opts = getImageOptions();
    const defaultImage = (opts.find(o => o.value.startsWith('banner_')) || opts[0] || { value: 'banner_1.webp' }).value;
    banners.push(defaultImage);
    await DataLayer.saveBanners(banners);
    renderBanners();
    // 추가된 카드로 스크롤
    const list = $('#bannerListV2');
    if (list) {
      const last = list.querySelector('.banner-card:last-child');
      if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    toast('새 슬라이드가 추가되었습니다. PC/모바일 이미지를 지정해주세요.');
  }

  async function resetAllBanners() {
    if (!confirm('배너 설정을 기본값으로 복원하시겠습니까?\n(슬라이드 순서, 모바일 매핑, alt, URL 모두 초기화)')) return;
    await DataLayer.resetBanners();
    // 메타도 초기화
    try { localStorage.removeItem('rentcar_banner_meta'); } catch (e) {}
    banners = await DataLayer.fetchBanners();
    renderBanners();
    toast('기본값으로 복원되었습니다.');
  }

  /* ══════════════════════════════
     HERO BANNERS (서브페이지: 월렌트/12개월/중고차)
     ══════════════════════════════ */
  const HERO_PAGES = [
    { key: 'monthly',  label: '월렌트',          page: 'monthly.html' },
    { key: 'longterm', label: '12개월 기간약정', page: 'longterm.html' },
    { key: 'used',     label: '중고차 장기렌트', page: 'used.html' },
  ];
  let heroState = null;
  function renderHeroBanners() {
    heroState = window.loadHeroBanners();
    const grid = $('#heroBannerGrid');
    if (!grid) return;
    const opts = getImageOptions();
    const optsHtml = (selected) => '<option value="">(기본값 유지)</option>' +
      opts.map(o => `<option value="${escapeHtml(o.value)}"${o.value === selected ? ' selected' : ''}>${escapeHtml(o.label)}</option>`).join('');

    grid.innerHTML = HERO_PAGES.map(p => {
      const cur = heroState[p.key] || {};
      return `
        <div class="hero-card" data-key="${p.key}">
          <div class="hero-card-head">
            <strong>${p.label}</strong>
            <a href="../${p.page}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">새 창에서 확인</a>
          </div>
          <div class="hero-card-row">
            <div class="hero-pick">
              <label>PC 배너 (가로)</label>
              <div class="image-picker">
                <select data-act="desktop">${optsHtml(cur.desktop)}</select>
                <button type="button" class="btn btn-ghost btn-sm" data-act="upload-desktop">업로드</button>
                <input type="file" data-act="upload-desktop-input" accept="image/*" hidden>
              </div>
              <div class="image-preview hero-prev" data-prev="desktop" style="${cur.desktop ? `background-image:url('${imageUrl(cur.desktop)}')` : ''}"></div>
            </div>
            <div class="hero-pick">
              <label>모바일 배너 (세로)</label>
              <div class="image-picker">
                <select data-act="mobile">${optsHtml(cur.mobile)}</select>
                <button type="button" class="btn btn-ghost btn-sm" data-act="upload-mobile">업로드</button>
                <input type="file" data-act="upload-mobile-input" accept="image/*" hidden>
              </div>
              <div class="image-preview hero-prev hero-prev--mobile" data-prev="mobile" style="${cur.mobile ? `background-image:url('${imageUrl(cur.mobile)}')` : ''}"></div>
            </div>
          </div>
          <div class="hero-card-row">
            <div class="field" style="flex:1">
              <label>이미지 대체 텍스트 (alt — SEO/접근성)</label>
              <input type="text" data-act="alt" value="${escapeHtml(cur.alt || '')}" placeholder="${escapeHtml(p.label)}">
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Wire interactions per card
    grid.querySelectorAll('.hero-card').forEach(card => {
      const key = card.dataset.key;
      card.querySelectorAll('select[data-act], input[data-act="alt"]').forEach(el => {
        el.addEventListener('change', () => {
          heroState[key] = heroState[key] || {};
          heroState[key][el.dataset.act] = el.value;
          // 미리보기 갱신
          if (el.tagName === 'SELECT') {
            const prev = card.querySelector(`.image-preview[data-prev="${el.dataset.act}"]`);
            if (prev) prev.style.backgroundImage = el.value ? `url('${imageUrl(el.value)}')` : '';
          }
          // 즉시 저장 — 사용자가 "저장" 버튼 안 눌러도 안전
          window.saveHeroBanners(heroState);
        });
      });
      // 업로드 버튼들
      card.querySelectorAll('button[data-act^="upload-"]').forEach(btn => {
        const variant = btn.dataset.act.replace('upload-', ''); // desktop | mobile
        const fileIn = card.querySelector(`input[data-act="upload-${variant}-input"]`);
        if (!fileIn) return;
        btn.addEventListener('click', () => fileIn.click());
        fileIn.addEventListener('change', async (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          // PC = 가로 1920 max, 모바일 = 가로 900 max
          const maxDim = variant === 'mobile' ? 900 : 1920;
          // 업로드 → 새 옵션이 select 에 자동 포함되도록 패널 재렌더 후 값 셋
          const opt = await window.optimizeImageFile(file, { maxDim, quality: 0.82 });
          const map = window.loadUploadedImages();
          const name = uniqueImageName(map, opt.name);
          map[name] = opt.dataUrl;
          window.saveUploadedImages(map);
          // state 갱신 + 즉시 저장
          heroState[key] = heroState[key] || {};
          heroState[key][variant] = 'uploaded:' + name;
          window.saveHeroBanners(heroState);
          // 패널 전체 재렌더 (모든 select 가 새 옵션 포함하도록)
          renderHeroBanners();
          fileIn.value = '';
          toast(`업로드 완료 — ${name}`);
        });
      });
    });
  }
  async function saveHeroBanners() {
    if (!heroState) heroState = window.loadHeroBanners();
    window.saveHeroBanners(heroState);
    toast('히어로 배너가 저장되었습니다. 공개 페이지에서 새로고침하면 반영됩니다.');
  }
  function resetHeroBanners() {
    if (!confirm('서브페이지 히어로 배너를 기본값으로 복원하시겠습니까?')) return;
    window.resetHeroBanners();
    renderHeroBanners();
    toast('기본값으로 복원되었습니다.');
  }

  /* ── OVERVIEW ─────────────────────────────────────── */
  function renderOverview() {
    $('#statCarsTotal').textContent = cars.length;
    $('#statMonthly').textContent = cars.filter(c => (c.category || []).includes('monthly')).length;
    $('#statLongterm').textContent = cars.filter(c => (c.category || []).includes('longterm')).length;
    $('#statUsed').textContent = cars.filter(c => (c.category || []).includes('used')).length;

    // 신규 방문/초기화 직후 빈 상태 방지용 시드 (공개 사이트와 동일 로직)
    if (typeof window.seedActivityIfEmpty === 'function') window.seedActivityIfEmpty();

    const engine = new window.Top5RankingEngine();
    const top5 = engine.getWeeklyTopN(cars);
    $('#top5Body').innerHTML = top5.map((c, i) => `
      <tr>
        <td><strong>${i + 1}</strong></td>
        <td>${escapeHtml(c.name)}</td>
        <td>${(c.weeklyViews     || 0).toLocaleString()}</td>
        <td>${(c.weeklyInquiries || 0).toLocaleString()}</td>
        <td>${(c.weeklyContracts || 0).toLocaleString()}</td>
        <td>${(c.score || 0).toFixed(3)}</td>
      </tr>
    `).join('') || '<tr><td colspan="6" class="empty">데이터가 없습니다.</td></tr>';
  }

  async function resetActivityLog() {
    if (!confirm('금주 TOP 5 의 기반이 되는 조회·문의·계약 활동 로그를 모두 초기화하시겠습니까?\n새로 방문이 발생하면 다시 누적됩니다.')) return;
    if (typeof window.resetActivity === 'function') window.resetActivity();
    renderOverview();
    toast('활동 로그가 초기화되었습니다.');
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

  const STATUS_DEFS = {
    new:        { label: '신규',     cls: 'status-new' },
    contacted:  { label: '상담중',   cls: 'status-contacted' },
    quoted:     { label: '견적완료', cls: 'status-quoted' },
    contracted: { label: '계약완료', cls: 'status-contracted' },
    cancelled:  { label: '취소',     cls: 'status-cancelled' },
  };
  function statusOf(it) { return it.status || (it.isRead ? 'contacted' : 'new'); }
  function statusBadge(s) {
    const d = STATUS_DEFS[s] || STATUS_DEFS.new;
    return `<span class="status-pill ${d.cls}">${d.label}</span>`;
  }
  function statusSelect(currentStatus, idAttr) {
    return `<select class="status-sel" data-action="status" data-id="${idAttr}">
      ${Object.entries(STATUS_DEFS).map(([k,v]) =>
        `<option value="${k}" ${k === currentStatus ? 'selected' : ''}>${v.label}</option>`
      ).join('')}
    </select>`;
  }

  function renderInquiries() {
    const search = ($('#inquirySearch').value || '').trim().toLowerCase();
    const filter = $('#inquiryFilter').value;
    const statusF = $('#inquiryStatusFilter') ? $('#inquiryStatusFilter').value : '';
    const tbody = $('#inquiriesBody');

    const filtered = inquiries.filter(it => {
      if (filter === 'unread' && it.isRead) return false;
      if (filter === 'read' && !it.isRead) return false;
      if (statusF && statusOf(it) !== statusF) return false;
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

    tbody.innerHTML = filtered.map(it => {
      const st = statusOf(it);
      return `
        <tr data-id="${it.id}" class="${it.isRead ? '' : 'row-unread'}">
          <td>${it.isRead ? '' : '<span class="dot-unread" title="미읽음"></span>'}</td>
          <td>${formatDateShort(it.createdAt)}</td>
          <td>${statusSelect(st, it.id)}</td>
          <td><strong>${escapeHtml(it.carName || '-')}</strong>${it.category ? ' <span class="cat-pill">'+escapeHtml(it.category)+'</span>' : ''}</td>
          <td>${escapeHtml(it.name || '-')}</td>
          <td><a href="tel:${escapeHtml(String(it.phone||'').replace(/[^0-9+]/g,''))}" style="color:inherit">${escapeHtml(it.phone || '-')}</a></td>
          <td>${escapeHtml(it.source || '-')}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-ghost btn-sm" data-action="view">상세</button>
              <button class="btn btn-danger-ghost btn-sm" data-action="delete">삭제</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.closest('tr').dataset.id, 10);
        if (btn.dataset.action === 'view') openInquiryModal(id);
        else if (btn.dataset.action === 'delete') deleteInquiry(id);
      });
    });
    tbody.querySelectorAll('select.status-sel').forEach(sel => {
      sel.addEventListener('click', e => e.stopPropagation());
      sel.addEventListener('change', () => {
        const id = parseInt(sel.dataset.id, 10);
        const it = inquiries.find(x => x.id === id);
        if (!it) return;
        it.status = sel.value;
        if (sel.value !== 'new') it.isRead = true;  // 상태가 진행되면 자동 읽음 처리
        DataLayer.saveInquiries(inquiries);
        renderInquiries();
      });
    });
  }

  function exportInquiriesCsv() {
    if (!inquiries.length) return toast('내보낼 문의가 없습니다.', 'error');
    const cols = ['id','createdAt','status','isRead','source','type','category','carName','name','phone','region','period','startDate','experience','message'];
    const head = ['ID','접수일','상태','읽음','출처','유형','카테고리','차량명','이름','연락처','지역','기간','희망일','경력','메시지'];
    const esc = v => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };
    const rows = [head.map(esc).join(',')];
    inquiries.forEach(it => {
      const r = cols.map(c => {
        if (c === 'status') return statusOf(it);
        if (c === 'isRead') return it.isRead ? '읽음' : '미읽음';
        if (c === 'createdAt') return formatDateShort(it.createdAt);
        return it[c];
      });
      rows.push(r.map(esc).join(','));
    });
    // BOM 추가 — 엑셀에서 한글 깨짐 방지
    const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `inquiries_${ts}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`${inquiries.length}건 CSV 내보내기 완료`);
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
    'defaultDetailBanner',
  ];
  function renderSettingsForm() {
    const s = window.loadSettings();
    SETTING_FIELDS.forEach(k => {
      const el = $('#set_' + k);
      if (el) el.value = s[k] != null ? s[k] : '';
    });
    // 기본 안내 배너 select 옵션 채우기 + 미리보기
    const sel = $('#set_defaultDetailBanner');
    if (sel) {
      const opts = getImageOptions();
      const cur = sel.value;
      sel.innerHTML = '<option value="">(없음 — 비어둠)</option>'
        + opts.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
      if (cur && opts.some(o => o.value === cur)) sel.value = cur;
      updateSetDetailBannerPreview(sel.value);
    }
  }

  function updateSetDetailBannerPreview(value) {
    const prev = $('#setDetailBannerPreview');
    if (!prev) return;
    if (value) {
      prev.hidden = false;
      prev.style.backgroundImage = `url('${imageUrl(value)}')`;
    } else {
      prev.hidden = true;
      prev.style.backgroundImage = '';
    }
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
     BUSINESS INFO (사업자 정보)
     ══════════════════════════════ */
  const BIZ_FIELDS = ['companyName','ceoName','bizRegNumber','onlineSalesNumber','industry','address','contactEmail','privacyOfficerName','privacyEmail','privacyPhone'];
  function renderBusinessForm() {
    if (typeof window.loadBusiness !== 'function') return;
    const b = window.loadBusiness();
    BIZ_FIELDS.forEach(k => { const el = $('#biz_' + k); if (el) el.value = b[k] || ''; });
  }
  function saveBusinessForm() {
    const data = {};
    BIZ_FIELDS.forEach(k => { const el = $('#biz_' + k); if (el) data[k] = el.value.trim(); });
    window.saveBusiness(data);
    toast('사업자 정보가 저장되었습니다.');
  }
  function resetBusinessForm() {
    if (!confirm('사업자 정보를 기본값으로 복원하시겠습니까?')) return;
    window.resetBusiness();
    renderBusinessForm();
    toast('기본값으로 복원되었습니다.');
  }

  /* ══════════════════════════════
     FAQ (자주 묻는 질문)
     ══════════════════════════════ */
  let faqList = [];
  function renderFaq() {
    const wrap = $('#faqList');
    if (!wrap) return;
    faqList = window.loadFaq();
    if (!faqList.length) {
      wrap.innerHTML = '<div class="empty">등록된 질문이 없습니다. 우측 상단에서 추가하세요.</div>';
      return;
    }
    wrap.innerHTML = faqList.map((f, i) => `
      <div class="faq-edit-item info-edit-item" data-idx="${i}">
        <div class="seq-edit-head">
          <span class="seq-edit-num">Q${i + 1}</span>
          <strong class="seq-edit-label">자주 묻는 질문</strong>
          <div class="seq-edit-actions">
            <button class="icon-btn" data-act="up"   ${i === 0 ? 'disabled' : ''} title="위로" aria-label="위로">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="icon-btn" data-act="down" ${i === faqList.length-1 ? 'disabled' : ''} title="아래로" aria-label="아래로">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button class="icon-btn icon-btn-danger" data-act="del" title="제거" aria-label="제거">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
        <div class="field">
          <label>질문 (Q)</label>
          <input type="text" class="faq-q-input" data-act="q" value="${escapeHtml(f.q)}" placeholder="예) 견적 신청 후 답변까지 얼마나 걸리나요?">
        </div>
        <div class="field">
          <label>답변 (A)</label>
          <textarea class="faq-a-input" data-act="a" rows="3" placeholder="답변 내용을 작성하세요.">${escapeHtml(f.a)}</textarea>
        </div>
      </div>
    `).join('');

    wrap.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.closest('.faq-edit-item').dataset.idx, 10);
        const a = btn.dataset.act;
        if (a === 'up' && idx > 0) { [faqList[idx-1], faqList[idx]] = [faqList[idx], faqList[idx-1]]; }
        else if (a === 'down' && idx < faqList.length-1) { [faqList[idx+1], faqList[idx]] = [faqList[idx], faqList[idx+1]]; }
        else if (a === 'del') {
          if (!confirm(`Q${idx+1} 항목을 삭제하시겠습니까?`)) return;
          faqList.splice(idx, 1);
        }
        window.saveFaq(faqList);
        renderFaq();
      });
    });
    wrap.querySelectorAll('input.faq-q-input, textarea.faq-a-input').forEach(el => {
      el.addEventListener('change', () => {
        const idx = parseInt(el.closest('.faq-edit-item').dataset.idx, 10);
        const k = el.dataset.act;
        faqList[idx][k] = el.value;
        window.saveFaq(faqList);
      });
    });
    enhanceAllTextareas(wrap);
  }
  function addFaqItem() {
    faqList = window.loadFaq();
    faqList.push({ q: '새 질문', a: '답변을 입력해주세요.' });
    window.saveFaq(faqList);
    renderFaq();
  }
  function resetFaq() {
    if (!confirm('FAQ를 기본값으로 복원하시겠습니까?')) return;
    window.resetFaq();
    renderFaq();
    toast('기본값으로 복원되었습니다.');
  }

  /* ══════════════════════════════
     INFO PAGE (이용안내)
     ══════════════════════════════ */
  let infoState = null;
  function renderInfoForm() {
    infoState = window.loadInfo();
    $('#info_intro').value = infoState.intro || '';
    const list = $('#infoSectionList');
    if (!list) return;
    if (!infoState.sections.length) {
      list.innerHTML = '<div class="empty">섹션이 없습니다. 우측 상단에서 추가하세요.</div>';
      return;
    }
    list.innerHTML = infoState.sections.map((s, i) => `
      <div class="info-edit-item" data-idx="${i}">
        <div class="seq-edit-head">
          <span class="seq-edit-num">${i + 1}</span>
          <strong class="seq-edit-label">섹션</strong>
          <div class="seq-edit-actions">
            <button class="icon-btn" data-act="up"   ${i === 0 ? 'disabled' : ''} title="위로" aria-label="위로">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="icon-btn" data-act="down" ${i === infoState.sections.length-1 ? 'disabled' : ''} title="아래로" aria-label="아래로">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button class="icon-btn icon-btn-danger" data-act="del" title="제거" aria-label="제거">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
        <div class="field">
          <label>제목</label>
          <input type="text" data-act="title" value="${escapeHtml(s.title)}" placeholder="예) 3. 필요 서류">
        </div>
        <div class="field">
          <label>본문</label>
          <textarea data-act="body" rows="3" placeholder="이 섹션에 노출될 본문 내용을 작성하세요. 줄바꿈은 그대로 표시됩니다.">${escapeHtml(s.body)}</textarea>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.closest('.info-edit-item').dataset.idx, 10);
        const a = btn.dataset.act;
        if (a === 'up' && idx > 0) [infoState.sections[idx-1], infoState.sections[idx]] = [infoState.sections[idx], infoState.sections[idx-1]];
        else if (a === 'down' && idx < infoState.sections.length-1) [infoState.sections[idx+1], infoState.sections[idx]] = [infoState.sections[idx], infoState.sections[idx+1]];
        else if (a === 'del') { if (!confirm('이 섹션을 삭제할까요?')) return; infoState.sections.splice(idx, 1); }
        renderInfoForm();
      });
    });
    list.querySelectorAll('input[data-act], textarea[data-act]').forEach(el => {
      el.addEventListener('input', () => {
        const idx = parseInt(el.closest('.info-edit-item').dataset.idx, 10);
        infoState.sections[idx][el.dataset.act] = el.value;
      });
    });
    // 새로 그려진 textarea 에 auto-grow + counter 적용
    enhanceAllTextareas(list);
  }
  function addInfoSection() {
    infoState = infoState || window.loadInfo();
    infoState.sections.push({ title: '새 섹션', body: '내용을 입력하세요.' });
    renderInfoForm();
  }
  function saveInfoForm() {
    if (!infoState) return;
    infoState.intro = $('#info_intro').value;
    window.saveInfo(infoState);
    toast('이용안내가 저장되었습니다.');
  }
  function resetInfoForm() {
    if (!confirm('이용안내를 기본값으로 복원하시겠습니까?')) return;
    window.resetInfo();
    renderInfoForm();
    toast('기본값으로 복원되었습니다.');
  }

  /* ══════════════════════════════
     CHIP EDITOR — 재사용 가능한 칩 컴포넌트
     ──────────────────────────────
     사용:  <div class="chip-editor" data-key="..." data-placeholder="..."></div>
     상태:  el._items = []  (외부에서 readChipEditor(el) 로 항상 최신 배열 읽기)
     ══════════════════════════════ */
  function mountChipEditor(el, initial) {
    if (!el) return;
    el._items = Array.isArray(initial) ? initial.slice() : [];
    const placeholder = el.dataset.placeholder || '항목 추가';
    el.innerHTML = `
      <div class="chip-list" data-role="list"></div>
      <div class="chip-add">
        <input type="text" placeholder="${escapeHtml(placeholder)}" data-role="input">
        <button type="button" class="chip-add-btn" data-role="add" title="추가 (Enter)" aria-label="추가">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
    `;
    const listEl  = el.querySelector('[data-role="list"]');
    const inputEl = el.querySelector('[data-role="input"]');
    const addEl   = el.querySelector('[data-role="add"]');

    function repaint() {
      if (!el._items.length) {
        listEl.innerHTML = '<div class="chip-empty">등록된 항목이 없습니다. 아래에서 추가해주세요.</div>';
        return;
      }
      listEl.innerHTML = el._items.map((v, i) => `
        <span class="chip" data-idx="${i}" draggable="true">
          <button type="button" class="chip-move chip-move-up"   ${i === 0 ? 'disabled' : ''} title="위로" aria-label="위로">▲</button>
          <button type="button" class="chip-move chip-move-down" ${i === el._items.length - 1 ? 'disabled' : ''} title="아래로" aria-label="아래로">▼</button>
          <span class="chip-text">${escapeHtml(v)}</span>
          <button type="button" class="chip-del" title="제거" aria-label="제거">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
          </button>
        </span>
      `).join('');
      // 핸들러 바인딩
      listEl.querySelectorAll('.chip').forEach(chip => {
        const idx = parseInt(chip.dataset.idx, 10);
        chip.querySelector('.chip-del').addEventListener('click', () => {
          el._items.splice(idx, 1); repaint(); el.dispatchEvent(new Event('chip-change'));
        });
        chip.querySelector('.chip-move-up').addEventListener('click', () => {
          if (idx === 0) return;
          [el._items[idx - 1], el._items[idx]] = [el._items[idx], el._items[idx - 1]];
          repaint(); el.dispatchEvent(new Event('chip-change'));
        });
        chip.querySelector('.chip-move-down').addEventListener('click', () => {
          if (idx === el._items.length - 1) return;
          [el._items[idx + 1], el._items[idx]] = [el._items[idx], el._items[idx + 1]];
          repaint(); el.dispatchEvent(new Event('chip-change'));
        });
        // 더블클릭으로 즉시 인라인 편집
        chip.querySelector('.chip-text').addEventListener('dblclick', (e) => {
          const cur = el._items[idx];
          const next = prompt('항목 편집', cur);
          if (next === null) return;
          const v = next.trim();
          if (!v) return;
          el._items[idx] = v; repaint(); el.dispatchEvent(new Event('chip-change'));
        });
      });
    }

    function add() {
      const v = inputEl.value.trim();
      if (!v) { inputEl.focus(); return; }
      if (el._items.includes(v)) {
        toast('이미 등록된 항목입니다.', 'error');
        return;
      }
      el._items.push(v);
      inputEl.value = '';
      repaint();
      el.dispatchEvent(new Event('chip-change'));
      inputEl.focus();
    }
    addEl.addEventListener('click', add);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); add(); }
      else if (e.key === 'Backspace' && !inputEl.value && el._items.length) {
        // 빈 인풋에서 백스페이스 → 마지막 항목 제거
        el._items.pop(); repaint(); el.dispatchEvent(new Event('chip-change'));
      }
    });
    repaint();
  }
  function readChipEditor(el) { return el && Array.isArray(el._items) ? el._items.slice() : []; }

  /* ══════════════════════════════
     TEXTAREA POLISH — 자동 높이 + 글자 수 카운터
     ──────────────────────────────
     모든 .field > textarea 에 적용. maxlength 가 있으면 카운터 표시.
     ══════════════════════════════ */
  function enhanceTextarea(ta) {
    if (!ta || ta._enhanced) return;
    ta._enhanced = true;
    function autosize() {
      ta.style.height = 'auto';
      ta.style.height = Math.max(80, ta.scrollHeight + 2) + 'px';
    }
    ta.addEventListener('input', autosize, { passive: true });
    // 초기 사이즈
    requestAnimationFrame(autosize);
    // maxlength 가 있으면 카운터
    const max = parseInt(ta.getAttribute('maxlength'), 10);
    if (max > 0) {
      const wrap = ta.closest('.field');
      if (wrap) {
        wrap.classList.add('field--counted');
        let counter = wrap.querySelector('.field-counter');
        if (!counter) {
          counter = document.createElement('span');
          counter.className = 'field-counter';
          wrap.appendChild(counter);
        }
        const update = () => {
          const n = ta.value.length;
          counter.textContent = `${n} / ${max}`;
          counter.classList.toggle('over', n >= max * 0.95);
        };
        ta.addEventListener('input', update);
        update();
      }
    }
  }
  function enhanceAllTextareas(root) {
    (root || document).querySelectorAll('.field textarea').forEach(enhanceTextarea);
  }

  /* ══════════════════════════════
     FORM OPTIONS (드롭다운 옵션) — 칩 에디터 사용
     ══════════════════════════════ */
  const FO_FIELDS = ['categories','regions','periods','experiences'];
  function renderFormOpts() {
    const o = window.loadFormOptions();
    FO_FIELDS.forEach(k => {
      const el = $('#fo_' + k);
      if (!el) return;
      mountChipEditor(el, o[k] || []);
      // chip-change 이벤트마다 자동 저장 → "저장" 버튼 의존도 제거
      el.addEventListener('chip-change', () => {
        const data = {};
        FO_FIELDS.forEach(k2 => {
          const e2 = $('#fo_' + k2);
          if (e2) data[k2] = readChipEditor(e2);
        });
        window.saveFormOptions(data);
      });
    });
  }
  function saveFormOpts() {
    const data = {};
    FO_FIELDS.forEach(k => {
      const el = $('#fo_' + k);
      if (!el) return;
      data[k] = readChipEditor(el);
    });
    window.saveFormOptions(data);
    toast('폼 옵션이 저장되었습니다.');
  }
  function resetFormOpts() {
    if (!confirm('폼 옵션을 기본값으로 복원하시겠습니까?')) return;
    window.resetFormOptions();
    renderFormOpts();
    toast('기본값으로 복원되었습니다.');
  }

  /* ══════════════════════════════
     LEGAL DOCS (약관 / 개인정보처리방침)
     ══════════════════════════════ */
  let legalState = null;
  let legalCurrent = 'terms';
  function legalApi() {
    return legalCurrent === 'privacy'
      ? { load: window.loadPrivacy, save: window.savePrivacy, reset: window.resetPrivacy }
      : { load: window.loadTerms,   save: window.saveTerms,   reset: window.resetTerms };
  }
  function renderLegalForm() {
    const api = legalApi();
    legalState = api.load();
    $('#legal_title').value     = legalState.title || '';
    $('#legal_effective').value = legalState.effective || '';
    $('#legal_intro').value     = legalState.intro || '';
    $('#legal_note').value      = legalState.note  || '';
    const list = $('#legalSectionList');
    if (!list) return;
    if (!legalState.sections.length) {
      list.innerHTML = '<div class="empty">등록된 조항이 없습니다.</div>';
      return;
    }
    list.innerHTML = legalState.sections.map((s, i) => `
      <div class="info-edit-item" data-idx="${i}">
        <div class="seq-edit-head">
          <span class="seq-edit-num">${i + 1}</span>
          <strong class="seq-edit-label">조항</strong>
          <div class="seq-edit-actions">
            <button class="icon-btn" data-act="up"   ${i === 0 ? 'disabled' : ''} title="위로" aria-label="위로">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="icon-btn" data-act="down" ${i === legalState.sections.length-1 ? 'disabled' : ''} title="아래로" aria-label="아래로">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button class="icon-btn icon-btn-danger" data-act="del" title="제거" aria-label="제거">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
        <div class="field">
          <label>조항 제목</label>
          <input type="text" data-act="title" value="${escapeHtml(s.title)}" placeholder="예) 제1조 (목적)">
        </div>
        <div class="field">
          <label>조항 본문</label>
          <textarea data-act="body" rows="4" placeholder="조항 내용을 작성하세요. 줄바꿈은 그대로 표시됩니다.">${escapeHtml(s.body)}</textarea>
        </div>
      </div>
    `).join('');
    list.querySelectorAll('button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.closest('.info-edit-item').dataset.idx, 10);
        const a = btn.dataset.act;
        if (a === 'up' && idx > 0) [legalState.sections[idx-1], legalState.sections[idx]] = [legalState.sections[idx], legalState.sections[idx-1]];
        else if (a === 'down' && idx < legalState.sections.length-1) [legalState.sections[idx+1], legalState.sections[idx]] = [legalState.sections[idx], legalState.sections[idx+1]];
        else if (a === 'del') { if (!confirm('이 조항을 삭제할까요?')) return; legalState.sections.splice(idx, 1); }
        renderLegalForm();
      });
    });
    list.querySelectorAll('input[data-act], textarea[data-act]').forEach(el => {
      el.addEventListener('input', () => {
        const idx = parseInt(el.closest('.info-edit-item').dataset.idx, 10);
        legalState.sections[idx][el.dataset.act] = el.value;
      });
    });
    enhanceAllTextareas(list);
  }
  function addLegalSection() {
    if (!legalState) legalState = legalApi().load();
    legalState.sections.push({ title: '새 조항', body: '내용을 입력하세요.' });
    renderLegalForm();
  }
  function saveLegalForm() {
    if (!legalState) return;
    legalState.title     = $('#legal_title').value;
    legalState.effective = $('#legal_effective').value;
    legalState.intro     = $('#legal_intro').value;
    legalState.note      = $('#legal_note').value;
    legalApi().save(legalState);
    toast(legalCurrent === 'privacy' ? '개인정보처리방침이 저장되었습니다.' : '이용약관이 저장되었습니다.');
  }
  function resetLegalDoc() {
    if (!confirm('현재 문서를 기본값으로 복원하시겠습니까?')) return;
    legalApi().reset();
    renderLegalForm();
    toast('기본값으로 복원되었습니다.');
  }
  function switchLegalDoc() {
    legalCurrent = $('#legalDocSelect').value;
    renderLegalForm();
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
    let totalSaved = 0;

    const list = Array.from(files).filter(f => f.type && f.type.startsWith('image/'));
    if (!list.length) { toast('이미지 파일이 아닙니다.', 'error'); return; }

    showUploadProgress(0, list.length);
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      try {
        // ─ 자동 최적화 (리사이즈 + WebP) ─
        const opt = await window.optimizeImageFile(f, {
          maxDim: 1600,
          quality: 0.82,
          maxOutputBytes: 600 * 1024,
        });
        const newBytes = totalBytes + opt.dataUrl.length;
        if (newBytes > MAX_IMG_BYTES) {
          toast(`용량 한도(${formatBytes(MAX_IMG_BYTES)}) 초과로 "${f.name}"를 건너뜁니다.`, 'error');
          continue;
        }
        const name = uniqueImageName(map, opt.name);
        map[name] = opt.dataUrl;
        totalBytes = newBytes;
        added++;
        totalSaved += (opt.originalBytes - opt.optimizedBytes);
      } catch (e) {
        toast(`"${f.name}" 처리 실패: ${e.message || e}`, 'error');
      }
      showUploadProgress(i + 1, list.length);
    }
    hideUploadProgress();
    window.saveUploadedImages(map);
    renderImages();
    populateImageSelect();
    populateBannerAddSelect();
    if (added) {
      const savedKb = Math.max(0, Math.round(totalSaved / 1024));
      toast(`${added}장 업로드 완료 — ${savedKb}KB 절감 (자동 최적화)`);
    }
  }

  function showUploadProgress(done, total) {
    const wrap = $('#uploadProgress');
    if (!wrap) return;
    wrap.hidden = false;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const fill = $('#uploadProgressFill');
    const txt  = $('#uploadProgressText');
    if (fill) fill.style.width = pct + '%';
    if (txt)  txt.textContent  = `처리 중 ${done} / ${total} (${pct}%)`;
  }
  function hideUploadProgress() {
    const wrap = $('#uploadProgress');
    if (wrap) setTimeout(() => { wrap.hidden = true; }, 600);
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
    const refKey = 'uploaded:' + name;
    // 1. 사용처 스캔
    const usingCars = (Array.isArray(window.carDatabase) ? window.carDatabase : [])
      .filter(c => c.image === refKey || c.detailImage === refKey);
    const usingBanners = banners.filter(b => b === refKey);
    const meta = window.loadBannerMeta();
    const usingBannerMeta = Object.entries(meta).filter(([k, v]) => v && v.mobileImage === refKey);
    const hero = window.loadHeroBanners();
    const usingHero = Object.entries(hero).filter(([k, v]) =>
      v && (v.desktop === refKey || v.mobile === refKey));

    const totalRefs = usingCars.length + usingBanners.length + usingBannerMeta.length + usingHero.length;

    let msg = `업로드된 이미지 "${name}"를 삭제하시겠습니까?`;
    if (totalRefs > 0) {
      const detail = [];
      if (usingCars.length)       detail.push(`차량 ${usingCars.length}대`);
      if (usingBanners.length)    detail.push(`메인 슬라이드 PC ${usingBanners.length}장`);
      if (usingBannerMeta.length) detail.push(`메인 슬라이드 모바일 ${usingBannerMeta.length}장`);
      if (usingHero.length)       detail.push(`서브페이지 히어로 ${usingHero.length}개`);
      msg += `\n\n⚠️ 사용 중: ${detail.join(', ')}\n삭제 시 해당 항목의 이미지가 빈 칸이 됩니다.\n\n그래도 삭제하시겠습니까?`;
    }
    if (!confirm(msg)) return;

    // 2. 참조 자동 정리 — 빈 문자열로 클리어 (placeholder 가능 시 그쪽으로)
    if (usingCars.length && Array.isArray(window.carDatabase)) {
      window.carDatabase.forEach(c => {
        if (c.image === refKey)       delete c.image;
        if (c.detailImage === refKey) delete c.detailImage;
      });
      window.saveCarDatabase(window.carDatabase);
      cars = await DataLayer.fetchCars();
    }
    if (usingBanners.length) {
      banners = banners.filter(b => b !== refKey);
      await DataLayer.saveBanners(banners);
    }
    if (usingBannerMeta.length) {
      const newMeta = Object.assign({}, meta);
      usingBannerMeta.forEach(([k]) => { delete newMeta[k].mobileImage; });
      window.saveBannerMeta(newMeta);
    }
    if (usingHero.length) {
      const newHero = JSON.parse(JSON.stringify(hero));
      usingHero.forEach(([k, v]) => {
        if (v.desktop === refKey) delete newHero[k].desktop;
        if (v.mobile === refKey)  delete newHero[k].mobile;
      });
      window.saveHeroBanners(newHero);
    }

    // 3. 이미지 자체 삭제
    await DataLayer.removeUploadedImage(name);
    renderImages();
    populateImageSelect();
    populateBannerAddSelect();
    if (totalRefs > 0) toast(`이미지 삭제 완료 — ${totalRefs}곳에서 참조 정리됨`);
    else toast('이미지가 삭제되었습니다.');
  }

  /* ── 차량/배너 select 옵션 갱신 (이미지 업로드 후 호출) ── */
  function populateImageSelect() {
    const opts = getImageOptions();
    // 메인 이미지 select
    const sel = $('#cf_image');
    if (sel) {
      const cur = sel.value;
      sel.innerHTML = opts.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
      if (cur && opts.some(o => o.value === cur)) sel.value = cur;
      updateImagePreview('cfImagePreview', sel.value);
    }
    // 상세 페이지 통이미지 select — "사용 안 함" 옵션이 맨 위
    const dsel = $('#cf_detailImage');
    if (dsel) {
      const dcur = dsel.value;
      dsel.innerHTML = '<option value="">사용 안 함 (위 구조화 필드만 표시)</option>'
        + opts.map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
      if (dcur && opts.some(o => o.value === dcur)) dsel.value = dcur;
      updateImagePreview('cfDetailImagePreview', dsel.value);
    }
  }

  function updateImagePreview(previewId, value) {
    // 호환성: 인자 1개로 호출되면 메인 이미지 미리보기에 적용
    if (typeof value === 'undefined') { value = previewId; previewId = 'cfImagePreview'; }
    const prev = document.getElementById(previewId);
    if (!prev) return;

    // 상세 페이지 통이미지: 값이 없으면 기본 안내 배너(detail-page.webp)를 보여줘서
    // 실제 detail.html 에 무엇이 표시되는지 어드민에서 그대로 확인 가능하도록.
    // ※ 단 신규 차량(아직 저장 안 됨) 일 때는 fallback 안 함 — 아직 상세 페이지가 없으므로.
    let displayValue = value;
    let usingDefault = false;
    const isNewCar = !$('#cf_id').value;  // hidden id 값으로 신규/기존 판별
    if (previewId === 'cfDetailImagePreview' && !value && !isNewCar) {
      displayValue = 'detail-page.webp';
      usingDefault = true;
    }

    // 상세 이미지 상태 텍스트 갱신
    const statusText = document.getElementById('cfDetailImageStatusText');
    if (statusText && previewId === 'cfDetailImagePreview') {
      if (isNewCar && !value) {
        statusText.textContent = '신규 차량 — 저장 후 상세 페이지가 생성됩니다';
        statusText.style.color = 'var(--ui-text-3)';
      } else if (usingDefault) {
        statusText.textContent = '기본 안내 배너 (detail-page.webp) — 모든 차량 공통';
        statusText.style.color = 'var(--ui-text-2)';
      } else if (value) {
        statusText.textContent = '이 차량 전용 이미지 (' + String(value).replace(/^uploaded:/, '업로드: ') + ')';
        statusText.style.color = 'var(--ui-accent)';
      }
    }

    if (displayValue) {
      prev.hidden = false;
      prev.style.backgroundImage = `url('${imageUrl(displayValue)}')`;
    } else {
      prev.hidden = true;
      prev.style.backgroundImage = '';
    }
  }

  /* ── 단일 파일 빠른 업로드 + 결과를 select 에 자동 선택 ── */
  async function quickUploadAndSelect(file, selectEl, options) {
    if (!file || !file.type.startsWith('image/')) {
      toast('이미지 파일이 아닙니다.', 'error'); return null;
    }
    try {
      const opt = await window.optimizeImageFile(file, options || { maxDim: 1600, quality: 0.82 });
      const map = window.loadUploadedImages();
      const total = calcStorageBytes(map);
      if (total + opt.dataUrl.length > MAX_IMG_BYTES) {
        toast(`용량 한도(${formatBytes(MAX_IMG_BYTES)}) 초과로 업로드 실패.`, 'error');
        return null;
      }
      const name = uniqueImageName(map, opt.name);
      map[name] = opt.dataUrl;
      window.saveUploadedImages(map);
      // 선택지 갱신
      populateImageSelect();
      populateBannerAddSelect();
      // 미리보기 & select 값 적용
      if (selectEl) {
        const val = 'uploaded:' + name;
        const opts = Array.from(selectEl.options).map(o => o.value);
        if (opts.includes(val)) selectEl.value = val;
        // 해당 select 의 미리보기 id를 추론
        const previewId = (selectEl.id === 'cf_detailImage') ? 'cfDetailImagePreview' : 'cfImagePreview';
        updateImagePreview(previewId, selectEl.value);
      }
      const savedKb = Math.max(0, Math.round((opt.originalBytes - opt.optimizedBytes) / 1024));
      toast(`업로드 완료 — "${name}" (${savedKb}KB 절감)`);
      return name;
    } catch (e) {
      toast('업로드 실패: ' + (e.message || e), 'error');
      return null;
    }
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

  /* ══════════════════════════════
     PASSWORD CHANGE MODAL
     ══════════════════════════════ */
  function openPwModal() {
    const m = $('#pwModal');
    if (!m) return;
    $('#pw_current').value = '';
    $('#pw_new').value = '';
    $('#pw_confirm').value = '';
    const err = $('#pwError');
    if (err) { err.textContent = ''; err.classList.remove('show'); }
    const hint = $('#pwHint');
    if (hint) hint.hidden = !(AdminAuth.config && AdminAuth.config.MOCK_BACKEND);
    m.classList.add('open');
    setTimeout(() => $('#pw_current').focus(), 50);
  }
  function closePwModal() { const m = $('#pwModal'); if (m) m.classList.remove('open'); }
  async function submitPwChange(e) {
    e.preventDefault();
    const err = $('#pwError');
    const showErr = (msg) => { err.textContent = msg; err.classList.add('show'); };
    err.textContent = ''; err.classList.remove('show');
    const cur = $('#pw_current').value;
    const nw  = $('#pw_new').value;
    const cf  = $('#pw_confirm').value;
    if (nw !== cf) return showErr('새 비밀번호가 일치하지 않습니다.');
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '변경 중...';
    const r = await AdminAuth.changePassword(cur, nw);
    btn.disabled = false; btn.textContent = '변경';
    if (!r.ok) return showErr(r.error || '변경 실패');
    closePwModal();
    toast('비밀번호가 변경되었습니다. 다음 로그인부터 적용됩니다.');
  }

  /* ── INIT ─────────────────────────────────────────── */
  async function init() {
    document.documentElement.classList.add('loaded');

    // 데모 안내 바 — MOCK_BACKEND 일 때만 노출
    const demoBar = $('#demoBar');
    if (demoBar && AdminAuth.config && AdminAuth.config.MOCK_BACKEND) demoBar.hidden = false;

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

    // tab buttons (모바일에서는 클릭 시 사이드바 자동 닫힘)
    $$('.admin-nav-item').forEach(b => b.addEventListener('click', () => {
      setTab(b.dataset.tab);
      closeMobileNav();
    }));

    // 모바일 드로어 토글
    const burger    = $('#adminBurger');
    const backdrop  = $('#adminBackdrop');
    const closeNav  = $('#adminCloseNav');
    const sidebar   = $('#adminSidebar');
    function openMobileNav() {
      if (sidebar) sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('open');
      document.body.classList.add('sidebar-open');  // :has() 미지원 브라우저용 폴백
      document.body.style.overflow = 'hidden';
    }
    function closeMobileNav() {
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
      document.body.classList.remove('sidebar-open');
      document.body.style.overflow = '';
    }
    if (burger) burger.addEventListener('click', openMobileNav);
    if (backdrop) backdrop.addEventListener('click', closeMobileNav);
    if (closeNav) closeNav.addEventListener('click', closeMobileNav);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar && sidebar.classList.contains('open')) closeMobileNav();
    });

    // logout / password change
    $('#logoutBtn').addEventListener('click', () => AdminAuth.logout());
    const cpb = $('#changePwBtn');
    if (cpb) cpb.addEventListener('click', openPwModal);
    const pwc = $('#pwModalClose'); if (pwc) pwc.addEventListener('click', closePwModal);
    const pwx = $('#pwCancel');     if (pwx) pwx.addEventListener('click', closePwModal);
    const pwf = $('#pwForm');       if (pwf) pwf.addEventListener('submit', submitPwChange);
    const pwm = $('#pwModal');
    if (pwm) pwm.addEventListener('click', (e) => { if (e.target.id === 'pwModal') closePwModal(); });

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

    // banners (메인 슬라이더)
    const addBtnB = $('#addBannerBtn');
    if (addBtnB) addBtnB.addEventListener('click', addBanner);
    $('#resetBannersBtn').addEventListener('click', resetAllBanners);

    // hero banners (서브페이지)
    const shb = $('#saveHeroesBtn');  if (shb) shb.addEventListener('click', saveHeroBanners);
    const rhb = $('#resetHeroesBtn'); if (rhb) rhb.addEventListener('click', resetHeroBanners);

    // 차량 모달 — 상세 페이지 미리보기 버튼 (iframe 모달)
    const cfPrev = $('#cfPreviewDetailBtn');
    if (cfPrev) cfPrev.addEventListener('click', () => {
      const id = parseInt($('#cf_id').value, 10);
      if (!id) {
        toast('새 차량은 먼저 저장 후 미리보기를 사용할 수 있습니다.', 'error');
        return;
      }
      openDetailPreview(id);
    });

    // 상세 미리보기 모달 — 닫기 / 화면크기 변경
    const dpClose = $('#detailPreviewClose');
    if (dpClose) dpClose.addEventListener('click', closeDetailPreview);
    const dpModal = $('#detailPreviewModal');
    if (dpModal) dpModal.addEventListener('click', (e) => {
      if (e.target.id === 'detailPreviewModal') closeDetailPreview();
    });
    const dpViewport = $('#detailPreviewViewport');
    if (dpViewport) dpViewport.addEventListener('change', () => {
      const frame = $('#detailPreviewFrame');
      if (frame) frame.style.maxWidth = dpViewport.value || '100%';
    });
    // ESC 키 — 미리보기 모달 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dpModal && dpModal.classList.contains('open')) {
        closeDetailPreview();
      }
    });

    // 차량 모달 — 이미지 직접 업로드
    const cfUpBtn = $('#cfImageUploadBtn');
    const cfUpIn  = $('#cfImageUploadInput');
    if (cfUpBtn && cfUpIn) {
      cfUpBtn.addEventListener('click', () => cfUpIn.click());
      cfUpIn.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) await quickUploadAndSelect(file, $('#cf_image'));
        e.target.value = '';
      });
    }
    // 차량 이미지 select 변경 시 미리보기 갱신
    const cfSel = $('#cf_image');
    if (cfSel) cfSel.addEventListener('change', () => updateImagePreview('cfImagePreview', cfSel.value));

    // 상세 페이지 통이미지 — 직접 업로드 + 미리보기
    const cfDetSel = $('#cf_detailImage');
    if (cfDetSel) cfDetSel.addEventListener('change', () => updateImagePreview('cfDetailImagePreview', cfDetSel.value));
    const cfDetUpBtn = $('#cfDetailImageUploadBtn');
    const cfDetUpIn  = $('#cfDetailImageUploadInput');
    if (cfDetUpBtn && cfDetUpIn) {
      cfDetUpBtn.addEventListener('click', () => cfDetUpIn.click());
      cfDetUpIn.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          // 상세 페이지 통이미지는 더 큰 사이즈 허용 (긴 형식)
          await quickUploadAndSelect(file, $('#cf_detailImage'), { maxDim: 2000, quality: 0.82 });
          updateImagePreview('cfDetailImagePreview', $('#cf_detailImage').value);
        }
        e.target.value = '';
      });
    }

    // (구) 배너 직접 업로드 UI 제거 — 이제 각 슬라이드 카드 안에서 직접 업로드

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

    // 사이트 공통 — 기본 안내 배너
    const setDbSel = $('#set_defaultDetailBanner');
    if (setDbSel) setDbSel.addEventListener('change', () => updateSetDetailBannerPreview(setDbSel.value));
    const setDbUpBtn = $('#setDetailBannerUploadBtn');
    const setDbUpIn  = $('#setDetailBannerUploadInput');
    if (setDbUpBtn && setDbUpIn) {
      setDbUpBtn.addEventListener('click', () => setDbUpIn.click());
      setDbUpIn.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) {
          await quickUploadAndSelect(file, setDbSel, { maxDim: 2000, quality: 0.82 });
          updateSetDetailBannerPreview(setDbSel.value);
        }
        e.target.value = '';
      });
    }

    // activity log
    const rab = $('#resetActivityBtn');
    if (rab) rab.addEventListener('click', resetActivityLog);

    // about
    $('#saveAboutBtn').addEventListener('click', saveAboutForm);
    $('#resetAboutBtn').addEventListener('click', resetAboutForm);

    // business
    const sbb = $('#saveBusinessBtn');   if (sbb) sbb.addEventListener('click', saveBusinessForm);
    const rbb = $('#resetBusinessBtn');  if (rbb) rbb.addEventListener('click', resetBusinessForm);

    // faq
    const afb = $('#addFaqBtn');         if (afb) afb.addEventListener('click', addFaqItem);
    const rfb = $('#resetFaqBtn');       if (rfb) rfb.addEventListener('click', resetFaq);

    // info page
    const sib = $('#saveInfoBtn');       if (sib) sib.addEventListener('click', saveInfoForm);
    const aib = $('#addInfoSectionBtn'); if (aib) aib.addEventListener('click', addInfoSection);
    const rib = $('#resetInfoBtn');      if (rib) rib.addEventListener('click', resetInfoForm);

    // form options
    const sfob = $('#saveFormOptsBtn');  if (sfob) sfob.addEventListener('click', saveFormOpts);
    const rfob = $('#resetFormOptsBtn'); if (rfob) rfob.addEventListener('click', resetFormOpts);

    // legal docs (terms / privacy)
    const lsel = $('#legalDocSelect');        if (lsel) lsel.addEventListener('change', switchLegalDoc);
    const slb  = $('#saveLegalBtn');          if (slb)  slb.addEventListener('click', saveLegalForm);
    const alb  = $('#addLegalSectionBtn');    if (alb)  alb.addEventListener('click', addLegalSection);
    const rlb  = $('#resetLegalBtn');         if (rlb)  rlb.addEventListener('click', resetLegalDoc);

    // inquiry — CSV + 상태 필터
    const exp = $('#exportInquiriesBtn');     if (exp) exp.addEventListener('click', exportInquiriesCsv);
    const isf = $('#inquiryStatusFilter');    if (isf) isf.addEventListener('change', renderInquiries);

    // images upload — 클릭 / 드래그&드롭 / 클립보드 paste 3종 입력
    $('#imgUploadBtn').addEventListener('click', () => $('#imgUploadInput').click());
    $('#imgUploadInput').addEventListener('change', (e) => {
      handleImageUpload(e.target.files);
      e.target.value = '';
    });
    const uz = $('#uploadZone');
    if (uz) {
      ['dragenter','dragover'].forEach(ev => uz.addEventListener(ev, e => {
        e.preventDefault(); e.stopPropagation();
        uz.classList.add('is-dragover');
      }));
      ['dragleave','dragend','drop'].forEach(ev => uz.addEventListener(ev, e => {
        e.preventDefault(); e.stopPropagation();
        uz.classList.remove('is-dragover');
      }));
      uz.addEventListener('drop', e => {
        const files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length) handleImageUpload(files);
      });
      uz.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        $('#imgUploadInput').click();
      });
      uz.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#imgUploadInput').click(); }
      });
    }
    // 전역 paste — '이미지 업로드' 탭이 활성일 때만 동작 (오작동 방지)
    document.addEventListener('paste', (e) => {
      const onImagesTab = document.querySelector('.admin-nav-item.active')?.dataset.tab === 'images';
      if (!onImagesTab) return;
      const files = window.extractImagesFromClipboard ? window.extractImagesFromClipboard(e) : [];
      if (files.length) {
        e.preventDefault();
        handleImageUpload(files);
      }
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
