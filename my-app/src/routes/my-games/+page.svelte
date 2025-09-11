<script lang="ts">
  import { onMount } from 'svelte';
  let games: any[];
  let loading = true;
  let error = '';

  onMount(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      error = 'You must be signed in to view your games.';
      loading = false;
      return;
    }
    try {
      const res = await fetch('/api/games', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        games = await res.json();
      } else {
        error = 'Failed to load games.';
      }
    } catch (e) {
      error = 'Failed to load games.';
    }
    loading = false;
  });
</script>

<main class="games-container">
  <h2>My Games</h2>
  {#if loading}
    <p>Loading...</p>
  {:else if error}
    <p class="error">{error}</p>
  {:else if games.length === 0}
    <p>You have no games yet. <a href="/games">Create your first game!</a></p>
  {:else}
    <ul class="games-list">
      {#each games as game}
        <li class="game-item">
          <a class="game-link" href={`/game/${game._id}`}>
            <h3>{game.name}</h3>
            <p>{game.description}</p>
            <small>Created: {new Date(game.createdAt).toLocaleString()}</small>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
.games-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: #23272f;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.15);
  color: #fff;
}
.games-list {
  list-style: none;
  padding: 0;
}
.game-item {
  background: #181c22;
  border-radius: 8px;
  margin-bottom: 1.2rem;
  padding: 1rem 1.2rem;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
}
.game-link {
  display: block;
  color: inherit;
  text-decoration: none;
  transition: background 0.2s;
}
.game-link:hover {
  background: #22243a;
}
.game-item h3 {
  margin-bottom: 0.3rem;
}
.error {
  color: #ffb347;
  text-align: center;
}
</style>
