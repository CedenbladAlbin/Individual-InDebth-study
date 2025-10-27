<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let type: 'npc' | 'player' | 'item' | 'scene';
  export let gameId: string;
  export let connections: any = {};
  export let initialData: any = null; // For editing existing entities
  export let onCreated: ((data: any) => void) | undefined = undefined;
  // Initialize form fields with existing data if editing
  let name = initialData?.name || '';
  let description = initialData?.description || '';
  // Extra fields for each type
  let itemType = initialData?.itemType || '';
  let itemBenefits = initialData?.benefits || '';
  let npcRole = initialData?.role || '';
  let npcStatus = initialData?.status || '';
  let playerClass = initialData?.class || '';
  let playerLevel = initialData?.level || '';
  let sceneLocation = initialData?.location || '';
  let sceneDangerLevel = initialData?.dangerLevel || '';
  let error = '';
  let loading = false;

  // Determine if we're editing or creating
  $: isEditing = initialData && initialData._id;
  const dispatch = createEventDispatcher();

  async function handleSubmit() {
    loading = true;
    error = '';
    const token = localStorage.getItem('token');
    if (!token) {
      error = 'Not signed in.';
      loading = false;
      return;
    }
    let extraData = {};
    if (type === 'item') {
      extraData = { itemType, benefits: itemBenefits };
    } else if (type === 'npc') {
      extraData = { role: npcRole, status: npcStatus };
    } else if (type === 'player') {
      extraData = { class: playerClass, level: playerLevel };
    } else if (type === 'scene') {
      extraData = { location: sceneLocation, dangerLevel: sceneDangerLevel };
    }
    const body: any = {
      type,
      gameId,
      data: { name, description, ...extraData },
      connections
    };

    // If editing, include the ID and use PUT method
    if (isEditing) {
      body.id = initialData._id;
    }

    try {
      const res = await fetch('/api/game-content', {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const result = await res.json();
        if (!isEditing) {
          // Clear form only when creating new entities
          name = '';
          description = '';
          itemType = '';
          itemBenefits = '';
          npcRole = '';
          npcStatus = '';
          playerClass = '';
          playerLevel = '';
          sceneLocation = '';
          sceneDangerLevel = '';
        }
        dispatch('created', result);
        if (onCreated) onCreated(result);
      } else {
        error = isEditing ? 'Failed to update.' : 'Failed to create.';
      }
    } catch (e) {
      error = isEditing ? 'Failed to update.' : 'Failed to create.';
    }
    loading = false;
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="content-form">
  <input type="text" bind:value={name} placeholder="Name" required />
  <textarea bind:value={description} placeholder="Description" rows="2"></textarea>

  {#if type === 'item'}
    <input type="text" bind:value={itemType} placeholder="Item Type (e.g. weapon, potion)" />
    <input type="text" bind:value={itemBenefits} placeholder="Benefits (comma separated)" />
  {/if}
  {#if type === 'npc'}
    <input type="text" bind:value={npcRole} placeholder="Role (e.g. merchant, enemy)" />
    <input type="text" bind:value={npcStatus} placeholder="Status (e.g. alive, dead)" />
  {/if}
  {#if type === 'player'}
    <input type="text" bind:value={playerClass} placeholder="Class (e.g. wizard, rogue)" />
    <input type="text" bind:value={playerLevel} placeholder="Level" />
  {/if}
  {#if type === 'scene'}
    <input type="text" bind:value={sceneLocation} placeholder="Location (e.g. forest, tavern)" />
    <input type="text" bind:value={sceneDangerLevel} placeholder="Danger Level (e.g. low, high)" />
  {/if}

  <button type="submit" disabled={loading}>{loading ? 'Saving...' : (isEditing ? `Update ${type}` : `Add ${type}`)}</button>
  {#if error}
    <div class="error">{error}</div>
  {/if}
</form>

<style>
.content-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
input, textarea {
  background: var(--color-bg-secondary);
  color: var(--color-text-main);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.5rem;
}
button {
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 4px;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error {
  color: var(--color-text-warning);
  font-size: 0.95em;
}
</style>
