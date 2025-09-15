<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import GameContentForm from '$lib/GameContentForm.svelte';
  import SidebarSessions from '$lib/SidebarSessions.svelte';
  import SessionForm from '$lib/SessionForm.svelte';
  import SessionDetailsBox from './SessionDetailsBox.svelte';
  import EntityCardList from '$lib/EntityCardList.svelte';
  async function handleRemoveConnection(type: string, entity: any, targetId: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    let fromId = entity._id;
    let toId = targetId;
    const res = await fetch('/api/game-content/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ type, fromId, toId })
    });
    if (res.ok) {
      await fetchAllContent();
    } else {
      alert('Failed to remove connection.');
    }
  }
  import SessionList from './SessionList.svelte';
  import NpcSection from './NpcSection.svelte';
  import PlayerSection from './PlayerSection.svelte';
  import ItemSection from './ItemSection.svelte';
  import SceneSection from './SceneSection.svelte';
  import SceneFullscreenView from '$lib/SceneFullscreenView.svelte';
  import ConnectionBox from '$lib/ConnectionBox.svelte';

  // State for showing/hiding the ConnectionBox
  let showConnectionBox = true;
  // Drag-and-drop connection handler
  async function handleDragConnect(from: { type: string, entity: any }, to: { type: string, entity: any }) {
    // Example: item dropped on player, npc, or scene
    const token = localStorage.getItem('token');
    if (!token) return;
    if (from.type === 'item' && (to.type === 'player' || to.type === 'npc' || to.type === 'scene')) {
      await connectItemTo(to.type, to.entity._id, from.entity._id);
    } else if (from.type === 'npc' && to.type === 'scene') {
      await connectNpcToScene(from.entity._id, to.entity._id);
    }
    // Add more connection logic as needed
    await fetchAllContent();
  }
  let game: any = null;
  let loading = true;
  let error = '';
  let id = '';
  let npcs: any = [];
  let players: any = [];
  let items: any = [];
  let scenes: any = [];

  // Lookup maps for entity enrichment
  let npcMap: { [key: string]: any } = {};
  let sceneMap: { [key: string]: any } = {};
  let playerMap: { [key: string]: any } = {};
  let itemMap: { [key: string]: any } = {};
  let activeTab: 'scene' | 'npc' | 'player' | 'item' | 'settings' | '' = '';
  let editing: { type: string, data: any } | null = null;
  let connecting: { type: string, data: any } | null = null;
  let notesModal: { type: string, entityId: string, notes: any[], loading: boolean, error: string, editingNote: any|null } | null = null;

  // For full connection line view
  let selectedEntity: { type: string, entity: any } | null = null;
  let fullscreenScene: any = null;

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
  let newNoteTitle = '';
  let newNoteText = '';
  let sessions: any[] = [];

  let selectedSession: any = null;
