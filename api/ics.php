<?php
// iPad 캘린더 구독용 .ics. 로그인 쿠키를 쓸 수 없어 긴 임의 토큰으로 보호한다(읽기 전용).
require __DIR__ . '/_lib.php';

$bucket = 'ics:' . client_ip();
$token = $_GET['token'] ?? '';
$real = meta_get('ics_token');
if (!is_string($token) || $real === null || !hash_equals($real, $token)) {
    // 틀린 토큰만 제한한다. 맞는 토큰은 차단하지 않는다.
    header('Content-Type: text/plain; charset=utf-8');
    if (attempts_locked($bucket) > 0) {
        http_response_code(429);
        exit('too many requests');
    }
    attempts_add($bucket);
    usleep(500000);
    http_response_code(403);
    exit('forbidden');
}

function ics_esc($s)
{
    return str_replace(["\\", ';', ',', "\r\n", "\n", "\r"], ["\\\\", '\\;', '\\,', '\\n', '\\n', '\\n'], (string) $s);
}

// 75바이트 기준으로 줄을 접는다(문자 중간에서 자르지 않는다)
function ics_fold($line)
{
    $out = '';
    $len = 0;
    foreach (preg_split('//u', $line, -1, PREG_SPLIT_NO_EMPTY) as $ch) {
        $b = strlen($ch);
        if ($len + $b > 74) {
            $out .= "\r\n ";
            $len = 1;
        }
        $out .= $ch;
        $len += $b;
    }
    return $out;
}

function ics_trigger($alarm, $allDay)
{
    if ($allDay) {
        // 종일 일정은 당일 오전 9시(하루 전은 전날 오전 9시)에 알린다
        return $alarm === '1d' ? '-PT15H' : 'PT9H';
    }
    $map = ['at' => 'PT0S', '10m' => '-PT10M', '1h' => '-PT1H', '1d' => '-P1D'];
    return $map[$alarm];
}

$tz = new DateTimeZone('Asia/Seoul');
$lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ip-planner//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:플래너',
    'X-WR-TIMEZONE:Asia/Seoul',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Seoul',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0900',
    'TZOFFSETTO:+0900',
    'TZNAME:KST',
    'END:STANDARD',
    'END:VTIMEZONE',
];

$rows = db()->query('SELECT * FROM ip_events WHERE deleted = 0')->fetchAll();
$rrule = ['weekly' => 'FREQ=WEEKLY', 'monthly' => 'FREQ=MONTHLY', 'yearly' => 'FREQ=YEARLY'];
foreach ($rows as $e) {
    $allDay = ((int) $e['all_day'] === 1) || $e['start_time'] === null;
    $stamp = gmdate('Ymd\THis\Z', (int) floor($e['updated'] / 1000));
    $lines[] = 'BEGIN:VEVENT';
    $lines[] = 'UID:' . $e['id'] . '@ip-planner';
    $lines[] = 'DTSTAMP:' . $stamp;
    $lines[] = 'LAST-MODIFIED:' . $stamp;
    $lines[] = 'SUMMARY:' . ics_esc($e['title']);
    if ($e['memo'] !== '') {
        $lines[] = 'DESCRIPTION:' . ics_esc($e['memo']);
    }
    if ($allDay) {
        $start = new DateTime($e['start_date'], $tz);
        $end = new DateTime($e['end_date'], $tz);
        $end->modify('+1 day');
        $lines[] = 'DTSTART;VALUE=DATE:' . $start->format('Ymd');
        $lines[] = 'DTEND;VALUE=DATE:' . $end->format('Ymd');
    } else {
        $start = new DateTime($e['start_date'] . ' ' . $e['start_time'], $tz);
        $end = $e['end_time'] !== null ? new DateTime($e['end_date'] . ' ' . $e['end_time'], $tz) : null;
        if ($end === null || $end <= $start) {
            $end = clone $start;
            $end->modify('+1 hour');
        }
        $lines[] = 'DTSTART;TZID=Asia/Seoul:' . $start->format('Ymd\THis');
        $lines[] = 'DTEND;TZID=Asia/Seoul:' . $end->format('Ymd\THis');
    }
    if (isset($rrule[$e['repeat_rule']])) {
        $lines[] = 'RRULE:' . $rrule[$e['repeat_rule']];
    }
    if ($e['alarm'] !== 'none') {
        $lines[] = 'BEGIN:VALARM';
        $lines[] = 'ACTION:DISPLAY';
        $lines[] = 'DESCRIPTION:' . ics_esc($e['title']);
        $lines[] = 'TRIGGER:' . ics_trigger($e['alarm'], $allDay);
        $lines[] = 'END:VALARM';
    }
    $lines[] = 'END:VEVENT';
}
$lines[] = 'END:VCALENDAR';

header('Content-Type: text/calendar; charset=utf-8');
header('Content-Disposition: inline; filename="planner.ics"');
header('Cache-Control: private, max-age=300');
header('X-Content-Type-Options: nosniff');
echo implode("\r\n", array_map('ics_fold', $lines)) . "\r\n";
