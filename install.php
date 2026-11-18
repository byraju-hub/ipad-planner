<?php
// 설치 화면: 서버에 파일을 올린 뒤 브라우저로 이 파일을 열어 한 번만 실행합니다.
// 데이터베이스 정보를 받아 설정 파일을 만들고, 표를 만들고, 관리자 계정을 만듭니다.
// 성공하면 이 파일은 스스로 삭제됩니다. (소스 저장소에서는 npm run deploy 를 쓰므로 필요 없습니다.)
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

function h($s)
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

// _lib.php 의 ip_config() 와 같은 위치: 웹에서 열 수 없는 ~/private/ip 를 먼저, 안 되면 api/config.php
function cfg_paths()
{
    return [dirname(__DIR__, 2) . '/private/ip/config.php', __DIR__ . '/api/config.php'];
}

function page($title, $body, $code = 200)
{
    http_response_code($code);
    echo '<!doctype html><html lang="ko"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="robots" content="noindex"><title>' . h($title) . ' · 아이패드 웹앱 플래너</title>'
        . '<style>'
        . ':root{--text:#1d1d1f;--text-2:#6e6e73;--line:#e5e5ea;--red:#e5483e;--blue:#0071e3}'
        . '*{box-sizing:border-box}body{margin:0;background:#f5f5f7;color:var(--text);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;word-break:keep-all}'
        . 'main{max-width:520px;margin:0 auto;padding:40px 20px 60px}'
        . 'h1{font-size:24px;margin:0 0 6px}h2{font-size:16px;margin:28px 0 4px}'
        . '.card{background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}'
        . '.lead,.hint{color:var(--text-2);font-size:14px;margin:0 0 12px}.hint{margin:4px 0 0}'
        . 'label{display:block;font-size:14px;font-weight:600;margin-top:14px}'
        . 'input{width:100%;height:46px;padding:0 12px;border:1px solid #d1d1d6;border-radius:12px;font:inherit;margin-top:6px}'
        . 'input:focus-visible{outline:2px solid var(--blue);outline-offset:-1px;border-color:transparent}'
        . '.row{display:flex;gap:12px}.row>div{flex:1}.row>div.port{flex:0 0 110px}'
        . 'button{margin-top:24px;width:100%;height:50px;border:0;border-radius:25px;background:var(--text);color:#fff;font:inherit;font-weight:600;cursor:pointer}'
        . '.err{background:#fff0ef;color:#a3261d;border-radius:12px;padding:12px 14px;font-size:14px;margin:0 0 16px}'
        . '.ok{color:#1b6b34}.btn{display:inline-block;margin-top:18px;padding:12px 24px;border-radius:25px;background:var(--text);color:#fff;text-decoration:none;font-weight:600}'
        . 'code{background:#f2f2f4;border-radius:6px;padding:1px 6px;font-size:14px}'
        . '</style></head><body><main><h1>' . h($title) . '</h1>' . $body . '</main></body></html>';
    exit;
}

// 이미 설치돼 있으면 다시 설치하지 않는다(누가 열어도 아무것도 바뀌지 않는다)
foreach (cfg_paths() as $p) {
    if (is_file($p)) {
        $gone = @unlink(__FILE__);
        page(
            '이미 설치되어 있습니다',
            '<div class="card"><p>이 서버에는 이미 플래너가 설치되어 있습니다. <a href="./">플래너로 가기</a></p>'
            . ($gone ? '<p class="lead">설치 화면 파일(install.php)은 지웠습니다.</p>' : '<p class="lead">서버에서 <code>install.php</code> 파일을 지워 주세요.</p>')
            . '</div>'
        );
    }
}

$problems = [];
if (PHP_VERSION_ID < 80000) {
    $problems[] = 'PHP 8.0 이상이 필요합니다. 지금 서버는 PHP ' . PHP_VERSION . ' 입니다. 호스팅 관리 화면에서 PHP 버전을 올려 주세요.';
}
if (!extension_loaded('pdo_mysql')) {
    $problems[] = '이 서버의 PHP에서 MySQL(PDO)을 쓸 수 없습니다. 호스팅 업체에 문의해 주세요.';
}
if ($problems) {
    page('설치할 수 없습니다', '<div class="card">' . implode('', array_map(function ($m) {
        return '<p class="err">' . h($m) . '</p>';
    }, $problems)) . '</div>', 500);
}

