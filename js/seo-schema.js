/* 해태렌트카 — SEO / GEO / AEO 구조화 데이터
   현재 운영 대표 URL: http://haetae1.com
   SSL 적용 후 SITE만 https://haetae1.com 으로 변경하면 됩니다. */
(function () {
  'use strict';

  const SITE = 'http://haetae1.com';

  const DEFAULT_INFO = {
    companyName: '주식회사 해태렌트카 광주지점',
    legalName: '주식회사 해태렌트카 광주지점',
    phone: '+82-62-714-1688',
    phoneDisplay: '062-714-1688',
    mobilePhone: '010-6611-6633',
    email: 'contact@haetae1.com',
    addressRegion: '광주광역시',
    addressLocality: '광산구',
    streetAddress: '북문대로433번길 45 (신창동)',
    postalCode: '62221',
    latitude: 35.1860,
    longitude: 126.8050,
    priceRange: '₩₩',
    areaServed: ['광주광역시', '전라남도', '전라북도', '대한민국 전 지역'],
    socialLinks: ['https://open.kakao.com/o/sPZhlPzi'],
    keywordsBlob: '광주 렌트카, 광주 렌터카, 광주광역시 렌트카, 광산구 렌트카, 신창동 렌트카, 광주 월렌트, 광주 장기렌트, 광주 중고차 장기렌트, 경차 월렌트, 무심사 렌트카, 무보증 렌트카, 저신용 렌트카, 해태렌트카'
  };

  function info() {
    const out = Object.assign({}, DEFAULT_INFO);
    try {
      if (typeof window.loadSettings === 'function') {
        const s = window.loadSettings();
        if (s && s.contactPhone) {
          out.phoneDisplay = s.contactPhone;
          const digits = String(s.contactPhone).replace(/[^0-9]/g, '');
          if (digits.length >= 9) out.phone = '+82-' + digits.replace(/^0/, '');
        }
      }
      if (typeof window.loadBusiness === 'function') {
        const b = window.loadBusiness();
        if (b && b.companyName) { out.companyName = b.companyName; out.legalName = b.companyName; }
        if (b && b.address) out.streetAddress = b.address;
        if (b && b.contactEmail) out.email = b.contactEmail;
      }
    } catch (e) { }
    return out;
  }

  function abs(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return SITE + (String(url).charAt(0) === '/' ? url : '/' + url);
  }

  function breadcrumb(items) {
    return {
      '@type': 'BreadcrumbList',
      itemListElement: (items || []).map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        item: abs(it.url)
      }))
    };
  }

  function coreGraph(i) {
    const orgId = SITE + '/#organization';
    const businessId = SITE + '/#localbusiness';
    const siteId = SITE + '/#website';
    return [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: i.companyName,
        legalName: i.legalName,
        url: SITE + '/',
        logo: abs('/images/logo.png'),
        sameAs: i.socialLinks,
        contactPoint: [{ '@type': 'ContactPoint', telephone: i.phone, contactType: 'customer service', areaServed: 'KR', availableLanguage: ['ko'] }]
      },
      {
        '@type': ['LocalBusiness', 'AutoRental'],
        '@id': businessId,
        name: i.companyName,
        url: SITE + '/',
        image: [abs('/images/logo.png'), abs('/images/banner_1.webp')],
        logo: abs('/images/logo.png'),
        telephone: i.phone,
        email: i.email,
        priceRange: i.priceRange,
        address: {
          '@type': 'PostalAddress',
          streetAddress: i.streetAddress,
          addressLocality: i.addressLocality,
          addressRegion: i.addressRegion,
          postalCode: i.postalCode,
          addressCountry: 'KR'
        },
        geo: { '@type': 'GeoCoordinates', latitude: i.latitude, longitude: i.longitude },
        openingHoursSpecification: [
          { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '19:00' },
          { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday', 'Sunday'], opens: '10:00', closes: '19:00' }
        ],
        areaServed: i.areaServed.map(a => ({ '@type': 'AdministrativeArea', name: a })),
        sameAs: i.socialLinks,
        keywords: i.keywordsBlob
      },
      {
        '@type': 'WebSite',
        '@id': siteId,
        url: SITE + '/',
        name: i.companyName,
        inLanguage: 'ko-KR',
        publisher: { '@id': orgId },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: SITE + '/quote.html?q={search_term_string}' },
          'query-input': 'required name=search_term_string'
        }
      }
    ];
  }

  function webpage(opts) {
    opts = opts || {};
    const node = {
      '@type': opts.type || 'WebPage',
      '@id': abs(opts.url || '/') + '#webpage',
      url: abs(opts.url || '/'),
      name: opts.title || '해태렌트카',
      description: opts.description || '광주 렌트카·렌터카 전문 해태렌트카',
      inLanguage: 'ko-KR',
      isPartOf: { '@id': SITE + '/#website' },
      about: { '@id': SITE + '/#localbusiness' },
      publisher: { '@id': SITE + '/#organization' },
      primaryImageOfPage: { '@type': 'ImageObject', url: abs(opts.image || '/images/banner_1.webp') }
    };
    if (opts.breadcrumb) node.breadcrumb = opts.breadcrumb;
    if (opts.speakableSelectors && opts.speakableSelectors.length) node.speakable = { '@type': 'SpeakableSpecification', cssSelector: opts.speakableSelectors };
    return node;
  }

  function service(opts) {
    opts = opts || {};
    return {
      '@type': 'Service',
      '@id': abs(opts.url || '/') + '#service',
      serviceType: opts.serviceType || '자동차 임대업',
      name: opts.name || '렌트카 상담',
      description: opts.description || '광주 렌트카 상담 서비스',
      url: abs(opts.url || '/quote.html'),
      provider: { '@id': SITE + '/#localbusiness' },
      offers: { '@type': 'AggregateOffer', priceCurrency: 'KRW', lowPrice: String(opts.lowPrice || 400000), highPrice: String(opts.highPrice || 1500000), availability: 'https://schema.org/InStock' }
    };
  }

  function vehicleList(cars, fromCategory, listUrl) {
    cars = Array.isArray(cars) ? cars : [];
    return {
      '@type': 'ItemList',
      '@id': abs(listUrl || '/') + '#itemlist',
      numberOfItems: cars.length,
      itemListElement: cars.map((car, i) => ({ '@type': 'ListItem', position: i + 1, url: abs('/detail.html?id=' + car.id + '&from=' + (fromCategory || 'monthly')), name: car.name, image: abs('/images/' + (car.image || 'logo.png')) }))
    };
  }

  function vehicleProduct(car, fromCategory) {
    car = car || {};
    const url = '/detail.html?id=' + (car.id || '') + '&from=' + (fromCategory || 'monthly');
    return {
      '@type': ['Product', 'Vehicle'],
      '@id': abs(url) + '#product',
      name: car.name || '렌트 차량',
      url: abs(url),
      image: abs('/images/' + (car.image || 'logo.png')),
      description: car.description || '해태렌트카 차량 상담',
      offers: { '@type': 'Offer', priceCurrency: 'KRW', price: String(car.price || 0), availability: 'https://schema.org/InStock', seller: { '@id': SITE + '/#localbusiness' } }
    };
  }

  function faq(faqUrl) {
    let list = [];
    try { if (typeof window.loadFaq === 'function') list = window.loadFaq(); } catch (e) { }
    if (!Array.isArray(list) || !list.length) list = [{ q: '광주 렌트카 상담은 어떻게 신청하나요?', a: '홈페이지 견적문의 또는 전화 상담으로 신청하실 수 있습니다.' }];
    return { '@type': 'FAQPage', '@id': abs(faqUrl || '/quote.html') + '#faq', mainEntity: list.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
  }

  function howto(url) {
    return {
      '@type': 'HowTo',
      '@id': abs(url || '/info.html') + '#howto',
      name: '해태렌트카 렌트 이용 절차',
      step: [
        { '@type': 'HowToStep', position: 1, name: '상담 신청', text: '온라인 견적 폼 또는 전화로 조건을 알려주세요.', url: abs('/quote.html') },
        { '@type': 'HowToStep', position: 2, name: '차량 선택', text: '용도와 예산에 맞는 차량을 선택합니다.', url: abs('/monthly.html') },
        { '@type': 'HowToStep', position: 3, name: '계약 체결', text: '필요 서류 확인 후 계약을 체결합니다.', url: abs('/info.html') },
        { '@type': 'HowToStep', position: 4, name: '차량 인수', text: '지점 방문 또는 협의된 장소에서 차량을 인수합니다.', url: abs('/about.html') }
      ]
    };
  }

  function inject(extra) {
    const graph = coreGraph(info()).concat(extra || []);
    document.querySelectorAll('script[data-seo="haetae"]').forEach(n => n.remove());
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-seo', 'haetae');
    el.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
    document.head.appendChild(el);
  }

  window.HaetaeSEO = {
    SITE, abs, info, inject, breadcrumb, webpage, service, vehicleList, vehicleProduct, faq, howto,
    auto: function (pageKey) {
      if (pageKey === 'home') {
        return [
          webpage({ url: '/', title: '광주 렌트카·렌터카 — 해태렌트카', description: '광주 렌트카·렌터카 전문 해태렌트카. 월렌트, 기간약정, 중고차 장기렌트 상담.', breadcrumb: breadcrumb([{ name: '홈', url: '/' }]), speakableSelectors: ['h1', '.section-heading'] }),
          service({ url: '/monthly.html', serviceType: '월렌트', name: '광주 월렌트', description: '1개월 단위 월렌트 상담', lowPrice: 550000 }),
          service({ url: '/longterm.html', serviceType: '기간약정월렌트', name: '광주 기간약정 렌트', description: '12개월 기간약정 렌트 상담', lowPrice: 400000 })
        ];
      }
      return [];
    }
  };
})();
