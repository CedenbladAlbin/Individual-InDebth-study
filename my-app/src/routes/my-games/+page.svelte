<script lang="ts">
  import { onMount } from 'svelte';
  import { api, getToken } from '$lib/api';

  let games: any[] = [];
  let loading = true;
  let error = '';

  onMount(async () => {
    if (!getToken()) {
      window.location.href = '/login';
      return;
    }
    try {
      const res = await api('/api/games');
      if (res.ok) games = await res.json();
      else error = 'Failed to load your games.';
    } catch {
      error = 'Failed to load your games.';
    }
    loading = false;
  });

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
</script>

<svelte:head>
  <title>My games · DnD Session Manager</title>
</svelte:head>

<main class="page">
  <header class="page-header">
    <div>
      <h1>My games</h1>
      {#if !loading && !error}
        <p class="muted">{games.length} {games.length === 1 ? 'campaign' : 'campaigns'}</p>
      {/if}
    </div>
    {#if games.length > 0}
      <a href="/games" class="btn btn-primary">+ New game</a>
    {/if}
  </header>

  {#if loading}
    <p class="muted">Loading…</p>
  {:else if error}
    <div class="alert alert-error" role="alert">{error}</div>
  {:else if games.length === 0}
    <div class="empty-state">
      <h3>No campaigns yet</h3>
      <p>Create your first game to start adding scenes, NPCs, players and sessions.</p>
      <a href="/games" class="btn btn-primary">+ Create your first game</a>
    </div>
  {:else}
    <ul class="game-grid">
      {#each games as game (game._id)}
        <li>
          <a class="game-card" href={`/game/${game._id}`}>
            <h2>{game.name}</h2>
            {#if game.description}
              <p class="desc muted">{game.description}</p>
            {/if}
            <span class="meta faint">Created {formatDate(game.createdAt)}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  .game-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 288px), 1fr));
    gap: var(--sp-5);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* Each card is a golden rectangle */
  .game-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    height: 100%;
    aspect-ratio: 1.618 / 1;
    padding: var(--sp-5);
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    color: var(--text);
    text-decoration: none;
    transition: border-color 0.15s, transform 0.15s, background-color 0.15s;
  }
  .game-card::before {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    background: linear-gradient(90deg, var(--primary), var(--primary-text));
    opacity: 0;
    transition: opacity 0.15s;
  }
  .game-card:hover {
    border-color: var(--border-strong);
    background: var(--surface-2);
    transform: translateY(-2px);
  }
  .game-card:hover::before { opacity: 1; }
  .game-card h2 { font-size: var(--fs-md); }
  .desc {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .meta { margin-top: auto; font-size: var(--fs-xs); }
</style>
