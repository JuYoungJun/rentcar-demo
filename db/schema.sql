-- ══════════════════════════════════════════════════════════
-- 해태렌트카 — MySQL 스키마 (운영 배포용)
-- ──────────────────────────────────────────────────────────
-- 카페24 호스팅 기준 (MySQL 5.7+ / utf8mb4_general_ci)
-- DB 생성 후 이 파일을 phpMyAdmin 또는 mysql CLI 로 import
--   $ mysql -u USER -p DB_NAME < db/schema.sql
-- ══════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ────────────────────────────────────────────────
-- 관리자 계정 (auth)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `admins` (
  `id`            INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(64)       NOT NULL,
  `password_hash` VARCHAR(255)      NOT NULL COMMENT 'PHP password_hash(BCRYPT)',
  `display_name`  VARCHAR(64)       NOT NULL,
  `role`          ENUM('super','editor') NOT NULL DEFAULT 'editor',
  `last_login_at` DATETIME              NULL,
  `created_at`    DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 기본 super admin 계정 (비밀번호: admin1234)
-- 운영 시: PHP 로 password_hash('실제비번', PASSWORD_BCRYPT) 결과로 교체
INSERT IGNORE INTO `admins` (`username`, `password_hash`, `display_name`, `role`) VALUES
  ('admin', '$2y$10$1234567890123456789012ueLNJzhZsXJxYqsCH8RJjN9wVnPHrJTC', '최고 관리자', 'super');

-- ────────────────────────────────────────────────
-- 세션 (Bearer 토큰)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `sessions` (
  `token`           CHAR(64)        NOT NULL COMMENT 'random hex',
  `admin_id`        INT UNSIGNED    NOT NULL,
  `csrf_token`      CHAR(48)        NOT NULL,
  `ip_address`      VARCHAR(45)         NULL,
  `user_agent`      VARCHAR(255)        NULL,
  `last_activity_at` DATETIME       NOT NULL,
  `expires_at`      DATETIME        NOT NULL,
  `created_at`      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`token`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_expires`  (`expires_at`),
  CONSTRAINT `fk_session_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ────────────────────────────────────────────────
-- 차량 (cars)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `cars` (
  `id`             INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(80)      NOT NULL,
  `year`           SMALLINT UNSIGNED    NULL,
  `price`          INT UNSIGNED     NOT NULL,
  `badge`          VARCHAR(20)          NULL,
  `image`          VARCHAR(255)         NULL,
  `categories`     JSON             NOT NULL COMMENT '["monthly","longterm","used"]',
  `tags`           JSON                 NULL,
  `fuel_type`      VARCHAR(20)          NULL,
  `transmission`   VARCHAR(20)          NULL,
  `seats`          TINYINT UNSIGNED     NULL,
  `mileage`        INT UNSIGNED         NULL,
  `description`    TEXT                 NULL,
  `features`       JSON                 NULL,
  `detail_image`   VARCHAR(255)         NULL,
  `views`          INT UNSIGNED     NOT NULL DEFAULT 0,
  `inquiries`      INT UNSIGNED     NOT NULL DEFAULT 0,
  `contracts`      INT UNSIGNED     NOT NULL DEFAULT 0,
  `sort_order`     INT              NOT NULL DEFAULT 0,
  `created_at`     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ────────────────────────────────────────────────
-- 사이트 설정 (key-value)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `settings` (
  `key`        VARCHAR(64)   NOT NULL,
  `value`      LONGTEXT          NULL,
  `updated_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `settings` (`key`, `value`) VALUES
  ('site',     '{"topBannerText":"월렌트 전문 해태렌트카","contactPhone":"062-714-1688","contactHours":"평일 09:00~19:00\\n주말 10:00~19:00","branchName":"해태렌트카 광주지점","branchHours":"평일 09:00 - 19:00 / 주말 10:00 - 19:00","footerDesc":"안전과 투명한 운영을 최우선으로\\n믿고 맡길 수 있는 렌트카 서비스","footerCopyright":"© 2026 해태렌트카. All rights reserved.","defaultDetailBanner":"detail-page.webp"}'),
  ('business', '{"companyName":"주식회사 해태렌트카 광주지점","ceoName":"이창은","bizRegNumber":"476-85-02430","corpRegNumber":"205611-0017730","openedAt":"2022-12-13","onlineSalesNumber":"","industry":"서비스업 / 렌트카","address":"광주광역시 광산구 북문대로433번길 45 (신창동)","headOfficeAddress":"전라남도 영광군 법성면 굴비로1길 146, 101호","contactEmail":"contact@haetae-rentcar.com","privacyOfficerName":"이창은","privacyEmail":"privacy@haetae-rentcar.com","privacyPhone":"010-6611-6633","kakaoChatUrl":"https://open.kakao.com/o/sPZhlPzi"}'),
  ('about',    '{"heading":"경차 월렌트 전문 해태렌트카","subheading":"합리적인 가격과 편리한 이용을 제공하는\\n경차 월렌트 전문 업체입니다.","description":"사회초년생, 직장인, 장기 출장 및 차량이 필요한 고객분들을 위해 부담 없는 비용으로 안정적인 월렌트 서비스를 제공하고 있습니다. 철저한 차량 관리와 신속한 배차, 친절한 상담을 바탕으로 고객 만족을 최우선으로 생각하며, 믿고 이용할 수 있는 든든한 이동 파트너가 되겠습니다.\\n언제나 합리적인 가격과 최고의 서비스로 고객 여러분과 함께하겠습니다.","stat1Label":"누적 고객 수","stat1Value":15000,"stat2Label":"보유 차량","stat2Value":500,"stat3Label":"고객 만족도 (%)","stat3Value":98,"stat4Label":"전국 지점","stat4Value":8}'),
  ('banners',  '["banner_1.webp","banner_2.webp","banner_3.webp","banner_4.webp","banner_5.webp"]'),
  ('banner_meta', '{}'),
  ('hero_banners', '{"monthly":{"desktop":"hero_monthly.jpg","mobile":"hero_monthly_mobile.webp","alt":"월렌트"},"longterm":{"desktop":"hero_longterm.jpg","mobile":"hero_longterm_mobile.webp","alt":"12개월 기간약정"},"used":{"desktop":"hero_used.jpg","mobile":"hero_used_mobile.webp","alt":"중고차 장기렌트"}}'),
  ('faq',      '[]'),
  ('info',     '{"intro":"","sections":[]}'),
  ('form_options', '{"categories":["월렌트","12개월 기간약정","중고차 장기렌트","법인 렌트"],"regions":["서울","경기","인천","부산","대구","광주","대전","제주"],"periods":["1개월","3개월","6개월","12개월","24개월","36개월","48개월"],"experiences":["1년 미만","1~3년","3~5년","5년 이상"]}'),
  ('terms',    '{"title":"이용약관","effective":"시행일자 2026년 5월 8일","intro":"","sections":[]}'),
  ('privacy',  '{"title":"개인정보처리방침","effective":"시행일자 2026년 5월 8일","intro":"","sections":[]}');

-- ────────────────────────────────────────────────
-- 문의 (inquiries)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `inquiries` (
  `id`          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `created_at`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `source`      VARCHAR(32)        NULL,
  `type`        VARCHAR(32)        NULL,
  `category`    VARCHAR(64)        NULL,
  `car_name`    VARCHAR(80)        NULL,
  `car_id`      INT UNSIGNED       NULL,
  `name`        VARCHAR(64)        NULL,
  `phone`       VARCHAR(32)        NULL,
  `region`      VARCHAR(32)        NULL,
  `period`      VARCHAR(32)        NULL,
  `start_date`  VARCHAR(32)        NULL,
  `experience`  VARCHAR(32)        NULL,
  `message`     TEXT               NULL,
  `is_read`     TINYINT(1)     NOT NULL DEFAULT 0,
  `status`      ENUM('new','contacted','quoted','contracted','cancelled') NOT NULL DEFAULT 'new',
  `ip_address`  VARCHAR(45)        NULL,
  `user_agent`  VARCHAR(255)       NULL,
  PRIMARY KEY (`id`),
  KEY `idx_created` (`created_at`),
  KEY `idx_status`  (`status`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_car_id`  (`car_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ────────────────────────────────────────────────
-- 활동 로그 (조회/문의/계약 — TOP 5 랭킹용)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `activity` (
  `id`        BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `car_id`    INT UNSIGNED    NOT NULL,
  `kind`      ENUM('view','inquiry','contract') NOT NULL,
  `created_at` DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_car_kind_date` (`car_id`, `kind`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ────────────────────────────────────────────────
-- 업로드된 이미지 메타 (실제 파일은 /images/uploads/ 에 저장)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `uploaded_images` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255)  NOT NULL,
  `path`       VARCHAR(255)  NOT NULL COMMENT '예: images/uploads/2026/06/foo.webp',
  `mime`       VARCHAR(50)       NULL,
  `bytes`      INT UNSIGNED  NOT NULL DEFAULT 0,
  `width`      SMALLINT UNSIGNED NULL,
  `height`     SMALLINT UNSIGNED NULL,
  `uploaded_by` INT UNSIGNED     NULL,
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
