<script lang="ts">
import { onMount, createEventDispatcher } from 'svelte';
import { authenticatedFetch, getAuthHeaders } from '$lib/api.js';

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
  const res = await authenticatedFetch(`/api/game-content?type=npc&id=${npc._id}`, {
    method: 'DELETE'
  });
  // Always update local UI, even if backend fails
  npcs = npcs.filter(n => n._id !== npc._id);
};
export let onRemoveItem: (item: any) => void = async (item) => {
  if (!item?._id || !scene?._id) return;
  const res = await authenticatedFetch('/api/game-content/disconnect', {
    method: 'POST',
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
    // Note: FormData uploads need special handling - don't use authenticatedFetch for this
    const res = await fetch(`/api/scenes/${scene._id}/image`, {
      method: 'POST',
      body: formData,
      headers: getAuthHeaders()
    });
    uploadingImage = false;
    if (res.ok) {
      await loadSceneImage();
      selectedImage = null;
    }
  }
  async function loadSceneImage() {
    if (!scene?._id) return;
    const res = await authenticatedFetch(`/api/scenes/${scene._id}/image`);
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
        {/if}
      </div>

    </div>
    <div class="sidebar-toggle-area">
      <div class="sidebar-toggle">
      <button class="sidebar-toggle-btn" on:click={() => sidebarOpen = !sidebarOpen}>{sidebarOpen ? 'Hide Info' : 'Show Info'}</button>
      <button class="sidebar-toggle-btn" on:click={handleClose} aria-label="Close scene view">Close map view</button>
      </div>
      {#if sidebarOpen}
        <div class="sidebar-info">
          <div class="overview-panel sidebar-section">
            <h2>{scene?.name}</h2>
            <p class="desc">{scene?.description}</p>
            <form class="scene-image-upload" on:submit|preventDefault={uploadImage}>
              <label>
                Scene Image:
                <input type="file" accept="image/*" on:change={onImageSelect} />
                <button class="add-btn" type="submit" disabled={!selectedImage || uploadingImage}>{uploadingImage ? 'Uploading...' : 'Upload'}</button>
              </label>
              
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
              {/if}
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
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--color-bg-card);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-main);
  box-shadow: 
    0 4px 15px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border: 1px solid var(--color-border);
  backdrop-filter: blur(10px);
  z-index: 50;
}
.map-scale-slider input[type="range"] {
  flex: 1;
  appearance: none;
  height: 6px;
  background: linear-gradient(90deg, var(--color-bg-secondary), var(--color-bg-button), var(--color-bg-danger));
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.map-scale-slider input[type="range"]:hover {
  background: linear-gradient(90deg, var(--color-bg-accent), var(--color-bg-button-hover), var(--color-bg-danger-dark));
  transform: scale(1.02);
}

.map-scale-slider input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--color-text-main);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid var(--color-bg-button);
  box-shadow: 
    0 3px 8px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.map-scale-slider input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

.map-scale-slider input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: var(--color-text-main);
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid var(--color-bg-button);
  box-shadow: 
    0 3px 8px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.scene-fullscreen-view.map-dominant-layout {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--color-bg-main);
  z-index: 2000;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  justify-content: center;
  padding: 0;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  animation: fadeInLayout 0.5s ease-out;
}

