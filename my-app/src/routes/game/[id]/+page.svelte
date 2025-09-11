<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import GameContentForm from '$lib/GameContentForm.svelte';
  import SidebarSessions from '$lib/SidebarSessions.svelte';
  import SessionForm from '$lib/SessionForm.svelte';
  import SessionDetailsBox from './SessionDetailsBox.svelte';
  import EntityCardList from '$lib/EntityCardList.svelte';
  import SessionList from './SessionList.svelte';
  import NpcSection from './NpcSection.svelte';
  import PlayerSection from './PlayerSection.svelte';
  import ItemSection from './ItemSection.svelte';
  import SceneSection from './SceneSection.svelte';
  let game: any = null;
  let loading = true;
  let error = '';
  let id = '';
  let npcs: any = [];
  let players: any = [];
  let items: any = [];
  let scenes: any = [];
  let activeTab: 'scene' | 'npc' | 'player' | 'item' | 'settings' | '' = '';
  let editing: { type: string, data: any } | null = null;
  let connecting: { type: string, data: any } | null = null;
  let notesModal: { type: string, entityId: string, notes: any[], loading: boolean, error: string, editingNote: any|null } | null = null;
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

  function startEdit(type: string, data: any) {
    editing = { type, data };
  }
  function stopEdit() {
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
        on:selectSession={e => selectedSession = e.detail}
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
      {#if activeTab === 'scene'}
        <SceneSection
          {scenes}
          {startEdit}
          {startConnect}
          {openNotes}
          {deleteContent}
        />
      {/if}
      {#if activeTab === 'npc'}
        <NpcSection
          {npcs}
          {startEdit}
          {startConnect}
          {openNotes}
          {deleteContent}
        />
      {/if}
      {#if activeTab === 'player'}
        <PlayerSection
          {players}
          {startEdit}
          {startConnect}
          {openNotes}
          {deleteContent}
        />
      {/if}
      {#if activeTab === 'item'}
        <ItemSection
          {items}
          {startEdit}
          {startConnect}
          {openNotes}
          {deleteContent}
        />
      {/if}
      {#if editing}
        <div class="modal">
          <div class="modal-content">
            <h4>Edit {editing.type.charAt(0).toUpperCase() + editing.type.slice(1)}</h4>
            <GameContentForm type={editing.type as "scene" | "npc" | "player" | "item"} gameId={id} connections={{}} on:created={() => { fetchAllContent(); stopEdit(); }} />
            <button on:click={stopEdit}>Cancel</button>
          </div>
        </div>
      {/if}
      {#if connecting}
        <div class="modal">
          <div class="modal-content">
            <h4>Connect {connecting.type.charAt(0).toUpperCase() + connecting.type.slice(1)}</h4>
            <em>Connection UI coming soon...</em>
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




.session-details-box-large.session-details-bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 48vh;
  z-index: 1200;
  background: var(--color-bg-secondary);
  color: var(--color-text-main);
  border-radius: 18px 18px 0 0;
  margin: 0 auto;
  padding: 2.2em 2.5em 2em 2.5em;
  box-shadow: 0 -2px 18px rgba(0,0,0,0.18);
  font-size: 1.18em;
  min-width: 320px;
  max-width: 900px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
.session-details-content-boxes {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2em;
  margin-top: 1.2em;
}
.session-info-box {
  background: var(--color-bg-main);
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.10);
  padding: 1em 1.2em 0.7em 1.2em;
  min-width: 180px;
  flex: 1 1 220px;
  margin-bottom: 0.5em;
  font-size: 1.08em;
  display: flex;
  flex-direction: column;
}
.session-info-label {
  color: var(--color-text-accent);
  font-weight: 600;
  margin-bottom: 0.2em;
  display: block;
}
.session-details-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.2em;
}
.session-details-header h3 {
  color: var(--color-text-accent);
  font-size: 1.35em;
  margin: 0;
}
.session-details-actions button {
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 6px;
  padding: 0.5em 1.2em;
  font-size: 1em;
  margin-left: 0.7em;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.15s;
}
.session-details-actions button:hover {
  background: var(--color-bg-button-hover);
}

.session-details-form label {
  display: block;
  margin-bottom: 1em;
  font-weight: 500;
  color: var(--color-text-accent);
}
.session-details-form input,
.session-details-form textarea {
  width: 100%;
  margin-top: 0.3em;
  background: var(--color-bg-main);
  color: var(--color-text-main);
  border: 1px solid var(--color-border);
  border-radius: 0.3rem;
  padding: 0.7rem;
  font-size: 1.08em;
}
</style>


