import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base './' : 빌드 결과를 cafe24의 어느 폴더에 올려도 동작한다
// 빌드할 때마다 바뀌는 버전 표시(설정 화면에서 새 버전이 실행 중인지 확인하는 용도)
const stamp = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  plugins: [svelte()],
  define: { __BUILD__: JSON.stringify(`${stamp} (한국 시간)`) },
  base: './',
  // 개발 서버에서만: 가짜 서버(scripts/mock-api.mjs)가 켜져 있으면 /api 를 그쪽으로 넘긴다
  server: { proxy: process.env.MOCK_API ? { '/api': `http://localhost:${process.env.MOCK_PORT || 5175}` } : undefined },
});