@keyframes fadeInLayout {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.map-main-area {
  flex: 1 1 0%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-secondary);
  position: relative;
  z-index: 1;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  margin: 0.5rem;
}
.big-map {
  flex: 1 1 0%;
  height: 100vh;
  width: 100vw;
  max-width: 100vw;
  max-height: 100vh;
  background: radial-gradient(ellipse at center, #2c3e50, #1a252f);
  display: flex;
  align-items: center;
  justify-content: center;
  resize: both;
  overflow: auto;
  position: relative;
  border: 2px solid rgba(52, 152, 219, 0.3);
  box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.3);
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

.sidebar-toggle {
  display: flex;
  flex-direction: row;
  gap: 0.7em;
}

.sidebar-toggle-btn {
  font-size: 1.1em;
  font-weight: 600;
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 8px;
  padding: 0.6em 1.2em;
  cursor: pointer;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  margin-bottom: 0.75em;
  transition: all 0.2s ease;
  border: 1px solid var(--color-border);
}

.sidebar-toggle-btn:hover {
  background: var(--color-bg-button-hover);
  transform: translateY(-1px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
.sidebar-info {
  background: var(--color-bg-secondary);
  border-radius: 12px;
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  padding: 1.5rem;
  min-width: 320px;
  max-width: 400px;
  height: calc(100vh - 15rem);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  border: 1px solid var(--color-border);
  backdrop-filter: blur(10px);
  overflow-y: auto;
}

.sidebar-info::-webkit-scrollbar {
  width: 8px;
}

.sidebar-info::-webkit-scrollbar-track {
  background: var(--color-bg-main);
  border-radius: 4px;
}

.sidebar-info::-webkit-scrollbar-thumb {
  background: var(--color-bg-button);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.sidebar-info::-webkit-scrollbar-thumb:hover {
  background: var(--color-bg-button-hover);
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
  gap: 1.25em;
  margin-bottom: 1.5em;
  background: linear-gradient(145deg, #455a64, #37474f);
  padding: 1.25em 1.5em;
  border-radius: 12px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.scene-image-upload label {
  font-weight: 600;
  color: #ecf0f1;
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  width: 100%;
}
.scene-image-upload input[type="file"] {
  margin-top: 0.5em;
  font-size: 1em;
  padding: 0.5em;
  background: linear-gradient(145deg, #2c3e50, #34495e);
  border: 1px solid rgba(52, 152, 219, 0.3);
  border-radius: 8px;
  color: #ecf0f1;
  cursor: pointer;
  transition: all 0.3s ease;

}

.scene-image-upload input[type="file"]:hover {
  background: linear-gradient(145deg, #34495e, #3498db);
  border-color: rgba(52, 152, 219, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.scene-image-upload input[type="file"]::file-selector-button {
  background: linear-gradient(145deg, #3498db, #2980b9);
  color: white;
  border: none;
  padding: 0.5em 1em;
  border-radius: 6px;
  margin-right: 0.5em;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.scene-image-upload input[type="file"]::file-selector-button:hover {
  background: linear-gradient(145deg, #2980b9, #1e6b96);
  transform: scale(1.05);
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
  top: 1rem;
  left: 1rem;
  z-index: 1000;
  font-size: 1.1em;
  font-weight: 600;
  background: var(--color-bg-danger);
  color: var(--color-text-main);
  border: none;
  border-radius: 8px;
  padding: 0.6em 1.2em;
  cursor: pointer;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  border: 1px solid var(--color-border);
}

.scene-fullscreen-view .close-btn:hover {
  background: var(--color-bg-danger-dark);
  transform: translateY(-1px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
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
  color: #ecf0f1;
  margin-bottom: 0.5em;
  font-weight: 700;
  font-size: 1.8em;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  background: linear-gradient(135deg, #3498db, #e74c3c);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.overview-panel .desc {
  color: #bdc3c7;
  margin-bottom: 1.5em;
  line-height: 1.6;
  font-size: 1.1em;
}
.quick-stats {
  display: flex;
  gap: 2.5em;
  margin-top: 1.5em;
  font-size: 1.1em;
  background: linear-gradient(145deg, #2c3e50, #34495e);
  padding: 1em 1.5em;
  border-radius: 12px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(52, 152, 219, 0.2);
}

.quick-stats strong {
  color: #3498db;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.quick-stats span {
  color: #ecf0f1;
  font-weight: 500;
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
  background: linear-gradient(145deg, #455a64, #37474f);
  border-radius: 12px;
  padding: 1.25em 1.25em 1em 1.25em;
  box-shadow: 
    0 4px 15px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  margin-bottom: 0.75em;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.team-card.friend {
  border-left: 4px solid #27ae60;
  background: linear-gradient(145deg, #2d5a3d, #1e3a26);
}

.team-card.friend::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #27ae60, #2ecc71);
  box-shadow: 0 0 10px rgba(39, 174, 96, 0.5);
}

.team-card.foe {
  border-left: 4px solid #e74c3c;
  background: linear-gradient(145deg, #5a2d2d, #3a1e1e);
}

.team-card.foe::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #e74c3c, #e67e22);
  box-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
}
.team-header {
  display: flex;
  align-items: center;
  gap: 1.2em;
  margin-bottom: 0.5em;
}
.team-name {
  font-weight: 700;
  color: #ecf0f1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  font-size: 1.1em;
}
.team-type {
  color: #bdc3c7;
  font-size: 0.9em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.team-members {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  margin-bottom: 0.5em;
}
.chip {
  background: linear-gradient(145deg, #3498db, #2980b9);
  color: white;
  border-radius: 16px;
  padding: 0.5em 1em;
  font-size: 0.9em;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  box-shadow: 
    0 2px 8px rgba(52, 152, 219, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.chip:hover {
  transform: translateY(-1px);
  box-shadow: 
    0 4px 12px rgba(52, 152, 219, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
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
  background: linear-gradient(145deg, #27ae60, #219a52);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5em 1em;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 
    0 3px 10px rgba(39, 174, 96, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.add-btn:hover {
  background: linear-gradient(145deg, #219a52, #27ae60);
  transform: translateY(-1px);
  box-shadow: 
    0 5px 15px rgba(39, 174, 96, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
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
  background: linear-gradient(145deg, #455a64, #37474f);
  border-radius: 12px;
  padding: 1em 1.5em;
  display: flex;
  align-items: center;
  gap: 1.5em;
  font-size: 1.05em;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  margin-bottom: 0.75em;
}

.entity-card:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 6px 20px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  border-color: rgba(52, 152, 219, 0.3);
}

.entity-name {
  font-weight: 700;
  color: #ecf0f1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
.entity-type {
  color: #95a5a6;
  font-weight: 500;
}
.remove-btn {
  background: linear-gradient(145deg, #e74c3c, #c0392b);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.5em 1em;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 
    0 3px 10px rgba(231, 76, 60, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.remove-btn:hover {
  background: linear-gradient(145deg, #c0392b, #e74c3c);
  transform: translateY(-1px);
  box-shadow: 
    0 5px 15px rgba(231, 76, 60, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
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
  color: var(--color-text-main);
  font-size: 1em;
  pointer-events: none;
  font-weight: bold;
  box-shadow: 0 1px 6px rgba(0,0,0,0.18);
  cursor: pointer;
  z-index: 5000;
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
  width: 240px;
  background: linear-gradient(180deg, #34495e, #2c3e50);
  border-left: 2px solid rgba(52, 152, 219, 0.3);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 1.5rem 1.25rem;
  gap: 1.25rem;
  box-shadow: 
    -4px 0 20px rgba(0, 0, 0, 0.3),
    inset 1px 0 0 rgba(255, 255, 255, 0.1);
  z-index: 2;
  backdrop-filter: blur(10px);
}
.marker-sidebar h4 {
  margin: 0 0 1rem 0;
  font-size: 1.3rem;
  color: #ecf0f1;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.premade-markers {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
  margin-bottom: 1em;
}
.premade-marker-btn {
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  color: white;
  font-weight: bold;
  font-size: 0.9em;
  padding: 0.75em 1.25em;
  cursor: pointer;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.premade-marker-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.6s;
}

.premade-marker-btn:hover::before {
  left: 100%;
}

.premade-marker-btn:hover, .premade-marker-btn:focus {
  transform: translateY(-2px) scale(1.05);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 
    0 6px 20px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.marker-icon-on-map {
  width: 1.7em;
  height: 1.7em;
  margin-right: 0.2em;
  vertical-align: middle;
}
</style>

