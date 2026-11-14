// cafe24 배포: node scripts/deploy.mjs [--setup]
//  1) 빌드  2) dist/ 와 api/ 를 FTP로 올림  3) 비밀 설정(config.php)을 웹 루트 밖(~/private/ip)에 올림
//  --setup : 최초 1회. 테이블을 만들고 관리자 비밀번호를 설정한다(비밀번호는 .admin-password.txt에 저장).
// 접속 정보는 .env.deploy(Git에 올라가지 않음)에서 읽는다.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { Client } from 'basic-ftp';

const env = Object.fromEntries(
  readFileSync('.env.deploy', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
const setup = process.argv.includes('--setup');
const REMOTE = env.REMOTE_DIR || '/www/ip';
const SITE = env.SITE_URL.replace(/\/?$/, '/');

console.log('빌드 중…');
execSync('npm run build', { stdio: 'inherit' });

const tmp = mkdtempSync(join(tmpdir(), 'ip-deploy-'));
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const setupKey = randomBytes(24).toString('hex');
const config = `<?php
// 자동 생성 파일(scripts/deploy.mjs). Git에 올리지 않는다.
return [
  'db' => ['host' => ${q(env.DB_HOST)}, 'port' => ${Number(env.DB_PORT || 3306)}, 'name' => ${q(env.DB_NAME)}, 'user' => ${q(env.DB_USER)}, 'pass' => ${q(env.DB_PASS)}],
  'setup_key' => ${q(setupKey)},
  'site_url' => ${q(SITE)},
];
`;
const configPath = join(tmp, 'config.php');
writeFileSync(configPath, config);

const client = new Client(60000);
try {
  await client.access({
    host: env.FTP_HOST, port: Number(env.FTP_PORT || 21), user: env.FTP_USER, password: env.FTP_PASS, secure: false,
  });

  // 비밀 설정은 웹에서 열 수 없는 ~/private/ip 에 둔다
  await client.ensureDir('/private/ip');
  await client.uploadFrom(configPath, '/private/ip/config.php');
  console.log('설정 파일 업로드 → /private/ip/config.php');

  // 화면(빌드 결과). 이전 해시 파일이 쌓이지 않게 assets 는 비우고 올린다
  await client.ensureDir(REMOTE);
  try { await client.removeDir(`${REMOTE}/assets`); } catch { /* 처음 배포 */ }
  await client.cd('/');
  await client.ensureDir(REMOTE);
  await client.uploadFromDir('dist');
  await client.uploadFrom('deploy/root.htaccess', `${REMOTE}/.htaccess`);
  console.log('화면 파일 업로드');

  // 서버 코드
  await client.ensureDir(`${REMOTE}/api`);
  const skip = (f) => f === 'config.php' || (f === 'setup.php' && !setup);
  for (const f of readdirSync('api')) {
    if (skip(f)) continue;
    await client.uploadFrom(join('api', f), `${REMOTE}/api/${f}`);
  }
  try { await client.remove(`${REMOTE}/probe.php`); } catch { /* 없음 */ }
  console.log('서버 코드 업로드');

  if (setup) {
    const password = randomBytes(15).toString('base64').replace(/[+/=]/g, 'x').slice(0, 20);
    const res = await fetch(`${SITE}api/setup.php`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: setupKey, password }),
    });
    const body = await res.text();
    console.log('설치 응답:', res.status, body);
    if (res.ok) {
      writeFileSync('.admin-password.txt', password + '\n');
      console.log('관리자 비밀번호를 .admin-password.txt 에 저장했습니다(Git 제외).');
    }
    try { await client.remove(`${REMOTE}/api/setup.php`); console.log('setup.php 삭제 확인'); } catch { console.log('setup.php 는 이미 삭제됨'); }
  }
  console.log('완료:', SITE);
} finally {
  client.close();
}
