<script>
  import { onMount } from 'svelte';
  import Sheet from './Sheet.svelte';
  import { api, ApiError } from './api.js';
  import { auth, logout } from './auth.svelte.js';
  import { sync, syncNow, pendingCount } from './sync.svelte.js';
  import { closeSheet } from './ui.svelte.js';
  import { diag, setDiag } from './diag.svelte.js';

  let icsUrl = $state('');
  let copied = $state(false);
  let rotateConfirm = $state(false);
  let pending = $state(0);
  let cur = $state('');
  let next = $state('');
  let next2 = $state('');
  let pwMsg = $state('');
  let pwOk = $state(false);
  let logoutMsg = $state('');
  let busy = $state(false);

  const server = $derived(auth.status === 'in' || auth.status === 'offline');
  const webcal = $derived(icsUrl.replace(/^https?:/, 'webcal:'));

  const statusText = $derived(
    auth.status === 'local' ? '개발 모드(서버 없이 기기 안에만 저장)'
    : sync.status === 'syncing' ? '동기화 중'
    : sync.status === 'offline' ? '오프라인 — 연결되면 자동으로 동기화합니다'
    : sync.status === 'error' ? sync.error
    : sync.lastAt ? `동기화됨 · ${new Date(sync.lastAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`
    : '아직 동기화하지 않았습니다',
  );

  async function refreshPending() {
    pending = await pendingCount();
  }

  onMount(async () => {
    refreshPending();
    if (auth.status !== 'in') return;
    try {
      icsUrl = (await api('account.php')).ics_url;
    } catch {
      icsUrl = '';
    }
  });

  async function runSync() {
    busy = true;
    await syncNow();
    await refreshPending();
    busy = false;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(icsUrl);
      copied = true;
      setTimeout(() => (copied = false), 1800);
    } catch {
      /* 복사 불가: 주소를 길게 눌러 복사 */
    }
  }

  async function rotate() {
    if (!rotateConfirm) return (rotateConfirm = true);
    try {
      icsUrl = (await api('account.php', { method: 'POST', body: { action: 'rotate_ics' } })).ics_url;
      rotateConfirm = false;
    } catch {
      rotateConfirm = false;
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    pwOk = false;
    if (next.length < 10) return (pwMsg = '새 비밀번호는 10자 이상이어야 합니다.');
    if (next !== next2) return (pwMsg = '새 비밀번호가 서로 다릅니다.');
    try {
      await api('account.php', { method: 'POST', body: { action: 'password', current: cur, next } });
      pwOk = true;
      pwMsg = '비밀번호를 바꿨습니다. 다른 기기는 로그아웃됩니다.';
      cur = next = next2 = '';
    } catch (err) {
      if (err instanceof ApiError && err.code === 'invalid') pwMsg = '현재 비밀번호가 맞지 않습니다.';
      else if (err instanceof ApiError && err.code === 'locked') pwMsg = '시도가 너무 많습니다. 잠시 뒤에 다시 시도하세요.';
      else pwMsg = '변경하지 못했습니다. 연결을 확인하세요.';
    }
  }

  async function doLogout() {
    busy = true;
    logoutMsg = await logout(syncNow);
    busy = false;
    if (!logoutMsg) closeSheet();
  }
</script>

<Sheet title="설정" onclose={closeSheet}>
  <section>
    <h3>동기화</h3>
    <p class="status">{statusText}</p>
    {#if pending > 0}<p class="note">서버에 올리지 못한 변경 {pending}건</p>{/if}
    {#if server}<button class="btn press" disabled={busy} onclick={runSync}>지금 동기화</button>{/if}
  </section>

  {#if auth.status === 'in'}
    <section>
      <h3>iPad 캘린더로 보기</h3>
      <p class="note">아래 주소를 iPad 캘린더에 구독으로 추가하면 일정과 알림이 캘린더 앱에 나타납니다. 주소를 아는 사람은 일정을 볼 수 있으니 공유하지 마세요.</p>
      {#if icsUrl}
        <input class="url" type="text" readonly value={icsUrl} aria-label="캘린더 구독 주소" onfocus={(e) => e.currentTarget.select()} />
        <div class="line">
          <button class="btn press" onclick={copy}>{copied ? '복사됨' : '주소 복사'}</button>
          <a class="btn press" href={webcal}>캘린더에서 구독</a>
          <button class="btn press danger" onclick={rotate}>{rotateConfirm ? '기존 주소가 무효가 됩니다. 한 번 더' : '주소 재발급'}</button>
        </div>
      {:else}
        <p class="note">주소를 불러오지 못했습니다.</p>
      {/if}
    </section>

    <section>
      <h3>비밀번호 변경</h3>
      <form onsubmit={changePassword}>
        <label for="pw-cur">현재 비밀번호</label>
        <input id="pw-cur" type="password" autocomplete="current-password" bind:value={cur} />
        <label for="pw-new">새 비밀번호 (10자 이상)</label>
        <input id="pw-new" type="password" autocomplete="new-password" bind:value={next} />
        <label for="pw-new2">새 비밀번호 확인</label>
        <input id="pw-new2" type="password" autocomplete="new-password" bind:value={next2} />
        {#if pwMsg}<p class={pwOk ? 'ok' : 'error'} role="status">{pwMsg}</p>{/if}
        <button class="btn press" type="submit" disabled={!cur || !next}>비밀번호 변경</button>
      </form>
    </section>
  {/if}

  <section>
    <h3>펜슬 진단</h3>
    <p class="note">글씨가 끊길 때 켜 보세요. 화면 왼쪽 아래에 펜슬 입력 횟수가 숫자로 나타납니다. '취소'가 늘어나면 브라우저가 입력을 가로챈 것입니다.</p>
    <label class="check"><input type="checkbox" checked={diag.on} onchange={(e) => setDiag(e.currentTarget.checked)} /> 진단 표시</label>
  </section>

  <section>
    <h3>버전</h3>
    <p class="note">{__BUILD__}</p>
  </section>

  {#if server}
    <section>
      <h3>로그아웃</h3>
      <p class="note">로그아웃하면 이 기기에 저장된 일정과 메모가 지워집니다. 서버에는 남아 있습니다.</p>
      {#if logoutMsg}<p class="error" role="alert">{logoutMsg}</p>{/if}
      <button class="btn press danger" disabled={busy} onclick={doLogout}>로그아웃</button>
    </section>
  {/if}
</Sheet>

<style>
  section { padding: 16px 0; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 10px; }
  section:first-of-type { border-top: 0; padding-top: 0; }
  h3 { margin: 0; font-size: 16px; font-weight: 600; }
  .status { margin: 0; font-size: 15px; }
  .note { margin: 0; font-size: 13px; color: var(--text-2); line-height: 1.5; }
  .ok { margin: 0; font-size: 14px; color: #1b6b34; }
  .error { margin: 0; font-size: 14px; color: var(--red); }
  .line { display: flex; flex-wrap: wrap; gap: 8px; }
  label { font-size: 13px; font-weight: 500; color: var(--text-2); }
  form { display: flex; flex-direction: column; gap: 6px; }
  input[type='password'], .url {
    width: 100%; height: 46px; padding: 0 12px; border: 1px solid #d1d1d6; border-radius: 12px;
    font: inherit; font-size: 16px; background: var(--surface); color: var(--text);
  }
  .url { font-size: 13px; }
  input:focus-visible { outline: 2px solid var(--blue); outline-offset: -1px; border-color: transparent; }
  .btn {
    align-self: flex-start; min-height: 44px; padding: 0 16px; border: 1px solid #d1d1d6; border-radius: 22px;
    background: var(--surface); color: var(--text); font-size: 15px; text-decoration: none;
    display: inline-flex; align-items: center;
  }
  .btn:disabled { opacity: 0.4; cursor: default; }
  .danger { color: var(--red); }
  .check { display: flex; align-items: center; gap: 8px; font-size: 15px; color: var(--text); }
  .check input { width: 22px; height: 22px; accent-color: var(--text); }
</style>
