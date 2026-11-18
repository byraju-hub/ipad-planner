<script>
  import { login, auth } from './auth.svelte.js';

  const remembered = (() => {
    try {
      return localStorage.getItem('ip-last-user') || '';
    } catch {
      return '';
    }
  })();
  let username = $state(remembered);
  let password = $state('');
  let busy = $state(false);

  async function submit(e) {
    e.preventDefault();
    if (!username.trim() || !password || busy) return;
    busy = true;
    await login(username.trim().toLowerCase(), password);
    busy = false;
    if (auth.status === 'in') {
      password = '';
      try {
        localStorage.setItem('ip-last-user', username.trim().toLowerCase());
      } catch {
        /* 저장 불가 환경 */
      }
    }
  }
</script>

<main>
  <form onsubmit={submit}>
    <h1>플래너</h1>
    <p class="hint">아이디와 비밀번호로 로그인하세요.</p>
    <label for="login-id">아이디</label>
    <input id="login-id" type="text" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" bind:value={username} />
    <label for="login-pw">비밀번호</label>
    <input id="login-pw" type="password" name="password" autocomplete="current-password" bind:value={password} />
    {#if auth.error}<p class="error" role="alert">{auth.error}</p>{/if}
    <button class="primary press" type="submit" disabled={!username.trim() || !password || busy}>{busy ? '확인 중' : '로그인'}</button>
  </form>
</main>

<style>
  main { height: 100%; display: grid; place-items: center; padding: 24px; }
  form {
    width: min(380px, 100%); background: var(--surface); border: 1px solid var(--line);
    border-radius: 22px; padding: 32px 28px 28px; display: flex; flex-direction: column; gap: 8px;
  }
  h1 { margin: 0; font-size: 30px; font-weight: 700; letter-spacing: -0.02em; }
  .hint { margin: 0 0 12px; color: var(--text-2); font-size: 15px; }
  label { font-size: 13px; font-weight: 500; color: var(--text-2); }
  input[type='password'], input[type='text'] {
    height: 50px; padding: 0 14px; border: 1px solid #d1d1d6; border-radius: 12px;
    font-size: 17px; background: var(--surface); color: var(--text);
  }
  input[type='password']:focus, input[type='text']:focus { outline: 2px solid var(--blue); outline-offset: -1px; border-color: transparent; }
  .error { margin: 4px 0 0; color: var(--red); font-size: 14px; }
  .primary {
    margin-top: 12px; height: 50px; border: 0; border-radius: 12px;
    background: var(--text); color: #fff; font-size: 17px; font-weight: 600;
  }
  .primary:disabled { opacity: 0.35; cursor: default; }
</style>
