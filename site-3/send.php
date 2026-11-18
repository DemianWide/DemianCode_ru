<?php
/**
 * Приём заявки с сайта и пересылка в Telegram.
 * Токен бота лежит в send.config.php (его нет в репозитории и он не виден посетителям).
 * Положите send.php рядом с index.html, а send.config.php создайте по образцу send.config.example.php.
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function out(int $code, bool $ok, string $msg = ''): never {
    http_response_code($code);
    echo json_encode(['ok' => $ok, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(405, false, 'method');

$cfgFile = __DIR__ . '/send.config.php';
if (!is_file($cfgFile)) out(500, false, 'not configured');
$cfg = require $cfgFile;
$token = (string)($cfg['token'] ?? '');
$chat  = (string)($cfg['chat_id'] ?? '');
if ($token === '' || $chat === '') out(500, false, 'not configured');

// Только с вашего сайта
$allowed = (array)($cfg['origins'] ?? []);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && $allowed && !in_array($origin, $allowed, true)) out(403, false, 'origin');

// Простейший лимит: не больше 5 заявок за 10 минут с одного IP
$ip = $_SERVER['REMOTE_ADDR'] ?? '0';
$rl = sys_get_temp_dir() . '/lead_rl_' . md5($ip);
$now = time();
$hits = is_file($rl) ? array_filter(array_map('intval', explode(',', (string)file_get_contents($rl))), fn($t) => $t > $now - 600) : [];
if (count($hits) >= 5) out(429, false, 'rate');
$hits[] = $now;
file_put_contents($rl, implode(',', $hits), LOCK_EX);

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) out(400, false, 'json');

$clean = function ($v, int $max): string {
    $v = is_string($v) ? $v : '';
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $v) ?? '';
    return mb_substr(trim($v), 0, $max);
};
$contact = $clean($in['contact'] ?? '', 80);
$name    = $clean($in['name'] ?? '', 60);
$message = $clean($in['message'] ?? '', 800);
$plan    = $clean($in['plan'] ?? '', 160);
$page    = $clean($in['page'] ?? '', 200);
if (mb_strlen($contact) < 4) out(422, false, 'contact');

$h = fn(string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
$lines = ['<b>Новая заявка с сайта</b>'];
if ($plan !== '')    $lines[] = 'Выбор: ' . $h($plan);
$lines[] = 'Контакт: <b>' . $h($contact) . '</b>';
if ($name !== '')    $lines[] = 'Имя: ' . $h($name);
if ($message !== '') $lines[] = "Задача:\n" . $h($message);
if ($page !== '')    $lines[] = 'Страница: ' . $h($page);
$text = implode("\n", $lines);

$payload = http_build_query(['chat_id' => $chat, 'text' => $text, 'parse_mode' => 'HTML', 'disable_web_page_preview' => 'true']);
$url = "https://api.telegram.org/bot{$token}/sendMessage";

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $payload, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 6]);
    if (!empty($cfg['proxy'])) curl_setopt($ch, CURLOPT_PROXY, (string)$cfg['proxy']);
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
} else {
    $ctx = stream_context_create(['http' => ['method' => 'POST', 'header' => 'Content-Type: application/x-www-form-urlencoded', 'content' => $payload, 'timeout' => 10]]);
    $res = @file_get_contents($url, false, $ctx);
    $code = $res === false ? 0 : 200;
}

if ($res === false || $code !== 200) out(502, false, 'telegram');
out(200, true);
