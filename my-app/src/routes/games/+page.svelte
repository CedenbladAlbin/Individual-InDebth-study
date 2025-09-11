<script>
  let name = '';
  let description = '';
  let message = '';

  async function createGame() {
    const token = localStorage.getItem('token');
    console.log('JWT token used for create game:', token);
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

<main style="max-width: 500px; margin: 2rem auto; padding: 2rem; background: #23272f; border-radius: 12px; box-shadow: 0 2px 16px rgba(0,0,0,0.15); color: #fff;">
  <h2 style="text-align:center;">Create a New Game Session</h2>
  <form on:submit|preventDefault={createGame}>
    <label for="name">Game Name</label>
    <input id="name" type="text" bind:value={name} required style="width:100%;margin-bottom:1rem;padding:0.5rem;border-radius:6px;border:1px solid #444;background:#181c22;color:#fff;" />

    <label for="description">Description</label>
    <textarea id="description" bind:value={description} required style="width:100%;margin-bottom:1rem;padding:0.5rem;border-radius:6px;border:1px solid #444;background:#181c22;color:#fff;"></textarea>

    <button type="submit" style="width:100%;padding:0.75rem;border:none;border-radius:6px;background:#6c47ff;color:#fff;font-size:1rem;font-weight:bold;cursor:pointer;transition:background 0.2s;">Create Game</button>
  </form>
  {#if message}
    <div style="margin-top:1rem;text-align:center;color:#ffb347;">{message}</div>
  {/if}
</main>
