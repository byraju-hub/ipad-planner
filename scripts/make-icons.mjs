// 앱 아이콘(PNG)을 만든다: node scripts/make-icons.mjs
// 어두운 바탕에 흰 달력 면, 윗부분은 빨강, 아래는 날짜 점 격자.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';

const BG = [29, 29, 31];
const PAGE = [255, 255, 255];
const RED = [215, 0, 21];
const DOT = [200, 200, 206];
const RING = [29, 29, 31];

// 한 점의 색(0~1 좌표). 바깥에서 안쪽 순서로 덮어 쓴다.
// 달력 그림을 가운데 기준으로 키운다(다른 앱 아이콘과 같은 크기로 보이게). 1이면 예전 크기.
const GROW = 1.26;
function colorAt(x, y) {
  x = (x - 0.5) / GROW + 0.5;
  y = (y - 0.5) / GROW + 0.5;
  let c = BG;
  const inRound = (x0, y0, x1, y1, r) => {
    const cx = Math.min(Math.max(x, x0 + r), x1 - r);
    const cy = Math.min(Math.max(y, y0 + r), y1 - r);
    return x >= x0 && x <= x1 && y >= y0 && y <= y1 && Math.hypot(x - cx, y - cy) <= r;
  };
  if (inRound(0.19, 0.2, 0.81, 0.8, 0.075)) {
    c = PAGE;
    if (y < 0.37) c = RED; // 윗부분
    // 고리 두 개
    for (const rx of [0.36, 0.64]) {
      if (Math.hypot(x - rx, y - 0.2) <= 0.032) c = RING;
    }
    // 날짜 점 4 x 2
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 2; row++) {
        if (Math.hypot(x - (0.305 + col * 0.13), y - (0.52 + row * 0.13)) <= 0.034) c = DOT;
      }
    }
    // 오늘 표시(빨간 원)
    if (Math.hypot(x - (0.305 + 3 * 0.13), y - (0.52 + 0.13)) <= 0.034) c = RED;
  }
  return c;
}

function render(size) {
  const ss = 3; // 가장자리를 부드럽게 하는 겹쳐 그리기
  const raw = Buffer.alloc((size * 3 + 1) * size);
  let o = 0;
  for (let py = 0; py < size; py++) {
    raw[o++] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = colorAt((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = ss * ss;
      raw[o++] = Math.round(r / n);
      raw[o++] = Math.round(g / n);
      raw[o++] = Math.round(b / n);
    }
  }
  return png(size, raw);
}

function png(size, raw) {
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // 8비트
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public', { recursive: true });
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  writeFileSync(`public/${name}`, render(size));
  console.log('wrote', name);
}
