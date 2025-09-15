<script lang="ts">
import { onMount, createEventDispatcher } from 'svelte';

// Marker size for placement
let markerSize = 28;
function handleMarkerSizeChange(e: Event) {
  const target = e.target as HTMLInputElement;
  markerSize = parseInt(target.value);
}

// Map scale and zoom origin
let mapScale = 1;
let mapOriginX = 50;
let mapOriginY = 50;
function handleMapScaleChange(e: Event) {
  const target = e.target as HTMLInputElement;
  mapScale = parseFloat(target.value);
}
function handleMapZoomOrigin(e: MouseEvent) {
  // Only set zoom origin if not placing a marker
  if (placingMarker) return;
  const mapArea = e.currentTarget as HTMLElement;
  const rect = mapArea.getBoundingClientRect();
  mapOriginX = ((e.clientX - rect.left) / rect.width) * 100;
  mapOriginY = ((e.clientY - rect.top) / rect.height) * 100;
}

export let scene: any;
export let npcs: any[] = [];
export let items: any[] = [];
export let players: any[] = [];

const dispatch = createEventDispatcher();

function handleClose() {
  dispatch('close');
}

export let onRemoveNpc: (npc: any) => void = async (npc) => {
  if (!npc?._id) return;
  const res = await fetch(`/api/game-content?type=npc&id=${npc._id}`, {
    method: 'DELETE',
    headers: { 'authorization': localStorage.getItem('token') || '' }
  });
  // Always update local UI, even if backend fails
  npcs = npcs.filter(n => n._id !== npc._id);
};
export let onRemoveItem: (item: any) => void = async (item) => {
  if (!item?._id || !scene?._id) return;
  const res = await fetch('/api/game-content/disconnect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authorization': localStorage.getItem('token') || ''
    },
    body: JSON.stringify({ type: 'item-scene', fromId: item._id, toId: scene._id })
  });
  if (res.ok) {
    items = items.filter(i => i._id !== item._id);
  }
};
  let markerSidebarOpen = true;
  function toggleMarkerSidebar() {
    markerSidebarOpen = !markerSidebarOpen;
  }
  // Sidebar toggle
  let sidebarOpen = true;

  // Teams logic
  let teams: { name: string; members: any[]; type: string }[] = [
    { name: 'Team 1', members: [], type: 'friend' },
    { name: 'Team 2', members: [], type: 'foe' }
  ];
  let selectedNpc: string|null = null;
  let selectedPlayer: string|null = null;
  function isEntityInAnyTeam(entity: any) {
    const entityId = (entity.id ?? entity._id)?.toString();
    return teams.some(team => team.members.some(m => (m.id ?? m._id)?.toString() === entityId));
  }
  function addToTeam(entity: any, teamIdx: number) {
    // Prevent adding the same entity to any team more than once
    if (!isEntityInAnyTeam(entity)) {
      teams[teamIdx].members = [...teams[teamIdx].members, entity];
    }
  }
  function removeFromTeam(entity: any, teamIdx: number) {
    teams[teamIdx].members = teams[teamIdx].members.filter(m => !(m.id === entity.id || m._id === entity.id || m.id === entity._id || m._id === entity._id));
  }

  // Map marker logic
  let mapMarkers: { x: number, y: number, label?: string, color?: string, iconSrc?: string | null, size?: number }[] = [];
  function removeMarkerByIndex(idx: number) {
    mapMarkers = mapMarkers.filter((_, i) => i !== idx);
  }
  let placingMarker = false;
  let markerLabel = '';
  let markerColor = '#ff4444';

  // Pre-made marker types for DnD with SVG icons
  const markerTypes = [
  { label: 'Enemy', color: '#e53935', iconSrc: '/assets/markers/enemy.svg' },
  { label: 'Ally', color: '#43a047', iconSrc: '/assets/markers/ally.svg' },
  { label: 'Obstruction', color: '#757575', iconSrc: '/assets/markers/obstruction.svg' },
  { label: 'Objective', color: '#fbc02d', iconSrc: '/assets/markers/objective.svg' },
  { label: 'Trap', color: '#8e24aa', iconSrc: '/assets/markers/trap.svg' },
  { label: 'Treasure', color: '#ffb300', iconSrc: '/assets/markers/treasure.svg' },
  { label: 'NPC', color: '#039be5', iconSrc: '/assets/markers/npc.svg' },
  { label: 'Start', color: '#00bcd4', iconSrc: '/assets/markers/start.svg' },
  { label: 'Exit', color: '#ff7043', iconSrc: '/assets/markers/exit.svg' }
  ];

  let markerIconSrc: string | null = null;
  function selectMarkerType(type: { label: string, color: string, iconSrc?: string }) {
    markerLabel = type.label;
    markerColor = type.color;
    placingMarker = true;
    markerIconSrc = type.iconSrc || null;
  }
  function handleMapClick(e: MouseEvent) {
    if (!placingMarker) return;
    let mapArea: HTMLElement | null = e.currentTarget as HTMLElement;
    if (!mapArea.classList.contains('map-area')) {
      mapArea = mapArea.closest('.map-area');
    }
    if (!mapArea) return;
    const rect = mapArea.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    mapMarkers = [...mapMarkers, { x, y, label: markerLabel, color: markerColor, iconSrc: markerIconSrc, size: markerSize }];
    placingMarker = false;
    markerLabel = '';
    markerIconSrc = null;
  }
  function handleMapKeydown(e: KeyboardEvent) {
    if (!placingMarker) return;
    if (e.key === 'Enter' || e.key === ' ') {
      // Place marker at center of map area
      const x = 50;
      const y = 50;
      mapMarkers = [...mapMarkers, { x, y, label: markerLabel, color: markerColor, iconSrc: markerIconSrc }];
      placingMarker = false;
      markerLabel = '';
      markerIconSrc = null;
    }
  }

  // Image upload logic
  let selectedImage: File|null = null;
  let uploadingImage = false;
  let sceneImageUrl: string|null = null;
  function onImageSelect(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    selectedImage = files && files[0] ? files[0] : null;
  }
  async function uploadImage() {
    if (!selectedImage || !scene?._id) return;
    uploadingImage = true;
    const formData = new FormData();
    formData.append('image', selectedImage);
    const res = await fetch(`/api/scenes/${scene._id}/image`, {
      method: 'POST',
      body: formData,
      headers: { 'authorization': localStorage.getItem('token') || '' }
    });
    uploadingImage = false;
    if (res.ok) {
      await loadSceneImage();
      selectedImage = null;
    }
  }
  async function loadSceneImage() {
    if (!scene?._id) return;
    const res = await fetch(`/api/scenes/${scene._id}/image`, {
      headers: { 'authorization': localStorage.getItem('token') || '' }
    });
    if (res.ok) {
      const blob = await res.blob();
      sceneImageUrl = URL.createObjectURL(blob);
    } else {
      sceneImageUrl = null;
    }
  }
  onMount(() => {
    loadSceneImage();
  });

  </script>
  

  <div class="scene-fullscreen-view map-dominant-layout" role="dialog" tabindex="0" on:keydown={e => { if (e.key === 'Escape') handleClose(); }}>
    <button class="close-btn" on:click={handleClose} aria-label="Close scene view">Close</button>
 

    <div class="map-main-area-with-sidebar">
      <div class="map-area big-map"
        style="transform: scale({mapScale}); transform-origin: {mapOriginX}% {mapOriginY}%;"
        on:click={(e) => { placingMarker ? handleMapClick(e) : handleMapZoomOrigin(e); }}
        on:keydown={handleMapKeydown}
        role="button"
        tabindex="0"
        aria-label="Battle map area. Click or press Enter/Space to place marker. Click to set zoom center."
      >
        {#if sceneImageUrl}
          <div class="scene-image-preview">
            <img src={sceneImageUrl} alt="Scene" />
          </div>
        {/if}

    {#each mapMarkers as marker, i}
      <div
        class="map-marker"
        style="left: {marker.x}%; top: {marker.y}%;"
        on:click|stopPropagation={() => removeMarkerByIndex(i)}
        on:keydown|stopPropagation={(e) => { if (e.key === 'Enter' || e.key === ' ') { removeMarkerByIndex(i); } }}
        title="Remove marker"
        tabindex="0"
        role="button"
        aria-label="Remove marker"
      >
        {#if marker.iconSrc}
          <img src={marker.iconSrc} class="marker-icon-on-map" width={marker.size || 28} height={marker.size || 28} alt={marker.label || 'Marker icon'} />
        {/if}
      </div>
    {/each}




  </div>
      <div class="marker-sidebar {markerSidebarOpen ? '' : 'minimized'}">
        <button class="marker-sidebar-toggle" on:click={toggleMarkerSidebar} title={markerSidebarOpen ? 'Minimize marker bar' : 'Expand marker bar'}>
          {#if markerSidebarOpen}
            &laquo;
          {:else}
            &raquo;
          {/if}
        </button>
        {#if markerSidebarOpen}
          <h4>Markers</h4>
          <div class="premade-markers">
            {#each markerTypes as type}
              <button class="premade-marker-btn" style="background: {type.color};" on:click={() => selectMarkerType(type)} title={type.label}>
                <img src={type.iconSrc} alt={type.label} class="marker-icon" width="24" height="24" />
              </button>
            {/each}
          </div>
          <div class="marker-controls">
            <input type="text" placeholder="Marker label" bind:value={markerLabel} />
            <input type="color" bind:value={markerColor} />
            <div class="marker-size-slider">
              <label for="marker-size">Marker Size:</label>
              <input id="marker-size" type="range" min="12" max="64" step="1" bind:value={markerSize} on:input={handleMarkerSizeChange} />
              <span>{markerSize}px</span>
            </div>
            <button class="add-btn" on:click={() => placingMarker = true} disabled={placingMarker || !markerLabel}>Place Marker</button>
            {#if placingMarker}
              <span class="placing-hint">Click on the map to place marker</span>
            {/if}
          </div>
        {/if}
      </div>

    </div>
    <div class="sidebar-toggle-area">
      <button class="sidebar-toggle-btn" on:click={() => sidebarOpen = !sidebarOpen}>{sidebarOpen ? 'Hide Info' : 'Show Info'}</button>
      {#if sidebarOpen}
        <div class="sidebar-info">
          <div class="overview-panel sidebar-section">
            <h2>{scene?.name}</h2>
            <p class="desc">{scene?.description}</p>
            <form class="scene-image-upload" on:submit|preventDefault={uploadImage}>
              <label>
                Scene Image:
                <input type="file" accept="image/*" on:change={onImageSelect} />
              </label>
              <button class="add-btn" type="submit" disabled={!selectedImage || uploadingImage}>{uploadingImage ? 'Uploading...' : 'Upload'}</button>
            </form>
        
            <div class="quick-stats">
              <span><strong>NPCs:</strong> {npcs.length}</span>
              <span><strong>Items:</strong> {items.length}</span>
              <span><strong>Players:</strong> {players.length}</span>
            </div>
          </div>
          <div class="teams-panel sidebar-section">
            <h3>Teams</h3>


            <div class="teams-list large-tabs">

              {#each teams as team, i}
                <div class="team-card {team.type}">
                  <div class="team-header big">
                    <span class="team-name big">{team.name}</span>
                    <span class="team-type big">{team.type === 'friend' ? 'Friend' : 'Foe'}</span>
                  </div>
                  <div class="team-members">
                    {#each team.members as member}
                      <span class="chip big">{member.name}
                        <button class="remove-chip" on:click={() => removeFromTeam(member, i)}>×</button>
                      </span>
                    {/each}
                  </div>
                  <div class="add-to-team">
                    <div class="add-entities">
                      <span>Add NPC:</span>
                      <select bind:value={selectedNpc}>
                        <option value={null}>Select NPC</option>
                        {#each npcs as npc}
                          {#if !isEntityInAnyTeam(npc)}
                            <option value={npc.id ?? npc._id}>{npc.name}</option>
                          {/if}
                        {/each}
                      </select>
                      <button class="add-btn" on:click={() => {
                        const npc = npcs.find(n => (n.id ?? n._id)?.toString() === (selectedNpc ?? '').toString());
                        if (npc) addToTeam(npc, i);
                        selectedNpc = null;
                      }} disabled={!!(!selectedNpc || (selectedNpc && isEntityInAnyTeam(npcs.find(n => (n.id ?? n._id)?.toString() === (selectedNpc ?? '').toString()))))}>Add</button>

                    </div>


                    <div class="add-entities">
                      <span>Add Player:</span>
                      {#if players.length === 0}
                        <span class="no-players">No players available</span>
                      {:else}
                        <select bind:value={selectedPlayer}>
                          <option value={null}>Select Player</option>
                          {#each players as player}
                            {#if !isEntityInAnyTeam(player)}
                              <option value={player.id ?? player._id}>{player.name}</option>
                            {/if}
                          {/each}
                        </select>

                        <button class="add-btn" on:click={() => {
                          const player = players.find(p => (p.id ?? p._id)?.toString() === (selectedPlayer ?? '').toString());
                          if (player) addToTeam(player, i);
                          selectedPlayer = null;
                        }} disabled={!!(!selectedPlayer || (selectedPlayer && isEntityInAnyTeam(players.find(p => (p.id ?? p._id)?.toString() === (selectedPlayer ?? '').toString()))))}>Add</button>

                      {/if}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
          <div class="items-panel sidebar-section">
            <h3>Items in Scene</h3>
            <div class="entity-list">
              {#each items as item}
                <div class="entity-card">
                  <span class="entity-name">{item.name}</span>
                  <span class="entity-type">{item.itemType}</span>
                    <button class="remove-btn" on:click={() => onRemoveItem(item)}>Remove</button>
                </div>
              {/each}
              {#if items.length === 0}
                <p>No items in this scene.</p>
              {/if}
            </div>
            <h3>NPCs in Scene</h3>
            <div class="entity-list">
              {#each npcs as npc}
                <div class="entity-card">
                  <span class="entity-name">{npc.name}</span>
                  <span class="entity-role">{npc.role}</span>
                        <button class="remove-btn" on:click={() => onRemoveNpc(npc)}>Remove</button>
                </div>
              {/each}
              {#if npcs.length === 0}
                <p>No NPCs in this scene.</p>
              {/if}s
            </div>
          </div>
        </div>
      {/if}
    </div>
     <div class="map-scale-slider">
        <label for="map-scale">Map Size:</label>
        <input id="map-scale" type="range" min="0.5" max="2" step="0.01" bind:value={mapScale} on:input={handleMapScaleChange} />
        <span>{Math.round(mapScale * 100)}%</span>
    </div>
  </div>

   
<style>

    .marker-size-slider {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.7em;
  margin: 0.5em 0 0.5em 0;
  font-size: 1em;
  justify-content: flex-start;
}
.marker-size-slider input[type="range"] {
  flex: 1 1 0%;
  accent-color: var(--color-accent, #2196f3);
  height: 2px;
}
/* Map-dominant layout and sidebar styles */
.marker-sidebar {
  transition: width 0.2s, min-width 0.2s, max-width 0.2s;
}
.marker-sidebar.minimized {
  width: 36px !important;
  min-width: 36px !important;
  max-width: 36px !important;
  padding: 0.5em 0.2em !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}
.marker-sidebar-toggle {
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 6px;
  font-size: 1.3em;
  width: 28px;
  height: 28px;
  margin-bottom: 0.7em;
  cursor: pointer;
  align-self: flex-end;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.marker-sidebar.minimized .marker-sidebar-toggle {
  margin-bottom: 0;
  align-self: center;
}
.map-scale-slider {
    position: absolute;
  width: 70vw;
  display: flex;
  align-items: center;
  gap: 3.7em;
  margin: 1em 0 0.5em 0;
  font-size: 2em;
  justify-content: flex-start;
}
.map-scale-slider input[type="range"] {
  flex: 1 1 0%;
  accent-color: var(--color-accent, #2196f3);
  height: 2px;
}

.scene-fullscreen-view.map-dominant-layout {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--color-bg-modal);
  z-index: 2000;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: center;
  padding: 0;
  overflow: hidden;
}
.map-main-area {
  flex: 1 1 0%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-main);
  position: relative;
  z-index: 1;
}
.big-map {
  flex: 1 1 0%;
  height: 100vh;
  width: 100vw;
  max-width: 100vw;
  max-height: 100vh;
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  resize: both;
  overflow: auto;
}
.sidebar-toggle-area {
  position: absolute;
  top: 2.5vh;
  left: 2vw;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.7em;
}
.sidebar-toggle-btn {
  font-size: 1.2em;
  font-weight: 600;
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 8px;
  padding: 0.5em 1.2em;
  cursor: pointer;
  box-shadow: 0 1px 6px rgba(0,0,0,0.10);
  margin-bottom: 0.5em;
}
.sidebar-info {
  background: var(--color-bg-main);
  border-radius: 14px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.13);
  padding: 1.2em 1.5em 1.2em 1.5em;
  min-width: 340px;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 1.5em;
}
.sidebar-section {
  margin-bottom: 1.2em;
}
.large-tabs .team-card {
  margin-bottom: 1.2em;
}
.team-header.big, .team-name.big, .team-type.big, .chip.big {
  font-size: 1.25em;
  padding: 0.2em 0.7em;
}
.chip.big {
  border-radius: 16px;
  font-size: 1.1em;
  padding: 0.25em 1em;
}

.scene-image-upload {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 1em;
  margin-bottom: 1.2em;
  background: var(--color-bg-secondary);
  padding: 0.7em 1em 0.7em 1em;
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
}
.scene-image-upload label {
  font-weight: 500;
  color: var(--color-text-main);
  display: flex;
  flex-direction: column;
  gap: 0.3em;
}
.scene-image-upload input[type="file"] {
  margin-top: 0.2em;
  font-size: 1em;
}
.scene-image-upload .add-btn {
  margin-left: 0.5em;
  min-width: 90px;
}
.scene-image-preview {
    width: 100b;
    height: 100%;
  display: flex;
  justify-content: center;
  z-index: 0;
}
.scene-image-preview img {
  z-index: 0;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.13);
  border: 2px solid var(--color-bg-button);
  position: relative;
}


.scene-fullscreen-view.multi-panel {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--color-bg-modal);
  z-index: 2000;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: center;
  padding: 2em 2em 2em 2em;
}
.scene-fullscreen-view .close-btn {
    position: absolute;
    top: 1.6rem;
    left: 9.5em;
    z-index: 10;
  font-size: 1.2em;
    font-weight: 600;
    background: var(--color-bg-button);
    color: var(--color-text-main);
    border: none;
    border-radius: 8px;
    padding: 0.5em 1.2em;
    cursor: pointer;
    box-shadow: 0 1px 6px rgba(0, 0, 0, 0.10);
    margin-bottom: 0.5em;
    z-index: 80;
}
.scene-panels {
  display: flex;
  flex-direction: row;
  gap: 2.5em;
  width: 100vw;
  max-width: 1800px;
  position: relative;
}
.panel {
  background: var(--color-bg-main);
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.10);
  padding: 1.5em 1.5em 1.2em 1.5em;
  min-width: 320px;
  max-width: 400px;
  flex: 1 1 350px;
  display: flex;
  flex-direction: column;
  gap: 1em;
  position: relative;
}
.overview-panel h2 {
  color: var(--color-text-accent);
  margin-bottom: 0.2em;
}
.overview-panel .desc {
  color: var(--color-text-main);
  margin-bottom: 1em;
}
.quick-stats {
  display: flex;
  gap: 2em;
  margin-top: 1em;
  font-size: 1.1em;
}
.teams-panel {
  min-width: 340px;
  max-width: 420px;
}
.teams-list {
  display: flex;
  flex-direction: column;
  gap: 1.2em;
}
.team-card {
  background: var(--color-bg-secondary);
  border-radius: 10px;
  padding: 1em 1em 0.7em 1em;
  box-shadow: 0 1px 6px rgba(0,0,0,0.10);
  margin-bottom: 0.5em;
}
.team-card.friend {
  border-left: 5px solid var(--color-success, #4caf50);
}
.team-card.foe {
  border-left: 5px solid var(--color-bg-danger, #e53935);
}
.team-header {
  display: flex;
  align-items: center;
  gap: 1.2em;
  margin-bottom: 0.5em;
}
.team-name {
  font-weight: bold;
  color: var(--color-text-accent);
}
.team-type {
  color: var(--color-text-secondary);
  font-size: 0.98em;
}
.team-members {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  margin-bottom: 0.5em;
}
.chip {
  background: var(--color-bg-button);
  color: var(--color-text-accent);
  border-radius: 12px;
  padding: 0.15em 0.7em;
  font-size: 0.98em;
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
}
.remove-chip {
  background: none;
  border: none;
  color: var(--color-text-danger, #e53935);
  font-size: 1.1em;
  cursor: pointer;
}
.add-to-team {
  margin-top: 0.3em;
  display: flex;
  flex-direction: column;
  gap: 0.3em;
}
.add-entities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4em;
  margin-top: 0.2em;
}
.add-btn {
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 6px;
  padding: 0.2em 0.7em;
  font-size: 0.98em;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.items-panel {
  min-width: 320px;
  max-width: 400px;
}
.entity-list {
  display: flex;
  flex-direction: column;
  gap: 0.7em;
}
.entity-card {
  background: var(--color-bg-secondary);
  border-radius: 8px;
  padding: 0.7em 1.2em;
  display: flex;
  align-items: center;
  gap: 1.2em;
  font-size: 1.05em;
  box-shadow: 0 1px 6px rgba(0,0,0,0.10);
}
.entity-name {
  font-weight: bold;
  color: var(--color-text-accent);
}
.entity-type {
  color: var(--color-text-secondary);
}
.remove-btn {
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 4px;
  padding: 0.2em 0.7em;
  font-size: 1em;
  cursor: pointer;
}
.map-panel {
  min-width: 340px;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 1em;
}
.map-area {
  position: relative;
  width: 100%;
  min-height: 100%;
  cursor: crosshair;
}
.map-placeholder {
  width: 100%;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: 1.2em;
}
.map-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  padding: 0.2em 0.7em;
  border-radius: 8px;
  color: #fff;
  font-size: 1em;
  pointer-events: none;
  font-weight: bold;
  box-shadow: 0 1px 6px rgba(0,0,0,0.18);
  cursor: pointer;
  z-index: 5000;
}
.marker-controls {
  display: flex;
  align-items: center;
  gap: 0.7em;
  margin-top: 0.5em;
}
.placing-hint {
  color: var(--color-text-warning, #ff9800);
  font-size: 0.98em;
  margin-left: 0.7em;
}
/* Marker sidebar styles */
.map-main-area-with-sidebar {
  display: flex;
  flex-direction: row;
  position: absolute;
  width: 100vw;
  height: 100vh;
}
.marker-sidebar {
    position: absolute;
    right: 0;
    height: 100vh;
  width: 220px;
  background: var(--color-bg-secondary);
  border-left: 2px solid var(--color-bg-main);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 1.2em 1em;
  gap: 1em;
  box-shadow: -2px 0 8px rgba(0,0,0,0.06);
  z-index: 2;
}
.marker-sidebar h4 {
  margin: 0 0 0.7em 0;
  font-size: 1.1em;
  color: var(--color-text-accent);
}
.marker-sidebar .marker-controls {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}
.marker-sidebar .placing-hint {
  margin-top: 0.3em;
}


.premade-markers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  margin-bottom: 1em;
}
.premade-marker-btn {
  border: none;
  border-radius: 8px;
  color: #fff;
  font-weight: bold;
  font-size: 1em;
  padding: 0.4em 1em;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.10);
  transition: transform 0.08s;
}
.premade-marker-btn:hover, .premade-marker-btn:focus {
  transform: scale(1.08);
  outline: 2px solid var(--color-text-accent, #fff);
}
.marker-icon-on-map {
  width: 1.7em;
  height: 1.7em;
  margin-right: 0.2em;
  vertical-align: middle;
}
</style>

