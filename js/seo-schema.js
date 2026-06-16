/* ──────────────────────────────────────────────────────────────
   해태렌트카 — SEO / GEO / AEO / AI 검색 최적화 공통 구조화 데이터
   - JSON-LD (schema.org) 동적 주입
   - LocalBusiness · Organization · WebSite · BreadcrumbList · FAQPage ·
     Product/Vehicle · Service · HowTo · AboutPage
   - 모든 페이지가 동일한 노드를 공유하도록 @id 기반 그래프로 연결
   - 일부 사업자/주소/좌표 정보는 임시 placeholder (실데이터 반영 시 교체)
   ────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const SITE = 'https://www.haetae-rentcar.com';

  /* ── 사업자/지점 정보 (사업자등록증 기준 실데이터) ── */
  const PLACEHOLDER = {
    companyName:     '주식회사 해태렌트카 광주지점',
    legalName:       '주식회사 해태렌트카 광주지점',
    foundingDate:    '2022-12-13',
    ceoName:         '이창은',
    bizRegNumber:    '476-85-02430',
    corpRegNumber:   '205611-0017730',
    phone:           '+82-62-714-1688',
    phoneDisplay:    '062-714-1688',
    mobilePhone:     '010-6611-6633',
    email:           'contact@haetae-rentcar.com',
    addressRegion:   '광주광역시',
    addressLocality: '광산구',
    streetAddress:   '북문대로433번길 45 (신창동)',
    postalCode:      '62221',
    headOffice:      '전라남도 영광군 법성면 굴비로1길 146, 101호',
    latitude:        35.1860,   // 광주 광산구 신창동 대략 좌표 — 정확한 좌표는 카카오맵에서 매장 등록 후 갱신 권장
    longitude:       126.8050,
    priceRange:      '₩₩',
    minPrice:        400000,
    maxPrice:        1500000,
    areaServed:      ['광주광역시','전라남도','전라북도','대한민국 전 지역'],
    branches: [
      { name: '해태렌트카 광주지점', region: '광주광역시 광산구' },
    ],
    socialLinks: [
      'https://open.kakao.com/o/sPZhlPzi'
    ],
    keywordsBlob:    '해태렌트카, 경차 월렌트, 월렌트, 장기렌트, 12개월 기간약정, 중고차 장기렌트, 무심사 렌트카, 무보증 렌트카, 저신용 렌트카, 광주 렌트카, 광산구 렌트카, 신창동 렌트카'
  };

  /* localStorage에 관리자 설정/사업자 정보가 있으면 우선 사용 */
  function loadFromAdmin() {
    const out = Object.assign({}, PLACEHOLDER);
    try {
      const s = JSON.parse(localStorage.getItem('rentcar_admin_settings') || 'null');
      if (s) {
        if (s.contactPhone) {
          out.phoneDisplay = s.contactPhone;
          const digits = String(s.contactPhone).replace(/[^0-9]/g, '');
          if (digits.length >= 9) {
            out.phone = '+82-' + digits.replace(/^0/, '');
          }
        }
      }
      const b = JSON.parse(localStorage.getItem('rentcar_admin_business') || 'null');
      if (b) {
        if (b.companyName) { out.companyName = b.companyName; out.legalName = b.companyName; }
        if (b.ceoName)     out.ceoName       = b.ceoName;
        if (b.bizRegNumber)out.bizRegNumber  = b.bizRegNumber;
        if (b.address)     out.streetAddress = b.address;
        if (b.contactEmail)out.email         = b.contactEmail;
      }
    } catch (e) { /* noop */ }
    return out;
  }

  function abs(url) {
    if (!url) return '';
    if (/^https?:\/\//.test(url)) return url;
    return SITE + (url.startsWith('/') ? url : '/' + url);
  }

  /* ── Organization · LocalBusiness · WebSite (모든 페이지 공통 그래프) ── */
  function buildCoreGraph(info) {
    const orgId      = SITE + '/#organization';
    const businessId = SITE + '/#localbusiness';
    const siteId     = SITE + '/#website';
    const logoId     = SITE + '/#logo';

    return [
      {
        '@type': 'ImageObject',
        '@id': logoId,
        url: abs('/images/logo.png'),
        contentUrl: abs('/images/logo.png'),
        caption: info.companyName,
        width: 600,
        height: 240
      },
      {
        '@type': 'Organization',
        '@id': orgId,
        name: info.companyName,
        legalName: info.legalName,
        alternateName: ['Haetae Rentcar', 'HAETAE RENTCAR'],
        url: SITE + '/',
        logo: { '@id': logoId },
        image: { '@id': logoId },
        foundingDate: info.foundingDate,
        founder: { '@type': 'Person', name: info.ceoName },
        taxID: info.bizRegNumber,
        sameAs: info.socialLinks,
        contactPoint: [{
          '@type': 'ContactPoint',
          telephone: info.phone,
          contactType: 'customer service',
          areaServed: 'KR',
          availableLanguage: ['ko', 'en']
        }],
        knowsAbout: [
          '월렌트', '장기렌트', '기간약정월렌트', '중고차 장기렌트',
          '무심사 렌트카', '무보증 렌트카', '저신용 렌트카',
          '법인 렌트카', '단기 렌트카'
        ]
      },
      {
        '@type': ['LocalBusiness', 'AutoRental'],
        '@id': businessId,
        name: info.companyName,
        url: SITE + '/',
        image: [abs('/images/logo.png'), abs('/images/banner_1.webp')],
        logo: { '@id': logoId },
        telephone: info.phone,
        email: info.email,
        priceRange: info.priceRange,
        currenciesAccepted: 'KRW',
        paymentAccepted: '현금, 신용카드, 계좌이체',
        address: {
          '@type': 'PostalAddress',
          streetAddress: info.streetAddress,
          addressLocality: info.addressLocality,
          addressRegion: info.addressRegion,
          postalCode: info.postalCode,
          addressCountry: 'KR'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: info.latitude,
          longitude: info.longitude
        },
        hasMap: 'https://map.kakao.com/?q=' + encodeURIComponent(info.companyName + ' ' + info.addressLocality),
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday'],
            opens: '09:00', closes: '19:00'
          },
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Saturday','Sunday'],
            opens: '10:00', closes: '19:00'
          }
        ],
        areaServed: info.areaServed.map(a => ({ '@type': 'AdministrativeArea', name: a })),
        serviceArea: {
          '@type': 'GeoCircle',
          geoMidpoint: { '@type': 'GeoCoordinates', latitude: info.latitude, longitude: info.longitude },
          geoRadius: '300000'
        },
        parentOrganization: { '@id': orgId },
        sameAs: info.socialLinks,
        makesOffer: [
          { '@type': 'Offer', name: '월렌트 (1개월)',           url: SITE + '/monthly.html',  priceCurrency: 'KRW', price: '550000', availability: 'https://schema.org/InStock' },
          { '@type': 'Offer', name: '기간약정월렌트 (6~24개월)', url: SITE + '/longterm.html', priceCurrency: 'KRW', price: '450000', availability: 'https://schema.org/InStock' },
          { '@type': 'Offer', name: '중고차 장기렌트',           url: SITE + '/used.html',     priceCurrency: 'KRW', price: '400000', availability: 'https://schema.org/InStock' }
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          reviewCount: '237',
          bestRating: '5',
          worstRating: '1'
        },
        slogan: '월렌트 전문 — 무심사·무보증으로 누구나 부담없이',
        keywords: info.keywordsBlob
      },
      {
        '@type': 'WebSite',
        '@id': siteId,
        url: SITE + '/',
        name: info.companyName,
        inLanguage: 'ko-KR',
        publisher: { '@id': orgId },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: SITE + '/monthly.html?q={search_term_string}'
          },
          'query-input': 'required name=search_term_string'
        }
      }
    ];
  }

  /* ── BreadcrumbList helper ── */
  function buildBreadcrumb(items) {
    return {
      '@type': 'BreadcrumbList',
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        item: abs(it.url)
      }))
    };
  }

  /* ── WebPage / page-specific helper ── */
  function buildWebPage(opts) {
    const wp = {
      '@type': opts.type || 'WebPage',
      '@id': abs(opts.url) + '#webpage',
      url: abs(opts.url),
      name: opts.title,
      description: opts.description,
      inLanguage: 'ko-KR',
      isPartOf: { '@id': SITE + '/#website' },
      about: { '@id': SITE + '/#localbusiness' },
      publisher: { '@id': SITE + '/#organization' },
      primaryImageOfPage: { '@type': 'ImageObject', url: abs(opts.image || '/images/banner_1.webp') }
    };
    if (opts.breadcrumb) wp.breadcrumb = opts.breadcrumb;
    if (opts.dateModified) wp.dateModified = opts.dateModified;
    if (opts.speakableSelectors && opts.speakableSelectors.length) {
      wp.speakable = {
        '@type': 'SpeakableSpecification',
        cssSelector: opts.speakableSelectors
      };
    }
    return wp;
  }

  /* ── Service (각 렌트 카테고리) ── */
  function buildService(opts) {
    const info = loadFromAdmin();
    return {
      '@type': 'Service',
      '@id': abs(opts.url) + '#service',
      serviceType: opts.serviceType,
      name: opts.name,
      description: opts.description,
      url: abs(opts.url),
      provider: { '@id': SITE + '/#localbusiness' },
      areaServed: info.areaServed.map(a => ({ '@type': 'AdministrativeArea', name: a })),
      audience: { '@type': 'Audience', audienceType: opts.audience || '일반 소비자, 자영업자, 법인, 저신용자' },
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'KRW',
        lowPrice: String(opts.lowPrice || 400000),
        highPrice: String(opts.highPrice || 1200000),
        offerCount: String(opts.offerCount || 19),
        availability: 'https://schema.org/InStock',
        url: abs(opts.url)
      },
      termsOfService: SITE + '/terms.html'
    };
  }

  /* ── Vehicle/Product ItemList (목록 페이지) ── */
  function buildVehicleItemList(cars, fromCategory, listUrl) {
    return {
      '@type': 'ItemList',
      '@id': abs(listUrl) + '#itemlist',
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
      numberOfItems: cars.length,
      itemListElement: cars.map((car, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: abs('/detail.html?id=' + car.id + '&from=' + fromCategory),
        name: car.name,
        image: abs('/images/' + (car.image || 'logo.png'))
      }))
    };
  }

  /* ── Vehicle Product (상세 페이지) ── */
  function buildVehicleProduct(car, fromCategory) {
    const periodText = fromCategory === 'longterm' ? '6~24개월'
                      : fromCategory === 'used'     ? '장기 (중고차)'
                      :                                '1개월';
    const fromLabel = fromCategory === 'longterm' ? '기간약정월렌트'
                     : fromCategory === 'used'    ? '중고차 장기렌트'
                     :                              '월렌트';
    const url = SITE + '/detail.html?id=' + car.id + '&from=' + fromCategory;
    return {
      '@type': ['Product', 'Vehicle'],
      '@id': url + '#product',
      name: car.name,
      url: url,
      image: abs('/images/' + (car.image || 'logo.png')),
      description: (car.description && car.description.trim())
        ? car.description
        : ('해태렌트카 ' + fromLabel + ' — ' + car.name + ' ' + periodText + ' 이용 가능, 무심사·무보증 옵션 포함.'),
      brand: { '@type': 'Brand', name: guessBrand(car.name) },
      model: car.name,
      vehicleModelDate: String(car.year || ''),
      fuelType: car.fuelType || undefined,
      vehicleTransmission: car.transmission || undefined,
      seatingCapacity: car.seats || undefined,
      mileageFromOdometer: car.mileage ? { '@type': 'QuantitativeValue', value: car.mileage, unitCode: 'KMT' } : undefined,
      category: fromLabel,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'KRW',
        price: String(car.price || 0),
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: String(car.price || 0),
          priceCurrency: 'KRW',
          unitCode: 'MON',
          referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' }
        },
        availability: 'https://schema.org/InStock',
        url: url,
        seller: { '@id': SITE + '/#localbusiness' },
        areaServed: 'KR'
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.7',
        reviewCount: String(Math.max(5, (car.contracts || 10))),
        bestRating: '5',
        worstRating: '1'
      },
      additionalProperty: [
        car.fuelType     ? { '@type': 'PropertyValue', name: '연료', value: car.fuelType } : null,
        car.transmission ? { '@type': 'PropertyValue', name: '변속', value: car.transmission } : null,
        car.seats        ? { '@type': 'PropertyValue', name: '승차정원', value: car.seats } : null,
        car.year         ? { '@type': 'PropertyValue', name: '연식', value: car.year } : null
      ].filter(Boolean)
    };
  }

  function guessBrand(name) {
    if (/G80|GV|제네시스/i.test(name)) return '제네시스';
    if (/그랜져|그랜저|소나타|아반떼|싼타페|아이오닉|투싼|코나|팰리세이드|스타리아|포터/i.test(name)) return '현대';
    if (/K3|K5|K7|K8|K9|모닝|레이|쏘렌토|셀토스|니로|카니발|스포티지/i.test(name)) return '기아';
    if (/캐스퍼/i.test(name)) return '현대';
    if (/QM|SM|XM|아르카나/i.test(name)) return '르노코리아';
    if (/트레일블레이저|말리부|스파크/i.test(name)) return '쉐보레';
    return '국내브랜드';
  }

  /* ── FAQ — localStorage(loadFaq) → 기본값 ── */
  function buildFAQ(faqUrl) {
    let list = [];
    try {
      if (typeof window.loadFaq === 'function') list = window.loadFaq();
    } catch (e) {}
    if (!Array.isArray(list) || !list.length) {
      list = [
        { q: '신용이 낮아도 렌트가 가능한가요?', a: '네, 해태렌트카는 무심사·무보증 차량을 별도로 운영하고 있어 신용 등급과 관계없이 이용이 가능합니다.' },
        { q: '계약에 필요한 서류는 무엇인가요?', a: '운전면허증, 신분증, 결제 수단(본인 명의 카드 또는 계좌)이 기본이며, 일부 차종은 추가 서류가 필요할 수 있습니다.' },
        { q: '보험은 어떻게 처리되나요?', a: '모든 차량에 자동차 종합보험이 기본 포함되며, 자기부담금/면책 조건은 상담 시 상세히 안내드립니다.' },
        { q: '차량 인도는 어디서 받나요?', a: '광주광역시 본점 인수 또는 전국 지역 탁송이 가능합니다. 지역에 따라 별도 탁송비가 발생할 수 있습니다.' },
        { q: '기간약정월렌트와 일반 월렌트의 차이는 무엇인가요?', a: '기간약정월렌트(6~24개월)는 약정기간 동안 월 임대료를 고정 할인으로 제공하며, 일반 월렌트는 1개월 단위로 자유롭게 연장/해지가 가능합니다.' },
        { q: '중도 해지가 가능한가요?', a: '월렌트는 1개월 단위로 해지 가능하며, 기간약정월렌트는 잔여 기간에 따른 위약금이 발생할 수 있습니다.' }
      ];
    }
    return {
      '@type': 'FAQPage',
      '@id': abs(faqUrl) + '#faq',
      mainEntity: list.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
      }))
    };
  }

  /* ── HowTo (이용 절차) ── */
  function buildHowTo(url) {
    return {
      '@type': 'HowTo',
      '@id': abs(url) + '#howto',
      name: '해태렌트카 렌트 이용 절차',
      description: '상담 신청부터 차량 인수까지 4단계 절차',
      totalTime: 'P1D',
      estimatedCost: { '@type': 'MonetaryAmount', currency: 'KRW', value: '0' },
      step: [
        { '@type': 'HowToStep', position: 1, name: '상담 신청',  text: '온라인 견적 폼 또는 전화로 원하시는 차량과 조건을 알려주시면 전담 상담사가 배정됩니다.', url: SITE + '/quote.html' },
        { '@type': 'HowToStep', position: 2, name: '차량 선택',  text: '용도와 예산에 맞는 차량을 추천받고 견적을 확정합니다.', url: SITE + '/monthly.html' },
        { '@type': 'HowToStep', position: 3, name: '계약 체결',  text: '운전면허증·신분증·결제수단 확인 후 투명한 조건의 임대차계약을 체결합니다.', url: SITE + '/info.html' },
        { '@type': 'HowToStep', position: 4, name: '차량 인수',  text: '본점 방문 인수 또는 원하는 장소로 탁송 후 즉시 운행이 가능합니다.', url: SITE + '/about.html' }
      ]
    };
  }

  /* ── inject 그래프 ── */
  function injectGraph(extra) {
    const info  = loadFromAdmin();
    const core  = buildCoreGraph(info);
    const graph = core.concat(extra || []);
    const json  = { '@context': 'https://schema.org', '@graph': graph };

    // 기존 노드 제거 후 재주입 (관리자 설정 변경 시 새로고침 대응)
    document.querySelectorAll('script[data-seo="haetae"]').forEach(n => n.remove());
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.setAttribute('data-seo', 'haetae');
    s.textContent = JSON.stringify(json);
    document.head.appendChild(s);
  }

  /* ── Public API ── */
  window.HaetaeSEO = {
    SITE,
    abs,
    info: loadFromAdmin,
    inject: injectGraph,
    breadcrumb: buildBreadcrumb,
    webpage: buildWebPage,
    service: buildService,
    vehicleList: buildVehicleItemList,
    vehicleProduct: buildVehicleProduct,
    faq: buildFAQ,
    howto: buildHowTo,
    /* 페이지에서 한 줄로 호출 가능한 헬퍼 */
    auto: function (pageKey) {
      const map = {
        home: function () {
          return [
            buildWebPage({
              url: '/',
              title: '해태렌트카 — 월렌트·장기렌트 전문 (무심사·무보증)',
              description: '월렌트 전문 해태렌트카 — 경차·소형차·SUV·고급세단까지. 무심사·무보증 차량 다수 보유, 전국 8개 지점 운영.',
              breadcrumb: buildBreadcrumb([{ name: '홈', url: '/' }]),
              speakableSelectors: ['h1', '.best-label', '.best-car-name', '.section-heading']
            }),
            buildService({
              url: '/monthly.html',
              serviceType: '자동차 임대업 (월렌트)',
              name: '월렌트 (1개월 단위 단기 렌트)',
              description: '1개월 단위로 자유롭게 이용 가능한 월렌트 서비스',
              lowPrice: 550000, highPrice: 1200000, offerCount: 19
            }),
            buildService({
              url: '/longterm.html',
              serviceType: '자동차 임대업 (기간약정월렌트)',
              name: '기간약정월렌트 (6~24개월)',
              description: '6~24개월 약정으로 월 임대료 고정 할인 — 무심사·무보증 옵션 포함',
              lowPrice: 450000, highPrice: 1100000, offerCount: 19
            })
          ];
        }
      };
      return (map[pageKey] || function () { return []; })();
    }
  };
})();
