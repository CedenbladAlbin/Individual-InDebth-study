<script lang="ts">
    import { onMount } from 'svelte';

  export let sessions: any[] = [];
  export let removeSession: (id: string) => void;
</script>

<section class="game-section">
  <h3>Sessions</h3>
  {#if sessions.length === 0}
    <p>No sessions yet.</p>
  {:else}
    <ul class="session-list">
      {#each sessions as session}
        <li class="session-list-item">
          <span>{session.title} {session.isEnded ? '(Ended)' : ''}</span>
          <button class="remove-session-btn" on:click={() => removeSession(session._id)}>Remove</button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
.session-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5em 0;
}
.session-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5em 0.2em;
  border-bottom: 1px solid var(--color-border, #ddd);
}
.remove-session-btn {
  background: var(--color-bg-button, #f4f4f4);
  color: var(--color-text-warning, #c00);
  border: 1px solid var(--color-border, #bbb);
  border-radius: 0.3em;
  padding: 0.3em 1em;
  font-size: 0.95em;
  cursor: pointer;
  transition: background 0.15s;
}
.remove-session-btn:hover {
  background: var(--color-bg-accent, #ffeaea);
}
</style>
