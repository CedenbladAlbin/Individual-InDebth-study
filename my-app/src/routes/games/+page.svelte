<script lang="ts">
  import { goto } from '$app/navigation';
  import { api } from '$lib/api';

  let name = '';
  let description = '';
  let error = '';
  let loading = false;

  async function createGame() {
    loading = true;
    error = '';
    const res = await api('/api/games', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
    if (res.ok) {
      const { gameId } = await res.json();
      await goto(`/game/${gameId}`);
      return;
    }
    const data = await res.json().catch(() => ({}));
    error = data.message || 'Failed to create game.';
    loading = false;
  }
</script>

<svelte:head>
  <title>New game · DnD Session Manager</title>
</svelte:head>

<main class="page page-narrow">
  <a href="/my-games" class="back-link">← My games</a>
  <header class="page-header">
    <div>
      <h1>New game</h1>
      <p class="muted lead">Give your campaign a name. You can add scenes, NPCs and players next.</p>
    </div>
  </header>

  <form class="card stack-lg" on:submit|preventDefault={createGame}>
    {#if error}<div class="alert alert-error" role="alert">{error}</div>{/if}
    <label class="field">
      <span class="field-label">Name</span>
      <input class="input" type="text" maxlength="200" placeholder="e.g. The Lost Mines" bind:value={name} required />
    </label>
    <label class="field">
      <span class="field-label">Description <span class="faint">(optional)</span></span>
      <textarea class="input" rows="4" placeholder="Setting, tone, party level…" bind:value={description}></textarea>
    </label>
    <div class="row-end">
      <a href="/my-games" class="btn btn-ghost">Cancel</a>
      <button type="submit" class="btn btn-primary" disabled={loading || !name.trim()}>
        {loading ? 'Creating…' : 'Create game'}
      </button>
    </div>
  </form>
</main>
