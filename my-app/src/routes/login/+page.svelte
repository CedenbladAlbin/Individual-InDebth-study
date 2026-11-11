<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let error = '';
  let info = '';
  let loading = false;

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('expired')) info = 'Your session has expired. Please sign in again.';
    if (params.has('registered')) info = 'Account created. Sign in to continue.';
    if (params.get('email')) email = params.get('email') ?? '';
  });

  async function login() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        await goto('/my-games');
        return;
      }
      error = data.error || 'Sign in failed.';
    } catch {
      error = 'Could not reach the server. Try again.';
    }
    loading = false;
  }
</script>

<svelte:head>
  <title>Sign in · DnD Session Manager</title>
</svelte:head>

<main class="auth">
  <div class="auth-card card">
    <div class="auth-head">
      <h1>Welcome back</h1>
      <p class="muted">Sign in to your campaigns.</p>
    </div>

    {#if info}<div class="alert alert-info" role="status">{info}</div>{/if}
    {#if error}<div class="alert alert-error" role="alert">{error}</div>{/if}

    <form class="stack" on:submit|preventDefault={login}>
      <label class="field">
        <span class="field-label">Email</span>
        <input class="input" type="email" autocomplete="email" bind:value={email} required />
      </label>
      <label class="field">
        <span class="field-label">Password</span>
        <input class="input" type="password" autocomplete="current-password" bind:value={password} required />
      </label>
      <button type="submit" class="btn btn-primary btn-lg btn-block" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>

    <p class="auth-switch muted">No account yet? <a href="/signup">Create one</a></p>
  </div>
</main>

<style>
  .auth {
    display: grid;
    place-items: start center;
    padding: var(--sp-8) var(--sp-4);
  }
  .auth-card {
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
    width: min(var(--w-auth), 100%);
    padding: var(--sp-6) var(--sp-5);
  }
  .auth-head { display: flex; flex-direction: column; gap: var(--sp-2); }
  .auth-head h1 { font-size: var(--fs-lg); }
  .auth-switch { text-align: center; font-size: var(--fs-xs); }
  @media (max-width: 610px) {
    .auth { padding: var(--sp-6) var(--sp-4); }
  }
</style>