let showSessionDetails = true;
let editSessionDetails = false;
let editSessionData: any = {};
  let sessionLoading = false;
  let sessionError = '';

  // Add these two lines to fix the error
  let sessionModalOpen = false;
  let sessionModalSession: any = null;

  // Add saveSessionEdit function to fix the error
  function saveSessionEdit() {
    // Example: Save the edited session details
    if (!selectedSession || !editSessionDetails) return;
    // Here you would typically send the updated data to your API
    // For now, just update the selectedSession and exit edit mode
    selectedSession = { ...selectedSession, ...editSessionData };
    editSessionDetails = false;
  }

  // Remove session handler
  async function removeSession(sessionId: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!confirm('Are you sure you want to remove this session?')) return;
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      sessions = sessions.filter(s => s._id !== sessionId);
    } else {
      alert('Failed to remove session.');
    }
  }

  $: sessionHistory = sessions.filter(s => s.isEnded);
  $: upcomingSessions = sessions.filter(s => !s.isEnded);
  async function fetchSessions() {
    const token = localStorage.getItem('token');
    if (!token) return;
    sessionLoading = true;
    try {
      const res = await fetch(`/api/sessions?gameId=${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        sessions = await res.json();
      } else {
        sessionError = 'Failed to load sessions.';
      }
    } catch {
      sessionError = 'Failed to load sessions.';
    }
    sessionLoading = false;
  }

  $: id = $page.params.id ?? '';

  async function fetchAllContent() {
    const token = localStorage.getItem('token');
    if (!token) return;
    // Fetch all content for this game
    const [npcRes, playerRes, itemRes, sceneRes] = await Promise.all([
      fetch(`/api/game-content?npc=1&gameId=${id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`/api/game-content?player=1&gameId=${id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`/api/game-content?item=1&gameId=${id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`/api/game-content?scene=1&gameId=${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    npcs = npcRes.ok ? await npcRes.json() : [];
    players = playerRes.ok ? await playerRes.json() : [];
    items = itemRes.ok ? await itemRes.json() : [];
    scenes = sceneRes.ok ? await sceneRes.json() : [];
    buildEntityMaps();
  }

  function buildEntityMaps() {
    npcMap = Object.fromEntries(npcs.map((n: any) => [n._id, n]));
    sceneMap = Object.fromEntries(scenes.map((s: any) => [s._id, s]));
    playerMap = Object.fromEntries(players.map((p: any) => [p._id, p]));
    itemMap = Object.fromEntries(items.map((i: any) => [i._id, i]));
  }

  function enrichSessionEntities(session: any) {
    return {
      ...session,
      npcs: (session.npcs || session.connections?.npcs || []).map((id: any) => typeof id === 'object' ? id : npcMap[id] || { _id: id }),
      scenes: (session.scenes || session.connections?.scenes || []).map((id: any) => typeof id === 'object' ? id : sceneMap[id] || { _id: id }),
      players: (session.players || session.connections?.players || []).map((id: any) => typeof id === 'object' ? id : playerMap[id] || { _id: id }),
      items: (session.items || session.connections?.items || []).map((id: any) => typeof id === 'object' ? id : itemMap[id] || { _id: id }),
    };
  }

  onMount(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      error = 'You must be signed in to view this game.';
      loading = false;
      return;
    }
    try {
      const res = await fetch(`/api/games/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
  });
function openSessionModal(session = null) {
  sessionModalSession = session;
  sessionModalOpen = true;
}
function closeSessionModal() {
  sessionModalOpen = false;
  sessionModalSession = null;
}
function onSessionSaved() {
  closeSessionModal();
  fetchSessions();
}


  async function deleteContent(type: string, id: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!confirm('Are you sure you want to delete this?')) return;
    await fetch(`/api/game-content?type=${type}&id=${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    await fetchAllContent();
  }

  function startCreate(type: string, data: any) {
    editing = { type, data };
  }
  function stopCreate() {
    editing = null;
  }
  function startConnect(type: string, data: any) {
    connecting = { type, data };
  }
  function stopConnect() {
    connecting = null;
  }

  async function openNotes(type: string, entityId: string) {
    notesModal = { type, entityId, notes: [], loading: true, error: '', editingNote: null };
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/game-content/notes?type=${type}&entityId=${entityId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        notesModal.notes = await res.json();
      } else {
        notesModal.error = 'Failed to load notes.';
      }
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
    const token = localStorage.getItem('token');
    const body = { type: notesModal.type, entityId: notesModal.entityId, title: newNoteTitle, text: newNoteText };
    const res = await fetch('/api/game-content/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      notesModal.notes = await res.json();
      newNoteTitle = '';
      newNoteText = '';
    } else {
      notesModal.error = 'Failed to add note.';
    }
  }
  async function deleteNote(noteId: string) {
    if (!notesModal) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/game-content/notes?noteId=${noteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
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
    const token = localStorage.getItem('token');
    const { _id, title, text } = notesModal.editingNote;
    const res = await fetch('/api/game-content/notes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ noteId: _id, title, text })
    });
    if (res.ok) {
      notesModal.notes = notesModal.notes.map(n => n._id === _id ? { ...n, title, text } : n);
      notesModal.editingNote = null;
    } else {
      notesModal.error = 'Failed to update note.';
    }
  }

  async function connectItemTo(targetType: 'player' | 'npc' | 'scene', targetId: string, itemId?: string) {
    // If called from drag-and-drop, itemId is provided directly; if from modal, use connecting.data._id
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!itemId && (!connecting || connecting.type !== 'item')) return;
    const realItemId = itemId || (connecting && connecting.data && connecting.data._id);
    if (!realItemId) return;
    let url = '/api/game-content/connect';
    let body = {
      itemId: realItemId,
      targetType,
      targetId
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      await fetchAllContent();
      stopConnect();
    } else {
      alert('Failed to connect item.');
    }
  }

    // Connect NPC to Scene (location)
  async function connectNpcToScene(npcId: string, sceneId: string) {
    const token = localStorage.getItem('token');
    if (!token) return;
    const url = '/api/game-content/connect';
    const body = { npcId, sceneId };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      await fetchAllContent();
      stopConnect();
    } else {
      alert('Failed to connect NPC to scene.');
    }
  }

  // Handler for removing connections from EntityCardList and sections
  function onRemoveConnection(type: string, entity: any, targetId: string) {
    handleRemoveConnection(type, entity, targetId);
  }
</script>


<main class="game-layout">
  <aside class="sidebar">
    {#if loading}
      <p>Loading...</p>
    {:else if error}
      <p class="error">{error}</p>
    {:else if game}
      <div class="sidebar-header">
        <h2>{game.name}</h2>
        <p class="sidebar-desc">{game.description}</p>
      </div>
      <SidebarSessions
        {sessionHistory}
        {upcomingSessions}
        selectedSessionId={selectedSession?._id}
        on:createSession={() => window.location.href = `/session/new?gameId=${id}`}
        on:selectSession={e => selectedSession = enrichSessionEntities(e.detail)}
      />
      {#if selectedSession}
        <SessionDetailsBox
          session={selectedSession}
          show={showSessionDetails}
          edit={editSessionDetails}
          editData={editSessionData}
          onEdit={() => { editSessionDetails = true; editSessionData = JSON.parse(JSON.stringify(selectedSession)); }}
          onSave={saveSessionEdit}
          onCancel={() => editSessionDetails = false}
          onToggle={() => showSessionDetails = !showSessionDetails}
          onClose={() => { selectedSession = null; }}
        />
      {/if}



    {/if}
  </aside>
  <section class="main-content">
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
        <SceneSection
          {scenes}
          {startCreate}
          {startConnect}
          {openNotes}
          {deleteContent}
          onRemoveConnection={handleRemoveConnection}
          itemMap={itemMap}
          npcMap={npcMap}
          sceneMap={sceneMap}
          on:entityClick={e => handleEntityClick('scene', e.detail)}
        />
      {/if}
      {#if !selectedEntity && activeTab === 'npc'}
        <NpcSection
          {npcs}
          {startCreate}
          {startConnect}
          {openNotes}
          {deleteContent}
          onRemoveConnection={handleRemoveConnection}
          itemMap={itemMap}
          npcMap={npcMap}
          sceneMap={sceneMap}
          on:entityClick={e => handleEntityClick('npc', e.detail)}
        />
      {/if}
      {#if !selectedEntity && activeTab === 'player'}
        <PlayerSection
          {players}
          {startCreate}
          {startConnect}
          {openNotes}
          {deleteContent}
          onRemoveConnection={handleRemoveConnection}
          itemMap={itemMap}
          npcMap={npcMap}
          sceneMap={sceneMap}
          on:entityClick={e => handleEntityClick('player', e.detail)}
        />
      {/if}
      {#if !selectedEntity && activeTab === 'item'}
        <ItemSection
          {items}
          {startCreate}
          {startConnect}
          {openNotes}
          {deleteContent}
          onRemoveConnection={handleRemoveConnection}
          itemMap={itemMap}
          npcMap={npcMap}
          sceneMap={sceneMap}
          on:entityClick={e => handleEntityClick('item', e.detail)}
        />
      {/if}
      {#if editing}
        <div class="modal">
          <div class="modal-content">
            <h4>Edit {editing.type.charAt(0).toUpperCase() + editing.type.slice(1)}</h4>
            <GameContentForm type={editing.type as "scene" | "npc" | "player" | "item"} gameId={id} connections={{}} on:created={() => { fetchAllContent(); stopCreate(); }} />
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
  z-index: 1000;
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
  

</style>
