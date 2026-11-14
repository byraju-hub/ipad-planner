import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// base './' : 빌드 결과를 cafe24의 어느 폴더에 올려도 동작한다
export default defineConfig({
  plugins: [svelte()],
  base: './',
});
