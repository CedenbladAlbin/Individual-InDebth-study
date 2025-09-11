<script lang="ts">
  export let entities: any[] = [];
  export let type = '';
  export let onEdit = (entity: any) => {};
  export let onConnect = (entity: any) => {};
  export let onNotes = (entity: any) => {};
  export let onDelete = (entity: any) => {};
</script>

<div class="card-list">
  {#each entities as entity}
    <div class="card">
      <div class="card-title">{entity.name}</div>
      <div class="card-desc">{entity.description}</div>
      {#if type === 'scene' && (entity.location || entity.dangerLevel)}
        <div class="card-meta">
          {#if entity.location}<span>Location: {entity.location}</span>{/if}
          {#if entity.dangerLevel}<span>Danger: {entity.dangerLevel}</span>{/if}
        </div>
      {/if}
      {#if type === 'npc' && (entity.role || entity.status)}
        <div class="card-meta">
          {#if entity.role}<span>Role: {entity.role}</span>{/if}
          {#if entity.status}<span>Status: {entity.status}</span>{/if}
        </div>
      {/if}
      {#if type === 'player' && (entity.class || entity.level)}
        <div class="card-meta">
          {#if entity.class}<span>Class: {entity.class}</span>{/if}
          {#if entity.level}<span>Level: {entity.level}</span>{/if}
        </div>
      {/if}
      {#if type === 'item' && (entity.itemType || entity.benefits)}
        <div class="card-meta">
          {#if entity.itemType}<span>Type: {entity.itemType}</span>{/if}
          {#if entity.benefits}<span>Benefits: {entity.benefits}</span>{/if}
        </div>
      {/if}
      <div class="card-actions">
        <button on:click={() => onEdit(entity)}>Edit</button>
        <button on:click={() => onConnect(entity)}>Connect</button>
        <button on:click={() => onNotes(entity)}>View Notes</button>
        <button class="delete-btn" on:click={() => onDelete(entity)}>Delete</button>
      </div>
    </div>
  {/each}
</div>

<style>

.card-list {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2em;
  margin-top: 1em;
}
.card {
  background: var(--color-bg-secondary);
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.10);
  padding: 1em 1.2em 0.7em 1.2em;
  min-width: 220px;
  max-width: 260px;
  flex: 1 1 220px;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}
.card-title {
  font-weight: bold;
  font-size: 1.15em;
  margin-bottom: 0.2em;
}
.card-desc {
  color: var(--color-text-secondary);
  font-size: 1em;
}
.card-meta {
  font-size: 0.95em;
  color: var(--color-text-accent);
  display: flex;
  flex-direction: column;
  gap: 0.1em;
}
.card-actions {
  margin-top: 0.7em;
  display: flex;
  gap: 0.5em;
}
.card-actions button {
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 4px;
  padding: 0.2em 0.8em;
  cursor: pointer;
  font-size: 0.95em;
  transition: background 0.15s;
}
.card-actions button:hover {
  background: var(--color-bg-button-hover);
}
.card-actions .delete-btn {
  background: var(--color-bg-danger);
}
.card-actions .delete-btn:hover {
  background: var(--color-bg-danger-dark);
}

</style>
