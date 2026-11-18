<script>
  import { onMount } from 'svelte';
  import { api, ApiError } from './api.js';
  import { auth } from './auth.svelte.js';

  let users = $state([]);
  let loadError = $state('');
  let msg = $state('');
  let msgOk = $state(false);
  let busy = $state(false);

  // 새 사용자
  let username = $state('');
  let displayName = $state('');
  let password = $state('');

  // 비밀번호 다시 정하기(한 번에 한 사람)
  let resetId = $state(null);
  let resetPw = $state('');

  const ERRORS = {
    bad_username: '아이디는 영문 소문자·숫자와 . _ - 로 2~30자여야 합니다.',
    weak_password: '비밀번호는 10자 이상이어야 합니다.',
    exists: '이미 있는 아이디입니다.',
    self: '내 계정은 사용 중지할 수 없습니다.',
  };

  async function load() {
    try {
      users = (await api('users.php')).users;
      loadError = '';
    } catch {
      loadError = '사용자 목록을 불러오지 못했습니다.';
    }
  }
  onMount(load);

  async function run(body, okText) {
    busy = true;
    msg = '';
    try {
      users = (await api('users.php', { method: 'POST', body })).users;
      msgOk = true;
      msg = okText;
      return true;
    } catch (e) {
      msgOk = false;
      msg = (e instanceof ApiError && ERRORS[e.code]) || '처리하지 못했습니다. 연결을 확인하세요.';
      return false;
    } finally {
      busy = false;
    }
  }

  async function add(e) {
    e.preventDefault();
    const ok = await run(
      { action: 'create', username: username.trim().toLowerCase(), display_name: displayName.trim(), password },
      '사용자를 추가했습니다. 아이디와 비밀번호를 본인에게 알려 주세요.',
    );
    if (ok) username = displayName = password = '';
  }

  async function reset(e, u) {
    e.preventDefault();
    const ok = await run({ action: 'reset_password', id: u.id, password: resetPw }, `${u.display_name}님의 비밀번호를 바꿨습니다. 그 사용자는 다시 로그인해야 합니다.`);
    if (ok) {
      resetId = null;
      resetPw = '';
    }
  }

  const toggle = (u) =>
    run({ action: 'set_disabled', id: u.id, disabled: u.disabled ? 0 : 1 }, u.disabled ? `${u.display_name}님을 다시 사용하도록 했습니다.` : `${u.display_name}님의 사용을 중지했습니다.`);
</script>

<section>
  <h3>사용자 관리</h3>
  <p class="note">사용자마다 일정·할 일·메모·손글씨가 따로 저장되고, 서로 볼 수 없습니다.</p>

  {#if loadError}
    <p class="error" role="alert">{loadError}</p>
  {:else}
    <ul class="list">
      {#each users as u (u.id)}
        <li class:off={u.disabled}>
          <div class="who">
            <span class="name">{u.display_name}</span>
            <span class="id">{u.username}</span>
            {#if u.is_admin}<span class="tag">관리자</span>{/if}
            {#if u.disabled}<span class="tag gray">사용 중지</span>{/if}
          </div>
          <div class="acts">
            <button class="btn press" onclick={() => { resetId = resetId === u.id ? null : u.id; resetPw = ''; }}>비밀번호 정하기</button>
            {#if u.id !== auth.user?.id}
              <button class="btn press" class:danger={!u.disabled} disabled={busy} onclick={() => toggle(u)}>{u.disabled ? '다시 사용' : '사용 중지'}</button>
            {/if}
          </div>
          {#if resetId === u.id}
            <form class="reset" onsubmit={(e) => reset(e, u)}>
              <label for={`rp-${u.id}`}>새 비밀번호 (10자 이상)</label>
              <input id={`rp-${u.id}`} type="password" autocomplete="new-password" bind:value={resetPw} />
              <button class="btn press" type="submit" disabled={busy || resetPw.length < 10}>저장</button>
            </form>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <form class="add" onsubmit={add}>
    <h4>사용자 추가</h4>
    <label for="nu-id">아이디 (영문 소문자·숫자)</label>
    <input id="nu-id" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" bind:value={username} />
    <label for="nu-name">이름 (화면에 표시)</label>
    <input id="nu-name" type="text" autocomplete="off" maxlength="40" bind:value={displayName} />
    <label for="nu-pw">비밀번호 (10자 이상)</label>
    <input id="nu-pw" type="password" autocomplete="new-password" bind:value={password} />
    <button class="btn press" type="submit" disabled={busy || !username.trim() || password.length < 10}>사용자 추가</button>
  </form>
  {#if msg}<p class={msgOk ? 'ok' : 'error'} role="status">{msg}</p>{/if}
</section>

<style>
  section { padding: 16px 0; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 10px; }
  h3 { margin: 0; font-size: 16px; font-weight: 600; }
  h4 { margin: 4px 0 0; font-size: 14px; font-weight: 600; }
  .note { margin: 0; font-size: 13px; color: var(--text-2); line-height: 1.5; }
  .ok { margin: 0; font-size: 14px; color: #1b6b34; }
  .error { margin: 0; font-size: 14px; color: var(--red); }
  .list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: 14px; }
  li { padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--line); }
  li:first-child { border-top: 0; }
  li.off .name { color: var(--text-3); text-decoration: line-through; }
  .who { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
  .name { font-size: 16px; font-weight: 600; }
  .id { font-size: 13px; color: var(--text-2); }
  .tag { font-size: 12px; padding: 1px 8px; border-radius: 10px; background: #e5f0ff; color: #004a9f; }
  .tag.gray { background: var(--fill); color: var(--text-2); }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; }
  label { font-size: 13px; font-weight: 500; color: var(--text-2); }
  form { display: flex; flex-direction: column; gap: 6px; }
  .reset { padding-top: 4px; }
  input[type='text'], input[type='password'] {
    width: 100%; height: 46px; padding: 0 12px; border: 1px solid #d1d1d6; border-radius: 12px;
    font: inherit; font-size: 16px; background: var(--surface); color: var(--text);
  }
  input:focus-visible { outline: 2px solid var(--blue); outline-offset: -1px; border-color: transparent; }
  .btn {
    align-self: flex-start; min-height: 44px; padding: 0 16px; border: 1px solid #d1d1d6; border-radius: 22px;
    background: var(--surface); color: var(--text); font-size: 15px;
  }
  .btn:disabled { opacity: 0.4; cursor: default; }
  .danger { color: var(--red); }
</style>
