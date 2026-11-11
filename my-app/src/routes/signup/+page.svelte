<script lang="ts">
  import { goto } from '$app/navigation';

  let name = '';
  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function signup() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      if (res.ok) {
        await goto(`/login?registered=1&email=${encodeURIComponent(email)}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      error = data.error || data.message || 'Sign up failed.';
    } catch {
      error = 'Could not reach the server. Try again.';
    }
    loading = false;
  }
</script>

<svelte:head>
  <title>Create account · DnD Session Manager</title>
</svelte:head>

<main class="auth">
  <div class="auth-card card">
    <div class="auth-head">
      <h1>Create your account</h1>
      <p class="muted">Start organising your first campaign.</p>
    </div>

    {#if error}<div class="alert alert-error" role="alert">{error}</div>{/if}

    <form class="stack" on:submit|preventDefault={signup}>
      <label class="field">
        <span class="field-label">Name</span>
        <input class="input" type="text" autocomplete="name" bind:value={name} required />
      </label>
      <label class="field">
        <span class="field-label">Email</span>
        <input class="input" type="email" autocomplete="email" bind:value={email} required />
      </label>
      <label class="field">
        <span class="field-label">Password</span>
        <input class="input" type="password" autocomplete="new-password" minlength="8" maxlength="72" bind:value={password} required aria-describedby="pw-hint" />
        <span id="pw-hint" class="hint">At least 8 characters.</span>
      </label>
      <button type="submit" class="btn btn-primary btn-lg btn-block" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>

    <p class="auth-switch muted">Already have an account? <a href="/login">Sign in</a></p>
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
