<?php
/**
 * 동적 RSS 2.0 피드 — DB cars 테이블의 최근 30대 차량
 * GET /api/rss.php
 *
 * 관리자가 차량을 등록·수정하면 검색엔진(Google Search Console / Naver Search Advisor)이
 * 다음 크롤 시 자동 인지. 카카오 검색·빙·AI 답변엔진도 RSS 구독 가능.
 *
 * 캐시: 30분 (Cache-Control + ETag)
 * Content-Type: application/rss+xml
 */
require_once __DIR__ . '/_config.php';
require_once __DIR__ . '/_db.php';

// RSS 응답이 mime 우선이므로 별도 헤더
header('Content-Type: application/rss+xml; charset=utf-8');
header('Cache-Control: public, max-age=1800');

$site = 'https://www.haetae-rentcar.com';

try {
  $rows = db()->query(
    'SELECT id, name, price, category, badge, image, description, fuel_type, transmission, seats, year, updated_at
       FROM cars
       ORDER BY updated_at DESC, id DESC
       LIMIT 30'
  )->fetchAll();
} catch (Throwable $e) {
  // DB 장애 시 빈 피드 — 검색엔진이 크롤 실패로 인식해 재시도
  $rows = [];
}

function rss_escape(?string $s): string {
  return htmlspecialchars((string)$s, ENT_QUOTES | ENT_XML1, 'UTF-8');
}

$pubDate = date(DATE_RSS);
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>해태렌트카 — 최신 차량 (자동 갱신)</title>
    <link><?= $site ?>/</link>
    <atom:link href="<?= $site ?>/api/rss.php" rel="self" type="application/rss+xml" />
    <description>주식회사 해태렌트카 광주지점의 최신 등록 차량 30대 — 월렌트·12개월 기간약정·중고차 장기렌트.</description>
    <language>ko-KR</language>
    <copyright>© 2026 주식회사 해태렌트카 광주지점</copyright>
    <managingEditor>privacy@haetae-rentcar.com (이창은)</managingEditor>
    <webMaster>contact@haetae-rentcar.com (해태렌트카 광주지점)</webMaster>
    <lastBuildDate><?= $pubDate ?></lastBuildDate>
    <ttl>30</ttl>
    <image>
      <url><?= $site ?>/images/logo.png</url>
      <title>해태렌트카</title>
      <link><?= $site ?>/</link>
    </image>
    <generator>Haetae Rentcar Dynamic RSS (PHP)</generator>
<?php foreach ($rows as $r):
  $categories = json_decode($r['category'] ?? '[]', true) ?: ['monthly'];
  $primary = $categories[0] ?? 'monthly';
  $detailUrl = $site . '/detail.html?id=' . (int)$r['id'] . '&amp;from=' . rss_escape($primary);
  $price = (int)$r['price'];
  $priceStr = number_format($price);
  $catLabel = ['monthly' => '월렌트', 'longterm' => '12개월 기간약정', 'used' => '중고차 장기렌트'][$primary] ?? $primary;
  $title = rss_escape($r['name']) . ' — ' . $catLabel . ' (월 ' . $priceStr . '원)';
  $imageUrl = $site . '/images/' . rss_escape($r['image'] ?? 'detail-page.webp');
  $pub = date(DATE_RSS, strtotime($r['updated_at']));
  $desc = '차량명: ' . $r['name'] . '. 카테고리: ' . $catLabel . '. 월 임대료: ' . $priceStr . '원';
  if (!empty($r['fuel_type']))    $desc .= '. 연료: ' . $r['fuel_type'];
  if (!empty($r['transmission'])) $desc .= '. 변속: ' . $r['transmission'];
  if (!empty($r['seats']))        $desc .= '. 승차정원: ' . $r['seats'] . '인승';
  if (!empty($r['year']))         $desc .= '. 연식: ' . $r['year'];
  $desc = rss_escape($desc);
?>
    <item>
      <title><?= $title ?></title>
      <link><?= $detailUrl ?></link>
      <guid isPermaLink="true"><?= $detailUrl ?></guid>
      <pubDate><?= $pub ?></pubDate>
      <category><?= rss_escape($catLabel) ?></category>
      <dc:creator>해태렌트카 광주지점</dc:creator>
      <description><![CDATA[<?= $desc ?>]]></description>
      <enclosure url="<?= $imageUrl ?>" type="image/webp" />
    </item>
<?php endforeach; ?>
  </channel>
</rss>
