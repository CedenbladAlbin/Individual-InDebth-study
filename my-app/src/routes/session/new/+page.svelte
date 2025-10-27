<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { fetchAllGameContent, authenticatedFetch } from '$lib/api.js';

  let title = '';
  let npcs: any = [];
  let items: any = [];
  let scenes: any = [];
  let players: any = [];
  let notes = {
    summary: '',
    plotDevelopments: '',
    quests: '',
    loot: '',
    xp: 0,
    secrets: '',
    factions: '',
    mysteries: '',
    goals: '',
    downtime: '',
    nextPlans: '',
    custom: ''
  };
  let connections: {
      npcs: string[],
      items: string[],
      scenes: string[],
      players: string[],
      quests: string[]
    } = {
      npcs: [],
      items: [],
      scenes: [],
      players: [],
      quests: []
    };
  let isEnded = false;
  let error = '';
  let success = false;
  let showAdvanced = false;

  // Optionally: fetch game content for selection
  let gameId = '';
  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    gameId = urlParams.get('gameId') || '';
    if (gameId) {
      const content = await fetchAllGameContent(gameId);
      npcs = content.npcs;
      players = content.players;
      items = content.items;
      scenes = content.scenes;
    }
  });

  async function createSession() {
    error = '';
    success = false;
    if (!title || !gameId) {
      error = 'Title and gameId are required.';
      return;
    }
    const res = await authenticatedFetch('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        gameId,
        title,
        notes,
        connections,
        isEnded
      })
    });
    if (res.ok) {
      success = true;
      setTimeout(() => goto(`/game/${gameId}`), 1000);
    } else {
      error = (await res.text()) || 'Failed to create session.';
    }
  }
</script>

<svelte:head>
  <title>Create Session</title>
</svelte:head>

