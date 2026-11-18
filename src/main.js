import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { installPalmRejection } from './lib/palm.js';
import { isDemo, seedDemo } from './lib/demo.js';
import { auth } from './lib/auth.svelte.js';

installPalmRejection();

// 데모(?demo): 샘플 데이터를 메모리에만 채우고 로그인 없이 연다
if (isDemo) {
  await seedDemo();
  auth.status = 'demo';
}

mount(App, { target: document.getElementById('app') });

// 오프라인에서도 열리도록 서비스 워커 등록(배포 버전에서만)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
