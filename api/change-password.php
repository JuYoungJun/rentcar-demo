<?php
require_once __DIR__ . '/_helpers.php';
cors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(['error' => 'METHOD'], 405);

$sess = require_auth();
require_csrf($sess);

$body = json_in();
$curr = (string)($body['currentPw'] ?? '');
$next = (string)($body['newPw'] ?? '');
if (!$curr || !$next)     json_out(['ok' => false, 'message' => '현재/새 비밀번호를 모두 입력해주세요.'], 400);
if (strlen($next) < 8)    json_out(['ok' => false, 'message' => '새 비밀번호는 8자 이상이어야 합니다.'], 400);
if ($curr === $next)      json_out(['ok' => false, 'message' => '새 비밀번호가 기존과 동일합니다.'], 400);

$st = db()->prepare('SELECT password_hash FROM admins WHERE id = ? LIMIT 1');
$st->execute([$sess['admin_id']]);
$row = $st->fetch();
if (!$row || !password_verify($curr, $row['password_hash'])) {
  json_out(['ok' => false, 'message' => '현재 비밀번호가 올바르지 않습니다.'], 401);
}
$newHash = password_hash($next, PASSWORD_BCRYPT, ['cost' => 12]);
db()->prepare('UPDATE admins SET password_hash = ? WHERE id = ?')->execute([$newHash, $sess['admin_id']]);

// 보안: 비번 변경 후 다른 세션 모두 무효화
db()->prepare('DELETE FROM sessions WHERE admin_id = ? AND token != ?')
   ->execute([$sess['admin_id'], $sess['token']]);

json_out(['ok' => true]);