<main>
  <button class="back-btn" type="button" on:click={() => goto(`/game/${gameId}`)}>← Back to Game</button>
  <h1>Create New Session</h1>

  {#if error}
    <div class="error">{error}</div>
  {/if}
  {#if success}
    <div class="success">Session created!</div>
  {/if}
  <form on:submit|preventDefault={createSession} class="session-grid">
    <div class="main-fields">
      <label>
        Title
        <input bind:value={title} required />
      </label>
      <label>
        Summary
        <textarea bind:value={notes.summary}></textarea>
      </label>
      <label>
        Plot Developments
        <textarea bind:value={notes.plotDevelopments}></textarea>
      </label>
      <fieldset class="entity-list">
        <legend>NPCs</legend>
        {#each npcs as npc}
          <label class="entity-checkbox {connections.npcs.includes(npc._id) ? 'selected' : ''}"><input type="checkbox" value={npc._id} on:change={e => {
            if ((e.target as HTMLInputElement).checked) connections.npcs = [...connections.npcs, npc._id];
            else connections.npcs = connections.npcs.filter((id: string) => id !== npc._id);
          }} checked={connections.npcs.includes(npc._id)} /> {npc.name}</label>
        {/each}
      </fieldset>
      <fieldset class="entity-list">
        <legend>Scenes</legend>
        {#each scenes as scene}
          <label class="entity-checkbox {connections.scenes.includes(scene._id) ? 'selected' : ''}"><input type="checkbox" value={scene._id} on:change={e => {
            if ((e.target as HTMLInputElement).checked) connections.scenes = [...connections.scenes, scene._id];
            else connections.scenes = connections.scenes.filter((id: string) => id !== scene._id);
          }} checked={connections.scenes.includes(scene._id)} /> {scene.name}</label>
        {/each}
      </fieldset>
      <fieldset class="entity-list">
        <legend>Players</legend>
        {#each players as player}
          <label class="entity-checkbox {connections.players.includes(player._id) ? 'selected' : ''}"><input type="checkbox" value={player._id} on:change={e => {
            if ((e.target as HTMLInputElement).checked) connections.players = [...connections.players, player._id];
            else connections.players = connections.players.filter((id: string) => id !== player._id);
          }} checked={connections.players.includes(player._id)} /> {player.name}</label>
        {/each}
      </fieldset>
      <fieldset class="entity-list">
        <legend>Items</legend>
        {#each items as item}
          <label class="entity-checkbox {connections.items.includes(item._id) ? 'selected' : ''}"><input type="checkbox" value={item._id} on:change={e => {
            if ((e.target as HTMLInputElement).checked) connections.items = [...connections.items, item._id];
            else connections.items = connections.items.filter((id: string) => id !== item._id);
          }} checked={connections.items.includes(item._id)} /> {item.name}</label>
        {/each}

      </fieldset>
    </div>
    <div class="side-fields">
      <label>
        XP
        <input type="range" min="0" max="10000" step="10" bind:value={notes.xp} />
        <span>{notes.xp}</span>
      </label>
      <button type="button" class="toggle-advanced" on:click={() => showAdvanced = !showAdvanced}>
        {showAdvanced ? 'Hide' : 'Show'} More Options
      </button>
      {#if showAdvanced}
        <div class="advanced-fields">
          <label>
            Quests
            <input bind:value={notes.quests} />
          </label>
          <label>
            Loot
            <input bind:value={notes.loot} />
          </label>
          <label>
            Secrets
            <textarea bind:value={notes.secrets}></textarea>
          </label>
          <label>
            Factions
            <input bind:value={notes.factions} />
          </label>
          <label>
            Mysteries
            <textarea bind:value={notes.mysteries}></textarea>
          </label>
          <label>
            Goals
            <input bind:value={notes.goals} />
          </label>
          <label>
            Downtime
            <textarea bind:value={notes.downtime}></textarea>
          </label>
          <label>
            Next Session Plans
            <textarea bind:value={notes.nextPlans}></textarea>
          </label>
          <label>
            Custom Notes
            <textarea bind:value={notes.custom}></textarea>
          </label>
        </div>
      {/if}
    </div>
    <div class="form-actions">
      <button type="submit">Create Session</button>
    </div>
  </form>
</main>

<style>
main {
  max-width: 900px;
  margin: 2rem auto;
  background: var(--color-bg-secondary);
  color: var(--color-text-main);
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 2px 8px var(--color-shadow);
}
.session-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}
.main-fields label,
.main-fields fieldset {
  margin-bottom: 1.2em;
}
.side-fields {
  display: flex;
  flex-direction: column;
  gap: 1.2em;
}
.advanced-fields label {
  margin-bottom: 1em;
}
.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  margin-top: 2em;
}
input, textarea {
  width: 100%;
  margin-top: 0.25rem;
  background: var(--color-bg-input);
  color: var(--color-text-main);
  border: 1px solid var(--color-border);
  border-radius: 0.3rem;
  padding: 0.5rem;
}
button, .toggle-advanced {
  margin-top: 1.5rem;
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 0.3rem;
  padding: 0.7rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
}
.toggle-advanced {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  background: var(--color-bg-secondary);
  color: var(--color-text-accent);
  border: 1px solid var(--color-border);
  font-size: 0.98em;
  padding: 0.4em 1em;
}
.error {
  color: var(--color-text-warning);
  margin-bottom: 1rem;
}
.success {
  color: var(--color-text-success);
  margin-bottom: 1rem;
}
fieldset.entity-list {
/* Hide checkboxes in entity lists */
.entity-checkbox input[type="checkbox"] {
  display: none;
}
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 1em 1em 0.5em 1em;
    margin-bottom: 1.2em;
    background: var(--color-bg-main);
  }
  fieldset.entity-list legend {
    color: var(--color-text-accent);
    font-size: 1.05em;
    margin-bottom: 0.5em;
    font-weight: bold;
  }
  .entity-checkbox {
    display: flex;
    align-items: center;
    gap: 0.7em;
    margin-bottom: 0.4em;
    font-size: 1em;
    cursor: pointer;
    padding: 0.2em 0.1em;
    border-radius: 4px;
    transition: background 0.15s;
  }
  .entity-checkbox:hover {
    background: var(--color-bg-button-hover);
  }
  .entity-checkbox input[type="checkbox"] {
    accent-color: var(--color-accent, #4e8cff);
    width: 1.1em;
    height: 1.1em;
    margin-right: 0.3em;
  }

  /* Highlight selected entity names */
.entity-checkbox.selected {
  color: var(--color-text-accent, #2a9d8f);
  font-weight: bold;
  background: var(--color-bg-accent, #e0f7fa);
  border-radius: 0.3em;
  padding: 0.1em 0.4em;
}

/* Back button styling */
.back-btn {
  background: var(--color-bg-button, #f4f4f4);
  color: var(--color-text-main, #222);
  border: 1px solid var(--color-border, #bbb);
  border-radius: 0.3em;
  padding: 0.5em 1.2em;
  font-size: 1em;
  margin-bottom: 1.5em;
  cursor: pointer;
  transition: background 0.15s;
}
.back-btn:hover {
  background: var(--color-bg-accent, #e0f7fa);
}
</style>
