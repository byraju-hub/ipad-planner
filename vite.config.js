import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base './' : 빌드 결과를 cafe24의 어느 폴더에 올려도 동작한다
export default defineConfig({
  plugins: [svelte()],
  base: './',
  // 개발 서버에서만: 가짜 서버(scripts/mock-api.mjs)가 켜져 있으면 /api 를 그쪽으로 넘긴다
  server: { proxy: process.env.MOCK_API ? { '/api': 'http://localhost:5175' } : undefined },
});
