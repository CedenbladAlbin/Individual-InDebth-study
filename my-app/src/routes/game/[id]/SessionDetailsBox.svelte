<script lang="ts">
  export let session: any;
  export let show: boolean = true;
  export let edit: boolean = false;
  export let editData: any = {};
  export let onEdit: () => void;
  export let onSave: () => void;
  export let onCancel: () => void;
  export let onToggle: () => void;
</script>


{#if session}
  <div class="session-details-box-large session-details-bottom">
    <div class="session-details-header">
      <h3>{edit ? 'Edit Session' : `${session.title} ${session.isEnded ? '(Ended)' : ''}`}</h3>
      <div class="session-details-actions">
        <button on:click={onToggle}>{show ? 'Hide' : 'Show'} Details</button>
        {#if !edit}
          <button on:click={onEdit}>Edit</button>
        {:else}
          <button on:click={onSave}>Save</button>
          <button on:click={onCancel}>Cancel</button>
        {/if}
      </div>
    </div>
    {#if show}
      {#if edit}
        <div class="session-details-form">
          <!-- ...existing edit form... -->
        </div>
      {:else}
        <div class="session-details-grid">
          <div class="main-fields">
            <div class="info-label">Title</div>
            <div class="info-value">{session.title}</div>
            <div class="info-label">Summary</div>
            <div class="info-value">{session.notes?.summary || 'No summary.'}</div>
            <div class="info-label">Attendance</div>
            <div class="info-value">{session.notes?.attendance || 'N/A'}</div>
            <div class="info-label">Plot Developments</div>
            <div class="info-value">{session.notes?.plotDevelopments || 'N/A'}</div>
            <div class="info-label">NPCs</div>
            <ul class="entity-list">
              {#each session.npcs || session.connections?.npcs || [] as npc}
                <li>{npc.name || npc}</li>
              {/each}
            </ul>
            <div class="info-label">Scenes</div>
            <ul class="entity-list">
              {#each session.scenes || session.connections?.scenes || [] as scene}
                <li>{scene.name || scene}</li>
              {/each}
            </ul>
            <div class="info-label">Players</div>
            <ul class="entity-list">
              {#each session.players || session.connections?.players || [] as player}
                <li>{player.name || player}</li>
              {/each}
            </ul>
            <div class="info-label">Items</div>
            <ul class="entity-list">
              {#each session.items || session.connections?.items || [] as item}
                <li>{item.name || item}</li>
              {/each}
            </ul>
          </div>
          <div class="side-fields">
            <div class="info-label">XP</div>
            <div class="info-value">{session.notes?.xp || 0}</div>
            <div class="info-label">Status</div>
            <div class="info-value">{session.notes?.status || 'N/A'}</div>
            <div class="info-label">Ended</div>
            <div class="info-value">{session.isEnded ? 'Yes' : 'No'}</div>
            <div class="info-label">Date</div>
            <div class="info-value">{session.date ? new Date(session.date).toLocaleDateString() : 'N/A'}</div>
            <div class="info-label">Quests</div>
            <div class="info-value">{session.notes?.quests || '-'}</div>
            <div class="info-label">Actions</div>
            <div class="info-value">{session.notes?.actions || '-'}</div>
            <div class="info-label">Combats</div>
            <div class="info-value">{session.notes?.combats || '-'}</div>
            <div class="info-label">Loot</div>
            <div class="info-value">{session.notes?.loot || '-'}</div>
            <div class="info-label">Secrets</div>
            <div class="info-value">{session.notes?.secrets || '-'}</div>
            <div class="info-label">Factions</div>
            <div class="info-value">{session.notes?.factions || '-'}</div>
            <div class="info-label">Mysteries</div>
            <div class="info-value">{session.notes?.mysteries || '-'}</div>
            <div class="info-label">Goals</div>
            <div class="info-value">{session.notes?.goals || '-'}</div>
            <div class="info-label">Rules</div>
            <div class="info-value">{session.notes?.rules || '-'}</div>
            <div class="info-label">Roleplay</div>
            <div class="info-value">{session.notes?.roleplay || '-'}</div>
            <div class="info-label">Downtime</div>
            <div class="info-value">{session.notes?.downtime || '-'}</div>
            <div class="info-label">Next Session Plans</div>
            <div class="info-value">{session.notes?.nextPlans || '-'}</div>
            <div class="info-label">Custom Notes</div>
            <div class="info-value">{session.notes?.custom || '-'}</div>
          </div>
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
.session-details-box-large {
  background: var(--color-bg-secondary);
  border-radius: 8px;
  padding: 1.2em 1.5em 1em 1.5em;
  box-shadow: 0 1px 6px rgba(0,0,0,0.10);
  max-width: 600px;
  margin: 1em auto;
}
.session-details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1em;
}
.session-details-header h3 {
  margin: 0;
  font-size: 1.3em;
  color: var(--color-text-accent);
}
.session-details-actions button {
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 6px;
  padding: 0.4em 1em;
  margin-left: 0.5em;
  cursor: pointer;
  font-size: 0.95em;
  transition: background 0.15s;
}
.session-details-actions button:hover {
  background: var(--color-bg-button-hover);
}
.session-details-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2.2em;
  margin-top: 1.2em;
}
.main-fields, .side-fields {
  display: flex;
  flex-direction: column;
  gap: 0.7em;
}
.info-label {
  color: var(--color-text-accent);
  font-weight: 600;
  margin-bottom: 0.1em;
  font-size: 1.04em;
}
.info-value {
  color: var(--color-text-main);
  font-size: 1.08em;
  margin-bottom: 0.5em;
}
.entity-list {
  list-style: disc inside;
  color: var(--color-text-secondary);
  font-size: 1em;
  margin: 0 0 0.7em 1em;
  padding: 0;
}
.session-details-form {
  display: flex;
  flex-direction: column;
  gap: 1em;
}
.session-details-form label {
  display: flex;
  flex-direction: column;
  color: var(--color-text-accent);
}
.session-details-form input[type="text"],
.session-details-form input[type="date"],
.session-details-form input[type="number"],
.session-details-form textarea {
  background: var(--color-bg-main);
  color: var(--color-text-main);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.4em;
  font-size: 1em;
}
</style>
