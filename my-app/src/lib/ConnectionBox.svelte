<script lang="ts">
  export let npcs: any[] = [];
  export let players: any[] = [];
  export let items: any[] = [];
  export let scenes: any[] = [];
  export let onConnect = (from: any, to: any) => {};

  let dragging: { type: string, entity: any } | null = null;

  function handleDragStart(type: string, entity: any) {
    dragging = { type, entity };
  }
  function handleDragEnd() {
    dragging = null;
  }
  let dropTarget: { type: string, id: string } | null = null;

  function isValidDrop(from: { type: string, entity: any } | null, toType: string) {
    if (!from) return false;
    // Only allow valid connections
    if (from.type === 'item' && (toType === 'player' || toType === 'npc' || toType === 'scene')) return true;
    if (from.type === 'npc' && toType === 'scene') return true;
    // Player-to-scene is not needed; players are always accessible in all scenes
    return false;
  }

  function handleDrop(targetType: string, target: any) {
    if (dragging && dragging.entity._id !== target._id && isValidDrop(dragging, targetType)) {
      onConnect(dragging, { type: targetType, entity: target });
    }
    dragging = null;
    dropTarget = null;
  }

  function handleDragEnter(targetType: string, target: any) {
    if (dragging && dragging.entity._id !== target._id && isValidDrop(dragging, targetType)) {
      dropTarget = { type: targetType, id: target._id };
    }
  }
  function handleDragLeave(targetType: string, target: any) {
    if (dropTarget && dropTarget.type === targetType && dropTarget.id === target._id) {
      dropTarget = null;
    }
  }
</script>

<div class="connection-box">
  <h3>Drag and Drop to Connect</h3>
  <div class="entity-row">
    <div class="entity-group">
      <div class="group-title">Players</div>
      {#each players as player}
        <div class="entity-chip" role="option" aria-grabbed={dragging ? 'true' : 'false'} tabindex="0" draggable="true"
          on:dragstart={() => handleDragStart('player', player)}
          on:dragend={handleDragEnd}
          on:drop={() => handleDrop('player', player)}
          on:dragover|preventDefault
          on:dragenter={() => handleDragEnter('player', player)}
          on:dragleave={() => handleDragLeave('player', player)}
          class:selected={dropTarget && dropTarget.type === 'player' && dropTarget.id === player._id && isValidDrop(dragging, 'player')}
          class:invalid-drop={dragging && dragging.entity._id !== player._id && !isValidDrop(dragging, 'player')}
        >{player.name}
          {#if dropTarget && dropTarget.type === 'player' && dropTarget.id === player._id && dragging}
            <span class="drop-preview">Connect {dragging.entity.name} → {player.name}</span>
          {/if}
        </div>
      {/each}
    </div>
    <div class="entity-group">
      <div class="group-title">NPCs</div>
      {#each npcs as npc}
        <div class="entity-chip" role="option" aria-grabbed={dragging ? 'true' : 'false'} tabindex="0" draggable="true"
          on:dragstart={() => handleDragStart('npc', npc)}
          on:dragend={handleDragEnd}
          on:drop={() => handleDrop('npc', npc)}
          on:dragover|preventDefault
          on:dragenter={() => handleDragEnter('npc', npc)}
          on:dragleave={() => handleDragLeave('npc', npc)}
          class:selected={dropTarget && dropTarget.type === 'npc' && dropTarget.id === npc._id && isValidDrop(dragging, 'npc')}
          class:invalid-drop={dragging && dragging.entity._id !== npc._id && !isValidDrop(dragging, 'npc')}
        >{npc.name}
          {#if dropTarget && dropTarget.type === 'npc' && dropTarget.id === npc._id && dragging}
            <span class="drop-preview">Connect {dragging.entity.name} → {npc.name}</span>
          {/if}
        </div>
      {/each}
    </div>
    <div class="entity-group">
      <div class="group-title">Items</div>
      {#each items as item}
        <div class="entity-chip" role="option" aria-grabbed={dragging ? 'true' : 'false'} tabindex="0" draggable="true"
          on:dragstart={() => handleDragStart('item', item)}
          on:dragend={handleDragEnd}
          on:drop={() => handleDrop('item', item)}
          on:dragover|preventDefault
          on:dragenter={() => handleDragEnter('item', item)}
          on:dragleave={() => handleDragLeave('item', item)}
          class:selected={dropTarget && dropTarget.type === 'item' && dropTarget.id === item._id && isValidDrop(dragging, 'item')}
          class:invalid-drop={dragging && dragging.entity._id !== item._id && !isValidDrop(dragging, 'item')}
        >{item.name}
          {#if dropTarget && dropTarget.type === 'item' && dropTarget.id === item._id && dragging}
            <span class="drop-preview">Connect {dragging.entity.name} → {item.name}</span>
          {/if}
        </div>
      {/each}
    </div>
    <div class="entity-group">
      <div class="group-title">Scenes</div>
      {#each scenes as scene}
        <div class="entity-chip" role="option" aria-grabbed={dragging ? 'true' : 'false'} tabindex="0" draggable="true"
          on:dragstart={() => handleDragStart('scene', scene)}
          on:dragend={handleDragEnd}
          on:drop={() => handleDrop('scene', scene)}
          on:dragover|preventDefault
          on:dragenter={() => handleDragEnter('scene', scene)}
          on:dragleave={() => handleDragLeave('scene', scene)}
          class:selected={dropTarget && dropTarget.type === 'scene' && dropTarget.id === scene._id && isValidDrop(dragging, 'scene')}
          class:invalid-drop={dragging && dragging.entity._id !== scene._id && !isValidDrop(dragging, 'scene')}
        >{scene.name}
          {#if dropTarget && dropTarget.type === 'scene' && dropTarget.id === scene._id && dragging}
            <span class="drop-preview">Connect {dragging.entity.name} → {scene.name}</span>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>

h3 {
  margin-bottom: 0.8em;
  color: var(--color-text-accent3);
}

.connection-box {
  background: var(--color-bg-main);
  border-radius: 10px;
  padding: 1.2em 1.5em;
  margin-bottom: 2em;
  box-shadow: 0 1px 8px rgba(0,0,0,0.08);
}
.entity-row {
  display: flex;
  gap: 2em;
  margin-top: 1em;
}
.entity-group {
  min-width: 120px;
}
.group-title {
  font-weight: bold;
  margin-bottom: 0.5em;
  color: var(--color-text-accent);
}
.entity-chip {
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border-radius: 12px;
  padding: 0.4em 1em;
  margin-bottom: 0.4em;
  cursor: grab;
  user-select: none;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  transition: background 0.15s;
  outline: none;
}
.entity-chip.selected {
  background: var(--color-bg-success);
  color: var(--color-text-main);
  border: 2px solid var(--color-bg-success-dark, #2e7d32);
}
.entity-chip.invalid-drop {
  background: var(--color-bg-danger, #ffcccc);
  color: var(--color-text-main);
  opacity: 0.7;
}
.entity-chip:active {
  background: var(--color-bg-button-hover);
}
.drop-preview {
  display: block;
  font-size: 0.9em;
  color: var(--color-text-accent);
  margin-top: 0.2em;
}
</style>
