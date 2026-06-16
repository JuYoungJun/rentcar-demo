<?php
/**
 * DB 연결 (PDO) — 모든 API 엔드포인트에서 require_once
 */
require_once __DIR__ . '/_config.php';

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', DB_HOST, DB_NAME, DB_CHARSET);
  try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
  } catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB_CONNECTION_FAILED']);
    exit;
  }
  return $pdo;
}
