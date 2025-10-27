<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import GameContentForm from '$lib/GameContentForm.svelte';
  import SidebarSessions from '$lib/SidebarSessions.svelte';
  import SessionForm from '$lib/SessionForm.svelte';
  import SessionDetailsBox from './SessionDetailsBox.svelte';
  import EntityCardList from '$lib/EntityCardList.svelte';
  import EntitySection from '$lib/EntitySection.svelte';
  import SessionList from './SessionList.svelte';
  import SceneFullscreenView from '$lib/SceneFullscreenView.svelte';
  import ConnectionBox from '$lib/ConnectionBox.svelte';
  import { fetchAllGameContent, buildEntityMaps, entityApi, notesApi, sessionsApi, isAuthenticated, authenticatedFetch } from '$lib/api.js';

  // ===== REACTIVE VARIABLES =====
  $: id = $page.params.id ?? '';
  
  // Prevent body scroll when mobile menu is open
  $: if (typeof document !== 'undefined') {
    if (isMobileMenuOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }
  
  $: sessionHistory = sessions.filter(s => s.isEnded);
  $: upcomingSessions = sessions.filter(s => !s.isEnded);

  // ===== STATE VARIABLES =====
  
  // Game & Entity Data
  let game: any = null;
  let loading = true;
  let error = '';
  let npcs: any = [];
  let players: any = [];
  let items: any = [];
  let scenes: any = [];

  // Entity Lookup Maps
  let npcMap: { [key: string]: any } = {};
  let sceneMap: { [key: string]: any } = {};
  let playerMap: { [key: string]: any } = {};
  let itemMap: { [key: string]: any } = {};

  // UI State
  let activeTab: 'scene' | 'npc' | 'player' | 'item' | 'settings' | '' = '';
  let editing: { type: string, data: any } | null = null;
  let connecting: { type: string, data: any } | null = null;
  let selectedEntity: { type: string, entity: any } | null = null;
  let fullscreenScene: any = null;

  // Mobile Responsive State
  let isMobileMenuOpen = false;
  let isMobile = false;
  let showConnectionBox = true;

  // Notes Modal State
  let notesModal: { type: string, entityId: string, notes: any[], loading: boolean, error: string, editingNote: any|null } | null = null;
  let newNoteTitle = '';
  let newNoteText = '';

  // Sessions State
  let sessions: any[] = [];
  let selectedSession: any = null;
  let showSessionDetails = true;
  let editSessionDetails = false;
  let editSessionData: any = {};
  let sessionLoading = false;
  let sessionError = '';
  let sessionModalOpen = false;
  let sessionModalSession: any = null;

  // ===== UTILITY FUNCTIONS =====
  
  // Mobile device detection
  function checkMobile() {
    isMobile = window.innerWidth < 768;
    if (!isMobile) isMobileMenuOpen = false;
  }

  // Enrich session entities with full data from lookup maps
  function enrichSessionEntities(session: any) {
    return {
      ...session,
      npcs: (session.npcs || session.connections?.npcs || []).map((id: any) => typeof id === 'object' ? id : npcMap[id] || { _id: id }),
      scenes: (session.scenes || session.connections?.scenes || []).map((id: any) => typeof id === 'object' ? id : sceneMap[id] || { _id: id }),
      players: (session.players || session.connections?.players || []).map((id: any) => typeof id === 'object' ? id : playerMap[id] || { _id: id }),
      items: (session.items || session.connections?.items || []).map((id: any) => typeof id === 'object' ? id : itemMap[id] || { _id: id }),
    };
  }

  // ===== DATA FETCHING FUNCTIONS =====
  
  // Fetch all game content (entities)
  async function fetchAllContent() {
    const content = await fetchAllGameContent(id);
    npcs = content.npcs;
    players = content.players;
    items = content.items;
    scenes = content.scenes;
    
    const maps = buildEntityMaps(content);
    npcMap = maps.npcMap;
    sceneMap = maps.sceneMap;
    playerMap = maps.playerMap;
    itemMap = maps.itemMap;
  }

  // Fetch all sessions for the game
  async function fetchSessions() {
    sessionLoading = true;
    try {
      sessions = await sessionsApi.getAll(id);
    } catch {
      sessionError = 'Failed to load sessions.';
    }
    sessionLoading = false;
  }

  // ===== UI STATE MANAGEMENT FUNCTIONS =====
  
  // Entity creation modal functions
  function startCreate(type: string, data: any) {
    editing = { type, data: {} };
  }
  
  function stopCreate() {
    editing = null;
  }

  // Entity editing modal functions
  function startEdit(type: string, data: any) {
    editing = { type, data };
  }

  // Entity connection modal functions
  function startConnect(type: string, data: any) {
    connecting = { type, data };
  }
  
  function stopConnect() {
    connecting = null;
  }

  // Entity view functions
  function handleEntityClick(type: string, entity: any) {
    if (type === 'scene') {
      fullscreenScene = entity;
    } else {
      selectedEntity = { type, entity };
    }
  }
  
  function closeFullscreenScene() {
    fullscreenScene = null;
  }
  
  function closeConnectionView() {
    selectedEntity = null;
  }

  // Session modal functions
  function saveSessionEdit() {
    if (!selectedSession || !editSessionDetails) return;
    selectedSession = { ...selectedSession, ...editSessionData };
    editSessionDetails = false;
  }

  // ===== ENTITY CRUD FUNCTIONS =====
  
  // Delete entity
  async function deleteContent(type: string, id: string) {
    if (!confirm('Are you sure you want to delete this?')) return;
    const success = await entityApi.delete(type, id);
    if (success) {
      await fetchAllContent();
    }
  }

  // Remove session
  async function removeSession(sessionId: string) {
    if (!confirm('Are you sure you want to remove this session?')) return;
    const success = await sessionsApi.delete(sessionId);
    if (success) {
      sessions = sessions.filter(s => s._id !== sessionId);
    } else {
      alert('Failed to remove session.');
    }
  }

  // ===== NOTES FUNCTIONS =====
  
  async function openNotes(type: string, entityId: string) {
    notesModal = { type, entityId, notes: [], loading: true, error: '', editingNote: null };
    try {
      notesModal.notes = await notesApi.getAll(type, entityId);
    } catch {
      notesModal.error = 'Failed to load notes.';
    }
    notesModal.loading = false;
    newNoteTitle = '';
    newNoteText = '';
  }
  
  function closeNotes() {
    notesModal = null;
  }
  
  async function addNote() {
    if (!notesModal || !newNoteTitle.trim() || !newNoteText.trim()) return;
    try {
      const updatedNotes = await notesApi.add(notesModal.type, notesModal.entityId, newNoteTitle, newNoteText);
      if (updatedNotes) {
        notesModal.notes = updatedNotes;
        newNoteTitle = '';
        newNoteText = '';
      } else {
        notesModal.error = 'Failed to add note.';
      }
    } catch {
      notesModal.error = 'Failed to add note.';
    }
  }
  
  async function deleteNote(noteId: string) {
    if (!notesModal) return;
    const success = await notesApi.delete(noteId);
    if (success) {
      notesModal.notes = notesModal.notes.filter(n => n._id !== noteId);
    } else {
      notesModal.error = 'Failed to delete note.';
    }
  }
  
  function startEditNote(note: any) {
    if (!notesModal) return;
    notesModal.editingNote = { ...note };
  }
  
  function stopEditNote() {
    if (!notesModal) return;
    notesModal.editingNote = null;
  }
  
  async function updateNote() {
    if (!notesModal || !notesModal.editingNote) return;
    const { _id, title, text } = notesModal.editingNote;
    const success = await notesApi.update(_id, title, text);
    if (success) {
      notesModal.notes = notesModal.notes.map(n => n._id === _id ? { ...n, title, text } : n);
      notesModal.editingNote = null;
    } else {
      notesModal.error = 'Failed to update note.';
    }
  }

  // ===== CONNECTION FUNCTIONS =====
  
  // Connect item to player, NPC, or scene
  async function connectItemTo(targetType: 'player' | 'npc' | 'scene', targetId: string, itemId?: string) {
    if (!itemId && (!connecting || connecting.type !== 'item')) return;
    const realItemId = itemId || (connecting && connecting.data && connecting.data._id);
    if (!realItemId) return;
    
    const success = await entityApi.connect('item', realItemId, targetType, targetId);
    if (success) {
      await fetchAllContent();
      stopConnect();
    } else {
      alert('Failed to connect item.');
    }
  }

  // Connect NPC to Scene (location)
  async function connectNpcToScene(npcId: string, sceneId: string) {
    const success = await entityApi.connect('npc', npcId, 'scene', sceneId);
    if (success) {
      await fetchAllContent();
      stopConnect();
    } else {
      alert('Failed to connect NPC to scene.');
    }
  }

  // Remove connections between entities
  async function handleRemoveConnection(type: string, entity: any, targetId: string) {
    const success = await entityApi.disconnect(type, entity._id, targetId);
    if (success) {
      await fetchAllContent();
    } else {
      alert('Failed to remove connection.');
    }
  }

  // Handler for removing connections from EntityCardList and sections
  function onRemoveConnection(type: string, entity: any, targetId: string) {
    handleRemoveConnection(type, entity, targetId);
  }

  // Drag-and-drop connection handler
  async function handleDragConnect(from: { type: string, entity: any }, to: { type: string, entity: any }) {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    if (from.type === 'item' && (to.type === 'player' || to.type === 'npc' || to.type === 'scene')) {
      await connectItemTo(to.type, to.entity._id, from.entity._id);
    } else if (from.type === 'npc' && to.type === 'scene') {
      await connectNpcToScene(from.entity._id, to.entity._id);
    }
    
    await fetchAllContent();
  }

  // ===== LIFECYCLE FUNCTIONS =====
  
  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    (async () => {
      if (!isAuthenticated()) {
        error = 'You must be signed in to view this game.';
        loading = false;
        return;
      }
      try {
        const res = await authenticatedFetch(`/api/games/${id}`);
        if (res.ok) {
          game = await res.json();
          await fetchAllContent();
          await fetchSessions();
        } else {
          error = 'Failed to load game.';
        }
      } catch (e) {
        error = 'Failed to load game.';
      }
      loading = false;
    })();

    // Cleanup event listener
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  });
</script>


