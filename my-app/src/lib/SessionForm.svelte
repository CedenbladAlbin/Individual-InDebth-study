<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  export let session: any = null; // If editing, else null
  export let npcs: any[] = [];
  export let players: any[] = [];
  export let items: any[] = [];
  export let scenes: any[] = [];
  export let gameId: string;
  export let token: string;
  const dispatch = createEventDispatcher();

  let title = session ? session.title : '';
  let recap = session ? session.recap : '';
  let connections = session ? { ...session.connections } : { npcs: [], items: [], scenes: [], players: [] };
  let isEnded = session ? !!session.isEnded : false;
  let error = '';
  let loading = false;

  function toggleConnection(type: 'npcs'|'items'|'scenes'|'players', id: string) {
    if (!connections[type]) connections[type] = [];
    if (connections[type].includes(id)) {
      connections[type] = connections[type].filter((x: string) => x !== id);
    } else {
      connections[type] = [...connections[type], id];
    }
  }

  async function saveSession() {
    if (!title.trim()) {
      error = 'Title is required.';
      return;
    }
    loading = true;
    error = '';
    const body: any = {
      gameId,
      title,
      recap,
      connections,
      isEnded
    };
    if (session && session._id) body.sessionId = session._id;
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    loading = false;
    if (res.ok) {
      dispatch('saved');
    } else {
      error = 'Failed to save session.';
    }
  }
</script>

<form on:submit|preventDefault={saveSession} class="session-form">
  <label>
    Title
    <input type="text" bind:value={title} required />
  </label>
  <label>
    Recap / Notes
    <textarea rows="3" bind:value={recap} placeholder="Write recap or notes for next session..."></textarea>
  </label>
  <label>
    <input type="checkbox" bind:checked={isEnded} /> End Session
  </label>
  <fieldset>
    <legend>Attach NPCs</legend>
    {#each npcs as npc}
      <label class="context-checkbox">
        <input type="checkbox" checked={connections.npcs && connections.npcs.includes(npc._id)} on:change={() => toggleConnection('npcs', npc._id)} />
        {npc.name}
      </label>
    {/each}
  </fieldset>
  <fieldset>
    <legend>Attach Players</legend>
    {#each players as player}
      <label class="context-checkbox">
        <input type="checkbox" checked={connections.players && connections.players.includes(player._id)} on:change={() => toggleConnection('players', player._id)} />
        {player.name}
      </label>
    {/each}
  </fieldset>
  <fieldset>
    <legend>Attach Items</legend>
    {#each items as item}
      <label class="context-checkbox">
        <input type="checkbox" checked={connections.items && connections.items.includes(item._id)} on:change={() => toggleConnection('items', item._id)} />
        {item.name}
      </label>
    {/each}
  </fieldset>
  <fieldset>
    <legend>Attach Scenes</legend>
    {#each scenes as scene}
      <label class="context-checkbox">
        <input type="checkbox" checked={connections.scenes && connections.scenes.includes(scene._id)} on:change={() => toggleConnection('scenes', scene._id)} />
        {scene.name}
      </label>
    {/each}
  </fieldset>
  {#if error}
    <div class="error">{error}</div>
  {/if}
  <button type="submit" disabled={loading}>{session ? 'Update' : 'Create'} Session</button>
</form>

<style>
.session-form {
  display: flex;
  flex-direction: column;
  gap: 1em;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  padding: 1.2em 1.5em 1em 1.5em;
  box-shadow: 0 1px 6px rgba(0,0,0,0.10);
  max-width: 500px;
}
.session-form label {
  display: flex;
  flex-direction: column;
  gap: 0.3em;
  color: var(--color-text-secondary);
}
.session-form input[type="text"],
.session-form textarea {
  background: var(--color-bg-main);
  color: var(--color-text-main);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.4em;
}
.session-form fieldset {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.7em 1em 0.7em 1em;
  margin-bottom: 0.5em;
}
.session-form legend {
  color: var(--color-text-accent);
  font-size: 1em;
  padding: 0 0.5em;
}
.context-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  margin-right: 1em;
  font-size: 0.98em;
}
.error {
  color: var(--color-text-warning);
  text-align: center;
}
.session-form button {
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 4px;
  padding: 0.5em 1.2em;
  cursor: pointer;
  font-size: 1em;
  margin-top: 0.2em;
}
.session-form button:disabled {
  background: var(--color-bg-disabled);
  cursor: not-allowed;
}
</style>