$f = ['db_host' => 'localhost', 'db_port' => '3306', 'db_name' => '', 'db_user' => '', 'admin' => 'admin'];
$error = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    foreach (['db_host', 'db_port', 'db_name', 'db_user', 'admin'] as $k) {
        $f[$k] = trim((string) ($_POST[$k] ?? ''));
    }
    $dbPass = (string) ($_POST['db_pass'] ?? '');
    $pw = (string) ($_POST['pw'] ?? '');
    $pw2 = (string) ($_POST['pw2'] ?? '');
    $f['admin'] = strtolower($f['admin']);

    if (!preg_match('/^[A-Za-z0-9._:-]{1,100}$/', $f['db_host'])) {
        $error = '데이터베이스 주소를 확인해 주세요. 보통 localhost 입니다.';
    } elseif (!ctype_digit($f['db_port']) || (int) $f['db_port'] < 1 || (int) $f['db_port'] > 65535) {
        $error = '포트는 숫자로 적어 주세요. 보통 3306 입니다.';
    } elseif (!preg_match('/^[A-Za-z0-9_$-]{1,64}$/', $f['db_name'])) {
        $error = '데이터베이스 이름을 확인해 주세요.';
    } elseif ($f['db_user'] === '' || strlen($f['db_user']) > 80 || $dbPass === '' || strlen($dbPass) > 200) {
        $error = '데이터베이스 아이디와 비밀번호를 입력해 주세요.';
    }

    $pdo = null;
    $existing = false;
    if (!$error) {
        try {
            $pdo = new PDO(
                "mysql:host={$f['db_host']};port={$f['db_port']};dbname={$f['db_name']};charset=utf8mb4",
                $f['db_user'],
                $dbPass,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 10]
            );
            $existing = (bool) $pdo->query("SHOW TABLES LIKE 'ip\\_meta'")->fetchColumn();
        } catch (Throwable $e) {
            error_log('[ip-planner install] ' . $e->getMessage());
            $error = '데이터베이스에 연결하지 못했습니다. 주소·이름·아이디·비밀번호를 다시 확인해 주세요.';
        }
    }

    // 이미 플래너 표가 있는 데이터베이스(서버 이전·다시 올리기)면 기존 데이터를 그대로 쓰고 관리자는 새로 만들지 않는다
    if (!$error && !$existing) {
        if (!preg_match('/^[a-z0-9][a-z0-9_.-]{1,29}$/', $f['admin'])) {
            $error = '관리자 아이디는 영문 소문자·숫자와 . _ - 로 2~30자여야 합니다.';
        } elseif (strlen($pw) < 12 || strlen($pw) > 200) {
            $error = '관리자 비밀번호는 12자 이상이어야 합니다.';
        } elseif ($pw !== $pw2) {
            $error = '비밀번호 확인이 서로 다릅니다.';
        }
    }

    if (!$error) {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
        $host = preg_match('/^[A-Za-z0-9.:-]+$/', (string) ($_SERVER['HTTP_HOST'] ?? '')) ? $_SERVER['HTTP_HOST'] : '';
        $dir = rtrim(str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/'))), '/');
        $siteUrl = $host ? ($https ? 'https' : 'http') . '://' . $host . $dir . '/' : '';
        $config = "<?php\n// 설치 화면(install.php)이 만든 파일입니다. 비밀번호가 들어 있으니 다른 사람에게 보내지 마세요.\nreturn "
            . var_export([
                'db' => ['host' => $f['db_host'], 'port' => (int) $f['db_port'], 'name' => $f['db_name'], 'user' => $f['db_user'], 'pass' => $dbPass],
                'setup_key' => bin2hex(random_bytes(24)),
                'site_url' => $siteUrl,
            ], true) . ";\n";

        // 숨김 파일(.htaccess)은 압축을 풀거나 올릴 때 빠지기 쉬워서, 없으면 견본(htaccess.txt)에서 만들어 둔다
        foreach ([['htaccess.txt', '.htaccess'], ['api/htaccess.txt', 'api/.htaccess']] as [$from, $to]) {
            if (!is_file(__DIR__ . '/' . $to) && is_file(__DIR__ . '/' . $from)) {
                @copy(__DIR__ . '/' . $from, __DIR__ . '/' . $to);
            }
        }

        $written = null;
        $priv = dirname(__DIR__, 2) . '/private/ip';
        if ((is_dir($priv) || @mkdir($priv, 0700, true)) && @file_put_contents($priv . '/config.php', $config, LOCK_EX) !== false) {
            $written = $priv . '/config.php';
        } elseif (is_file(__DIR__ . '/api/.htaccess') && @file_put_contents(__DIR__ . '/api/config.php', $config, LOCK_EX) !== false) {
            $written = __DIR__ . '/api/config.php';
        }
        if (!$written) {
            $error = '설정 파일을 저장하지 못했습니다. 이 폴더(api 포함)에 쓰기 권한이 있는지 확인해 주세요.';
        } else {
            @chmod($written, 0600);
            try {
                require_once __DIR__ . '/api/_lib.php';
                require_once __DIR__ . '/api/_schema.php';
                if ($existing) {
                    db(); // 옛 구조면 이때 새 구조로 바뀐다
                } else {
                    ip_create_tables();
                    user_create($f['admin'], '관리자', $pw, true);
                }
            } catch (Throwable $e) {
                error_log('[ip-planner install] ' . $e);
                @unlink($written);
                $error = '표를 만들지 못했습니다. 데이터베이스 계정에 표를 만들 권한이 있는지 확인해 주세요.';
                $written = null;
            }
        }

        if ($written) {
            $gone = @unlink(__FILE__);
            page(
                '설치가 끝났습니다',
                '<div class="card"><p class="ok"><b>플래너를 설치했습니다.</b></p>'
                . ($existing
                    ? '<p>이미 있던 데이터를 그대로 이어서 씁니다. 기존 관리자 계정으로 로그인하세요.</p>'
                    : '<p>관리자 아이디는 <code>' . h($f['admin']) . '</code> 입니다. 방금 정한 비밀번호로 로그인하세요.</p>')
                . ($gone ? '<p class="lead">설치 화면 파일(install.php)은 지웠습니다.</p>' : '<p class="err">서버에서 <code>install.php</code> 파일을 직접 지워 주세요.</p>')
                . '<a class="btn" href="./">플래너 열기</a></div>'
            );
        }
    }
}