<main class="game-layout" class:mobile={isMobile}>
  <!-- Mobile Header -->
  {#if isMobile && game}
    <header class="mobile-header">
      <div class="mobile-header-content">
        <h1>{game.name}</h1>
        <button 
          class="mobile-menu-toggle"
          on:click={() => isMobileMenuOpen = !isMobileMenuOpen}
          aria-label="Toggle menu"
        >
          <span class="hamburger-line" class:active={isMobileMenuOpen}></span>
          <span class="hamburger-line" class:active={isMobileMenuOpen}></span>
          <span class="hamburger-line" class:active={isMobileMenuOpen}></span>
        </button>
      </div>
    </header>
  {/if}

  <aside class="sidebar" class:mobile-open={isMobileMenuOpen && isMobile}>
    {#if loading}
      <p>Loading...</p>
    {:else if error}
      <p class="error">{error}</p>
    {:else if game}
      <div class="sidebar-header">
        {#if !isMobile}
          <h2>{game.name}</h2>
          <p class="sidebar-desc">{game.description}</p>
        {:else}
          <button 
            class="mobile-close-sidebar"
            on:click={() => isMobileMenuOpen = false}
            aria-label="Close menu"
          >
            ✕
          </button>
        {/if}
      </div>
      <SidebarSessions
        {sessionHistory}
        {upcomingSessions}
        selectedSessionId={selectedSession?._id}
        on:createSession={() => window.location.href = `/session/new?gameId=${id}`}
        on:selectSession={e => selectedSession = enrichSessionEntities(e.detail)}
        on:deleteSession={e => removeSession(e.detail)}
      />
      {#if selectedSession}
        <SessionDetailsBox
          session={selectedSession}
          show={showSessionDetails}
          edit={editSessionDetails}
          editData={editSessionData}
          {npcs}
          {players}
          {items}
          {scenes}
          {itemMap}
          {npcMap}
          {sceneMap}
          {playerMap}
          {startCreate}
          {startConnect}
          {startEdit}
          {openNotes}
          {deleteContent}
          onRemoveConnection={handleRemoveConnection}
          handleEntityClick={handleEntityClick}
          onEdit={() => { editSessionDetails = true; editSessionData = JSON.parse(JSON.stringify(selectedSession)); }}
          onSave={saveSessionEdit}
          onCancel={() => editSessionDetails = false}
          onToggle={() => showSessionDetails = !showSessionDetails}
          onClose={() => { selectedSession = null; }}
          on:sessionUpdated={e => selectedSession = e.detail}
        />
      {/if}



    {/if}
  </aside>
  
  <!-- Mobile Overlay -->
  {#if isMobile && isMobileMenuOpen}
    <div 
      class="mobile-overlay" 
      on:click={() => isMobileMenuOpen = false}
      role="button"
      tabindex="0"
      on:keydown={(e) => e.key === 'Escape' && (isMobileMenuOpen = false)}
    ></div>
  {/if}
  
  <section class="main-content" class:mobile-shifted={isMobileMenuOpen && isMobile}>
    {#if game}
      <nav class="tab-nav">
        <button class:active-tab={activeTab === 'scene'} on:click={() => activeTab = 'scene'}>Scenes</button>
        <button class:active-tab={activeTab === 'npc'} on:click={() => activeTab = 'npc'}>NPCs</button>
        <button class:active-tab={activeTab === 'player'} on:click={() => activeTab = 'player'}>Players</button>
        <button class:active-tab={activeTab === 'item'} on:click={() => activeTab = 'item'}>Items</button>
      </nav>

      {#if showConnectionBox}
        <div style="position:relative;">
          <button class="close-connection-box-btn" on:click={() => showConnectionBox = false} title="Close connection box">×</button>
          <ConnectionBox
            {npcs}
            {players}
            {items}
            {scenes}
            onConnect={handleDragConnect}
          />
        </div>
      {:else}
        <button class="open-connection-box-btn" on:click={() => showConnectionBox = true} title="Show connection box">Show Connection Box</button>
      {/if}

      {#if fullscreenScene}
        <SceneFullscreenView
          scene={fullscreenScene}
          npcs={npcs.filter((n: any) => n.sceneId === fullscreenScene._id)}
          items={items.filter((i: any) => i.sceneId === fullscreenScene._id)}
          players={players}
          on:close={closeFullscreenScene}
        />
      {/if}

      {#if selectedEntity}
        <div class="connection-line-view">
          <button class="close-btn" on:click={closeConnectionView}>×</button>
          <h3>Connections for {selectedEntity.entity.name} <span class="type-label">[{selectedEntity.type}]</span></h3>
          <div class="conn-section">
            {#if selectedEntity.type === 'npc'}
              <div><strong>Scene:</strong> {sceneMap[selectedEntity.entity.sceneId]?.name || selectedEntity.entity.sceneId}</div>
              <div><strong>Items:</strong>
                {#each selectedEntity.entity.itemIds as itemId}
                  <span class="chip">{itemMap[itemId]?.name || itemId}</span>
                {/each}
              </div>
            {/if}
            {#if selectedEntity.type === 'player'}
              <div><strong>Items:</strong>
                {#each selectedEntity.entity.itemIds as itemId}
                  <span class="chip">{itemMap[itemId]?.name || itemId}</span>
                {/each}
              </div>
            {/if}
            {#if selectedEntity.type === 'item'}
              <div><strong>Owner:</strong>
                {#if selectedEntity.entity.ownerPlayer}
                  Player: {playerMap[selectedEntity.entity.ownerPlayer]? playerMap[selectedEntity.entity.ownerPlayer].name : selectedEntity.entity.ownerPlayer}
                {:else if selectedEntity.entity.ownerNpc}
                  NPC: {npcMap[selectedEntity.entity.ownerNpc]?.name || selectedEntity.entity.ownerNpc}
                {:else if selectedEntity.entity.sceneId}
                  Scene: {sceneMap[selectedEntity.entity.sceneId]?.name || selectedEntity.entity.sceneId}
                {:else}
                  None
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {/if}

      {#if !selectedEntity && activeTab === 'scene'}
        <EntitySection
          entities={scenes}
          entityType="scene"
          {startCreate}
          {startConnect}
          {startEdit}
          {openNotes}
          {deleteContent}
          onRemoveConnection={handleRemoveConnection}
          {itemMap}
          {npcMap}
          {sceneMap}
          {playerMap}
          on:entityClick={e => handleEntityClick('scene', e.detail)}
        />  
      {/if}
      {#if !selectedEntity && activeTab === 'npc'}
        <EntitySection
          entities={npcs}
          entityType="npc"
          {startCreate}
          {startConnect}
          {startEdit}
          {openNotes}
          {deleteContent}
          onRemoveConnection={handleRemoveConnection}
          {itemMap}
          {npcMap}
          {sceneMap}
          {playerMap}
      
        />
      {/if}
      {#if !selectedEntity && activeTab === 'player'}
        <EntitySection
          entities={players}
          entityType="player"
          {startCreate}
          {startConnect}
          {startEdit}
          {openNotes}
          {deleteContent}
          onRemoveConnection={handleRemoveConnection}
          {itemMap}
          {npcMap}
          {sceneMap}
          {playerMap}
         
        />
      {/if}
      {#if !selectedEntity && activeTab === 'item'}
        <EntitySection
          entities={items}
          entityType="item"
          {startCreate}
          {startConnect}
          {startEdit}
          {openNotes}
          {deleteContent}
          onRemoveConnection={handleRemoveConnection}
          {itemMap}
          {npcMap}
          {sceneMap}
          {playerMap}
         
        />
      {/if}
      {#if editing}
        <div class="modal">
          <div class="modal-content">
            <h4>{editing.data._id ? 'Edit' : 'Create'} {editing.type.charAt(0).toUpperCase() + editing.type.slice(1)}</h4>
            <GameContentForm 
              type={editing.type as "scene" | "npc" | "player" | "item"} 
              gameId={id} 
              connections={{}} 
              initialData={editing.data._id ? editing.data : null}
              on:created={() => { fetchAllContent(); stopCreate(); }} 
            />
            <button on:click={stopCreate}>Cancel</button>
          </div>
        </div>
      {/if}
      {#if connecting}
        <div class="modal">
          <div class="modal-content">
            <h4>Connect {connecting.type.charAt(0).toUpperCase() + connecting.type.slice(1)}</h4>
            {#if connecting.type === 'item'}
              <div style="margin-bottom:1em">
                <div>Choose new owner for this item:</div>
                <div style="margin:0.7em 0">
                  <strong>Players:</strong>
                  {#each players as player}
                    <button style="margin:0.2em" on:click={() => connectItemTo('player', player._id)}>{player.name}</button>
                  {/each}
                </div>
                <div style="margin:0.7em 0">
                  <strong>NPCs:</strong>
                  {#each npcs as npc}
                    <button style="margin:0.2em" on:click={() => connectItemTo('npc', npc._id)}>{npc.name}</button>
                  {/each}
                </div>
              </div>
            {:else if connecting.type === 'npc'}
              <div style="margin-bottom:1em">
                <div>Choose a Scene for this NPC:</div>
                <div style="margin:0.7em 0">
                  <strong>Scenes:</strong>
                  {#each scenes as scene}
                    <button style="margin:0.2em" on:click={() => connecting && connectNpcToScene(connecting.data._id, scene._id)}>{scene.name}</button>
                  {/each}
                </div>
              </div>
            {:else if connecting.type === 'scene'}
              <div style="margin-bottom:1em">
                <div>Add NPCs to this Scene:</div>
                <div style="margin:0.7em 0">
                  <strong>NPCs:</strong>
                  {#each npcs as npc}
                    <button style="margin:0.2em" on:click={() => connecting && connectNpcToScene(npc._id, connecting.data._id)}>{npc.name}</button>
                  {/each}
                </div>
              </div>
            {:else}
              <em>Connection UI coming soon...</em>
            {/if}

            <button on:click={stopConnect}>Close</button>
          </div>
        </div>
      {/if}


      {#if notesModal}
        <div class="modal">
          <div class="modal-content notes-modal">
            <h4>Notes</h4>
            {#if notesModal.loading}
              <p>Loading...</p>
            {:else}
              <div class="notes-list">
                {#each notesModal.notes as note}
                  <div class="note-card">
                    {#if notesModal.editingNote && notesModal.editingNote._id === note._id}
                      <input type="text" bind:value={notesModal.editingNote.title} placeholder="Title" />
                      <textarea rows="2" bind:value={notesModal.editingNote.text} placeholder="Note text"></textarea>
                      <button on:click={updateNote}>Save</button>
                      <button on:click={stopEditNote}>Cancel</button>
                    {:else}
                      <div class="note-title">{note.title}</div>
                      <div class="note-text">{note.text}</div>
                      <div class="note-actions">
                        <button on:click={() => startEditNote(note)}>Edit</button>
                        <button on:click={() => deleteNote(note._id)}>Delete</button>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
              <div class="add-note-form">
                <input type="text" bind:value={newNoteTitle} placeholder="Title" />
                <textarea rows="2" bind:value={newNoteText} placeholder="Note text"></textarea>
                <button on:click={addNote}>Add Note</button>
              </div>
              {#if notesModal.error}
                <div class="error">{notesModal.error}</div>
              {/if}
            {/if}
            <button style="margin-top:1em" on:click={closeNotes}>Close</button>
          </div>
        </div>
      {/if}
    {/if}

  </section>
</main>


<style>
.game-layout {
  display: flex;
  flex-direction: row;
  gap: 2.5em;
  align-items: flex-start;
  max-width: 1200px;
  margin: 2rem auto;
  background-color: var(--color-bg-secondary);
  border-radius: 1.2em;
  box-shadow: 0 2px 12px rgba(0,0,0,0.10);
}
.sidebar {
  flex: 1 1 320px;
  min-width: 260px;
  max-width: 350px;
  background: var(--color-bg-main);
  border-radius: 1.2em 0 0 1.2em;
  box-shadow: 0 1px 8px rgba(0,0,0,0.10);
  padding: 2em 1.2em 1.2em 1.2em;
  display: flex;
  flex-direction: column;
  gap: 2em;
}
.sidebar-header {
  margin-bottom: 1.5em;
}
.sidebar-header h2 {
  font-size: 1.5em;
  color: var(--color-text-accent);
  margin-bottom: 0.3em;
}
.sidebar-desc {
  color: var(--color-text-secondary);
  font-size: 1.05em;
  margin-bottom: 1em;
}

.main-content {
  flex: 2 1 0%;
  min-width: 0;
  padding: 2em 1.5em 2em 0;
}
.tab-nav {
  display: flex;
  gap: 1.2em;
  margin-bottom: 2em;
  justify-content: flex-start;
  background: var(--color-bg-main);
  border-radius: 8px;
  padding: 0.7em 0.5em;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
}
.tab-nav button {
  background: none;
  color: var(--color-text-main);
  border: none;
  font-size: 1.08em;
  padding: 0.3em 1.2em;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}
.tab-nav button.active-tab,
.tab-nav button:hover {
  background: var(--color-bg-button);
  color: var(--color-text-main);
}
.modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--color-bg-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}
.modal-content {
  background: var(--color-bg-secondary);
  border-radius: 10px;
  padding: 2em 2.5em 1.5em 2.5em;
  min-width: 320px;
  max-width: 95vw;
  box-shadow: 0 2px 16px rgba(0,0,0,0.25);
  color: var(--color-text-main);
  text-align: center;
}
.error {
  color: var(--color-text-warning);
  text-align: center;
}
.notes-modal {
  min-width: 350px;
  max-width: 600px;
  z-index: 3000;
}
.notes-list {
  margin-bottom: 1.2em;
  
}
.note-card {
  background: var(--color-bg-main);
  border-radius: 6px;
  padding: 0.7em 1em 0.5em 1em;
  margin-bottom: 0.7em;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.note-title {
  font-weight: bold;
  font-size: 1.05em;
  margin-bottom: 0.2em;
}
.note-text {
  color: var(--color-text-secondary);
  font-size: 0.98em;
  margin-bottom: 0.3em;
}
.note-actions {
  display: flex;
  gap: 0.5em;
}
.add-note-form {
  display: flex;
  flex-direction: column;
  gap: 0.4em;
  margin-top: 1em;
}
.add-note-form input, .add-note-form textarea {
  background: var(--color-bg-secondary);
  color: var(--color-text-main);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.4em;
}
.add-note-form button {
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 4px;
  padding: 0.4em 1em;
  cursor: pointer;
  font-size: 1em;
  margin-top: 0.2em;
}
.add-note-form button:hover {
  background: var(--color-bg-button-hover);
}
:global(.game-section h3){
  color: var(--color-text-accent);
  margin-bottom: 0.8em;
}


.connection-line-view {
  position: fixed;
  top: 2em;
  right: 2em;
  background: var(--color-bg-main);
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.18);
  padding: 2em 2.5em 1.5em 2.5em;
  min-width: 340px;
  max-width: 420px;
  z-index: 1200;
  color: var(--color-text-main);
}
.connection-line-view h3 {
  color: var(--color-text-accent);
  margin-bottom: 1em;
}
.connection-line-view .type-label {
  font-size: 0.9em;
  color: var(--color-text-secondary);
  margin-left: 0.5em;
}
.connection-line-view .conn-section {
  display: flex;
  flex-direction: column;
  gap: 1em;
}
.connection-line-view .chip {
  background: var(--color-bg-button);
  color: var(--color-text-accent);
  border-radius: 12px;
  padding: 0.15em 0.7em;
  font-size: 0.92em;
  display: inline-block;
  margin-right: 0.2em;
}
.connection-line-view .close-btn {
  position: absolute;
  top: 0.7em;
  right: 1em;
  background: none;
  border: none;
  color: var(--color-text-accent);
  font-size: 1.5em;
  cursor: pointer;
}

.close-connection-box-btn {
  position: absolute;
  top: 0.5em;
  right: 0.5em;
  background: none;
  border: none;
  color: var(--color-text-accent);
  font-size: 1.5em;
  cursor: pointer;
  z-index: 10;
}
.open-connection-box-btn {
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 6px;
  padding: 0.5em 1.2em;
  font-size: 1em;
  margin-bottom: 1em;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

/* ===== MOBILE RESPONSIVE STYLES ===== */

/* Mobile Layout */
@media (max-width: 768px) {
  .game-layout.mobile {
    flex-direction: column;
    margin: 0;
    border-radius: 0;
    min-height: 100vh;
    height: 100vh;
    gap: 0;
    max-width: none;
    background: var(--color-bg-secondary);
    overflow: hidden;
  }

  /* Mobile Header */
  .mobile-header {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: var(--color-bg-main);
    border-bottom: 1px solid var(--color-border);
    padding: 1rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .mobile-header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 100%;
  }

  .mobile-header h1 {
    font-size: 1.2rem;
    margin: 0;
    color: var(--color-text-accent);
    font-weight: 600;
  }

  /* Mobile Menu Toggle */
  .mobile-menu-toggle {
    background: none;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 3px;
    width: 24px;
    height: 24px;
    position: relative;
  }

  .hamburger-line {
    width: 20px;
    height: 2px;
    background: var(--color-text-accent);
    transition: all 0.3s ease;
    border-radius: 1px;
  }

  .hamburger-line.active:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
  }

  .hamburger-line.active:nth-child(2) {
    opacity: 0;
  }

  .hamburger-line.active:nth-child(3) {
    transform: rotate(-45deg) translate(7px, -6px);
  }

  /* Mobile Sidebar */
  .sidebar {
    position: fixed;
    top: 0;
    left: -100%;
    width: 80vw;
    max-width: 300px;
    height: 100vh;
    z-index: 1500;
    transition: left 0.3s ease;
    border-radius: 0;
    overflow-y: auto;
  }

  .sidebar.mobile-open {
    left: 0;
  }

  .mobile-close-sidebar {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    color: var(--color-text-accent);
    font-size: 1.5rem;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Mobile Overlay */
  .mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.6);
    z-index: 1400;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }

  /* Mobile Main Content */
  .main-content {
    flex: 1;
    padding: 1rem;
    min-width: 100%;
    width: 100%;
    position: relative;
    z-index: 1;
    overflow-x: hidden; /* Prevent horizontal overflow */
  }

  .main-content.mobile-shifted {
    /* Overlay handles interaction blocking instead of transform */
    position: relative;
  }

  /* Mobile Tab Navigation */
  .tab-nav {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem;
    margin-bottom: 1rem;
    background: var(--color-bg-main);
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }

  .tab-nav button {
    flex: 1;
    min-width: calc(50% - 0.25rem);
    padding: 0.75rem 0.5rem;
    font-size: 0.85rem;
    min-height: 44px; /* Ensure touch-friendly minimum size */
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Mobile Connection Box */
  .close-connection-box-btn,
  .open-connection-box-btn {
    font-size: 1rem;
    padding: 0.5rem 0.75rem;
  }

  /* Hide connection box on mobile by default - too complex for small screens */
  .main-content > div[style*="position:relative"] {
    display: none;
  }

  .open-connection-box-btn {
    display: none; /* Hide the show button too on mobile */
  }

  /* Mobile Modal Adjustments */
  .modal-content {
    margin: 1rem;
    padding: 1.5rem;
    max-width: calc(100vw - 2rem);
    min-width: auto;
  }

  /* Mobile Connection Line View */
  .connection-line-view {
    position: fixed;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    bottom: 1rem;
    max-width: none;
    min-width: auto;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
    padding: 1rem 1.25rem;
  }

  .connection-line-view h3 {
    font-size: 1rem;
    margin-bottom: 0.75rem;
    line-height: 1.3;
  }

  .connection-line-view .type-label {
    display: block;
    font-size: 0.8rem;
    margin-left: 0;
    margin-top: 0.25rem;
  }

  .connection-line-view .conn-section {
    gap: 0.75rem;
  }

  .connection-line-view .conn-section > div {
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .connection-line-view .chip {
    font-size: 0.8rem;
    padding: 0.1rem 0.5rem;
    margin-right: 0.3rem;
    margin-bottom: 0.25rem;
    display: inline-block;
  }

  /* Hide desktop-only elements on mobile */
  .sidebar-header h2,
  .sidebar-desc {
    display: none;
  }

  /* Ensure all content respects mobile boundaries */
  * {
    box-sizing: border-box;
  }

  /* Mobile-specific content overflow fixes */
  .main-content * {
    max-width: 100%;
    overflow-wrap: break-word;
  }

  /* Entity sections and cards mobile fixes */
  :global(.game-section) {
    padding: 0.75rem 0;
  }

  :global(.entity-card) {
    margin: 0.5rem 0;
    padding: 0.75rem;
    font-size: 0.9rem;
  }

  /* Connection box specific mobile handling */
  :global(.connection-box) {
    display: none !important; /* Force hide on mobile - too complex */
  }

  /* Make sure modals work well on mobile */
  .modal {
    padding: 0.5rem;
  }

  .modal-content {
    width: calc(100vw - 1rem);
    max-width: calc(100vw - 1rem);
    margin: 0.5rem;
    padding: 1rem;
    max-height: calc(100vh - 1rem);
    overflow-y: auto;
  }

  .notes-modal {
    min-width: auto;
  }
}

/* Tablet Adjustments */
@media (max-width: 1024px) and (min-width: 769px) {
  .game-layout {
    margin: 1rem;
    gap: 1.5rem;
  }

  .sidebar {
    min-width: 240px;
    max-width: 280px;
    padding: 1.5rem 1rem;
  }

  .main-content {
    padding: 1.5rem 1rem 1.5rem 0;
  }

  .tab-nav {
    gap: 0.8rem;
    padding: 0.5rem;
  }

  .tab-nav button {
    padding: 0.4rem 1rem;
    font-size: 1rem;
  }
}

/* Small Mobile Devices */
@media (max-width: 480px) {
  .mobile-header {
    padding: 0.75rem;
  }

  .mobile-header h1 {
    font-size: 1.1rem;
  }

  .sidebar {
    width: 90vw;
  }

  .main-content {
    padding: 0.75rem;
  }

  .tab-nav {
    padding: 0.25rem;
  }

  .tab-nav button {
    font-size: 0.85rem;
    padding: 0.4rem 0.5rem;
  }

  .modal-content {
    margin: 0.5rem;
    padding: 1rem;
  }
}
  

</style>
