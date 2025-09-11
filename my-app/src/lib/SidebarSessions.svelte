<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let sessionHistory: any[] = [];
  export let upcomingSessions: any[] = [];
  export let selectedSessionId: string = '';
  const dispatch = createEventDispatcher();
</script>

<aside class="game-menu-sidebar">
  <div class="sidebar-block">
    <h3>Session History</h3>
    <ul class="sidebar-list">
      {#each sessionHistory as session}
        <li class:selected={selectedSessionId === session._id} on:click={() => dispatch('selectSession', session)}>{session.title}</li>
      {/each}
    </ul>
  </div>
  <div class="sidebar-block">
    <h3>Upcoming Sessions</h3>
    <ul class="sidebar-list">
      {#each upcomingSessions as session}
        <li class:selected={selectedSessionId === session._id} on:click={() => dispatch('selectSession', session)}>{session.title}</li>
      {/each}
    </ul>
  </div>
  <button class="create-session-btn" on:click={() => dispatch('createSession')}>Create/End Session</button>
</aside>

<style>
 .game-menu-sidebar {
  flex: 1 1 320px;
  min-width: 260px;
  max-width: 350px;
  background: var(--color-bg-main);
  border-radius: 12px;
  box-shadow: 0 1px 8px rgba(0,0,0,0.10);
  padding: 1.5em 1.2em 1.2em 1.2em;
  display: flex;
  flex-direction: column;
  gap: 2em;
}
.sidebar-block {
  margin-bottom: 1.5em;
}
 .sidebar-block h3 {
  margin-bottom: 0.7em;
  font-size: 1.15em;
  color: var(--color-text-accent);
}
 .sidebar-list {
  list-style: disc inside;
  color: var(--color-text-secondary);
  font-size: 1em;
  padding-left: 1em;
}
.create-session-btn {
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 6px;
  padding: 0.7em 1.5em;
  font-size: 1.08em;
  margin-top: 1em;
  cursor: pointer;
  width: 100%;
  transition: background 0.15s;
}
.create-session-btn:hover {
  background: var(--color-bg-button-hover);
}
li.selected {
  background: var(--color-bg-accent);
  color: var(--color-text-accent);
  font-weight: bold;
  border-radius: 4px;
}
</style>
