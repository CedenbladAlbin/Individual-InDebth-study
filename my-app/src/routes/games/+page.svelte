<script>
  let name = '';
  let description = '';
  let message = '';

  async function createGame() {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ name, description })
    });
    if (res.ok) {
      message = 'Game created!';
      name = '';
      description = '';
    } else {
      const data = await res.json().catch(() => ({}));
      message = data.error || 'Failed to create game.';
    }
  }
</script>

<main class="create-game-container">
  <h2 class="title">Create a New Game Session</h2>
  <form on:submit|preventDefault={createGame}>
    <label for="name">Game Name</label>
    <input id="name" type="text" bind:value={name} required class="input-field" />

    <label for="description">Description</label>
    <textarea id="description" bind:value={description} required class="textarea-field"></textarea>

    <button type="submit" class="create-btn">Create Game</button>
  </form>
  {#if message}
    <div class="message">{message}</div>
  {/if}
</main>

<style>
.create-game-container {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  background: var(--color-bg-secondary);
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.15);
  color: var(--color-text-main);
}

.title {
  text-align: center;
  margin-bottom: 1.5rem;
}

.input-field,
.textarea-field {
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-main);
  color: var(--color-text-main);
}

.create-btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 6px;
  background: var(--color-bg-button-alt);
  color: var(--color-text-main);
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
}

.create-btn:hover {
  background: var(--color-bg-button-alt2);
}

.message {
  margin-top: 1rem;
  text-align: center;
  color: var(--color-text-warning);
}
</style>
