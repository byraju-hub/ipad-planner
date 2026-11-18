// 설치용 꾸러미 만들기: node scripts/package.mjs [출력폴더]
//  빌드 결과(dist) + 서버 코드(api) + 설치 화면(install.php)을 한 폴더에 모은다. 이 폴더를 ZIP으로 묶어 릴리스에 붙인다.
//  받는 사람은 Node.js 없이 폴더 내용을 FTP로 올리고 브라우저에서 install.php 를 열면 된다.
//  숨김 파일(.htaccess)은 올릴 때 빠지기 쉬워서 htaccess.txt 로 넣고, install.php 가 .htaccess 로 만들어 준다.
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] || 'release/ipad-planner';
if (!existsSync('dist/index.html')) throw new Error('먼저 npm run build 를 실행하세요.');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'api'), { recursive: true });
cpSync('dist', out, { recursive: true });

for (const f of readdirSync('api')) {
  if (f === 'setup.php' || f === 'config.php') continue; // setup.php 는 npm run deploy 전용
  cpSync(join('api', f), join(out, 'api', f === '.htaccess' ? 'htaccess.txt' : f));
}
cpSync('deploy/root.htaccess', join(out, 'htaccess.txt'));
cpSync('install.php', join(out, 'install.php'));
writeFileSync(
  join(out, 'INSTALL.txt'),
  [
    '아이패드 웹앱 플래너 설치 안내',
    '',
    '1. 이 폴더 안의 모든 파일과 폴더를 호스팅의 웹 폴더(예: www/ip)에 FTP로 올립니다.',
    '2. 브라우저에서 올린 주소 뒤에 install.php 를 붙여 엽니다. (예: https://내도메인.com/ip/install.php)',
    '3. 데이터베이스 정보와 관리자 계정을 입력하고 설치하기를 누릅니다.',
    '',
    '자세한 설명: https://byraju-hub.github.io/ipad-planner/#install',
    '',
  ].join('\r\n'),
);
console.log('설치 꾸러미:', out);