$body = '<p class="lead">데이터베이스 정보와 관리자 계정을 입력하면 설치가 끝납니다.</p>'
    . '<form class="card" method="post" autocomplete="off">'
    . ($error ? '<p class="err" role="alert">' . h($error) . '</p>' : '')
    . '<h2 style="margin-top:0">데이터베이스</h2>'
    . '<p class="hint" style="margin-top:0">호스팅 관리 화면에서 확인할 수 있습니다.</p>'
    . '<div class="row"><div><label for="db_host">주소</label><input id="db_host" name="db_host" value="' . h($f['db_host']) . '" required></div>'
    . '<div class="port"><label for="db_port">포트</label><input id="db_port" name="db_port" inputmode="numeric" value="' . h($f['db_port']) . '" required></div></div>'
    . '<label for="db_name">이름</label><input id="db_name" name="db_name" value="' . h($f['db_name']) . '" required>'
    . '<label for="db_user">아이디</label><input id="db_user" name="db_user" value="' . h($f['db_user']) . '" required>'
    . '<label for="db_pass">비밀번호</label><input id="db_pass" name="db_pass" type="password" required>'
    . '<h2>관리자 계정</h2>'
    . '<p class="hint" style="margin-top:0">플래너에 로그인할 때 쓰고, 나중에 다른 사용자를 추가할 수 있습니다.</p>'
    . '<label for="admin">아이디 (영문 소문자·숫자)</label><input id="admin" name="admin" autocapitalize="none" autocorrect="off" spellcheck="false" value="' . h($f['admin']) . '" required>'
    . '<label for="pw">비밀번호 (12자 이상)</label><input id="pw" name="pw" type="password" autocomplete="new-password" required>'
    . '<label for="pw2">비밀번호 확인</label><input id="pw2" name="pw2" type="password" autocomplete="new-password" required>'
    . '<button type="submit">설치하기</button></form>';
page('플래너 설치', $body);
