<script lang="ts">
  export let session: any;
  export let show: boolean = true;
  export let edit: boolean = false;
  export let editData: any = {};
  export let onEdit: () => void;
  export let onSave: () => void;
  export let onCancel: () => void;
  export let onToggle: () => void;
  export let onClose: () => void;

  let activeTab: 'overview' | 'entities' | 'notes' | 'advanced' = 'overview';

  import { goto } from '$app/navigation';

  let noteInput = '';
  let loading = false;
  let errorMsg = '';
  let showAddNote = false;

  async function markEnded() {
    loading = true;
    errorMsg = '';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/sessions/${session._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isEnded: true })
      });
      if (!res.ok) throw new Error(await res.text());
      session.isEnded = true;
    } catch (e) {
      errorMsg = (e instanceof Error ? e.message : 'Failed to mark ended.');
    }
    loading = false;
  }

  async function addNote() {
    if (!noteInput.trim()) return;
    loading = true;
    errorMsg = '';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/sessions/${session._id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ note: noteInput })
      });
      if (!res.ok) throw new Error(await res.text());
      // Optionally reload session or append noteInput to session.notes.custom
      noteInput = '';
    } catch (e) {
      errorMsg = (e instanceof Error ? e.message : 'Failed to add note.');
    }
    loading = false;
  }

  async function deleteSession() {
    if (!confirm('Are you sure you want to delete this session?')) return;
    loading = true;
    errorMsg = '';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/sessions/${session._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      goto(`/game/${session.gameId}`);
    } catch (e) {
      errorMsg = (e instanceof Error ? e.message : 'Failed to delete session.');
    }
    loading = false;
  }
</script>



{#if session}
  <div class="session-details-box-large session-details-bottom">
    <button class="close-btn" on:click={onClose} title="Close">×</button>
    <div class="session-details-header">
      <h3>{edit ? 'Edit Session' : `${session.title} ${session.isEnded ? '(Ended)' : ''}`}</h3>
      <div class="session-details-actions">
      
        <button on:click={onEdit}>Edit</button>
        <button on:click={markEnded} disabled={loading || session.isEnded}>Mark Ended</button>
        <button on:click={() => showAddNote = !showAddNote}>Add Note</button>
        <button on:click={deleteSession} disabled={loading}>Delete</button>
      </div>
      {#if errorMsg}
        <div class="error-msg">{errorMsg}</div>
      {/if}
      {#if showAddNote}
        <div class="add-note-box">
          <input type="text" bind:value={noteInput} placeholder="Add a note..." />
          <button on:click={addNote} disabled={loading || !noteInput.trim()}>Save Note</button>
          <button on:click={() => showAddNote = false}>Cancel</button>
        </div>
      {/if}
    </div>
    <nav class="session-tabs">
      <button class:active-tab={activeTab === 'overview'} on:click={() => activeTab = 'overview'}>Overview</button>
      <button class:active-tab={activeTab === 'entities'} on:click={() => activeTab = 'entities'}>Entities</button>
      <button class:active-tab={activeTab === 'notes'} on:click={() => activeTab = 'notes'}>Notes</button>
      <button class:active-tab={activeTab === 'advanced'} on:click={() => activeTab = 'advanced'}>Advanced</button>
    </nav>

      {#if activeTab === 'overview'}
        <div class="overview-grid">

          <div class="summary-box">
            <div class="summary-label">Summary</div>
            <div class="summary-content">{session.notes?.summary || 'No summary.'}</div>
            <div class="plotdev-box">
              <div class="plotdev-label">Plot Developments: </div>
              <div class="plotdev-content">{session.notes?.plotDevelopments || 'N/A'}</div>
            </div>
          </div>

        </div>
        <div class="overview-row">
          <div class="overview-item"><span class="item-label">XP:</span> {session.notes?.xp || 0}</div>
          <div class="overview-item"><span class="item-label">Ended:</span> {session.isEnded ? 'Yes' : 'No'}</div>
          <div class="overview-item"><span class="item-label">Date:</span> {session.date ? new Date(session.date).toLocaleDateString() : 'N/A'}</div>
        </div>
      {:else if activeTab === 'entities'}
        <div class="entities-fields">
          <div class="entity-group"><span class="entity-label">NPCs:</span>
            <div class="entity-chips">
              {#each session.npcs || session.connections?.npcs || [] as npc}
                <span class="entity-chip npc">{npc.name || npc._id || npc}
                  {#if npc.status} <span class="entity-status">({npc.status})</span>{/if}
                </span>
              {/each}
            </div>
          </div>
          <div class="entity-group"><span class="entity-label">Scenes:</span>
            <div class="entity-chips">
              {#each session.scenes || session.connections?.scenes || [] as scene}
                <span class="entity-chip scene">{scene.name || scene._id || scene}
                  {#if scene.status} <span class="entity-status">({scene.status})</span>{/if}
                </span>
              {/each}
            </div>
          </div>
          <div class="entity-group"><span class="entity-label">Players:</span>
            <div class="entity-chips">
              {#each session.players || session.connections?.players || [] as player}
                <span class="entity-chip player">{player.name || player._id || player}
                  {#if player.status} <span class="entity-status">({player.status})</span>{/if}
                </span>
              {/each}
            </div>
          </div>
          <div class="entity-group"><span class="entity-label">Items:</span>
            <div class="entity-chips">
              {#each session.items || session.connections?.items || [] as item}
                <span class="entity-chip item">{item.name || item._id || item}
                  {#if item.status} <span class="entity-status">({item.status})</span>{/if}
                </span>
              {/each}
            </div>
          </div>

        </div>
      {:else if activeTab === 'notes'}
        <div class="notes-fields">
          <div class="info-label">Session Notes</div>
          <div class="info-value">
            {#if Array.isArray(session.notes?.custom)}
              {#each session.notes.custom as note, i}
                <div class="note-item">{note}</div>
              {/each}
            {:else}
              {session.notes?.custom || 'No extra notes.'}
            {/if}
          </div>
        </div>
      {:else if activeTab === 'advanced'}
        <div class="advanced-fields">
          <div class="info-label">Quests</div>
          <div class="info-value">{session.notes?.quests || '-'}</div>
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
          <div class="info-label">Downtime</div>
          <div class="info-value">{session.notes?.downtime || '-'}</div>
          <div class="info-label">Next Session Plans</div>
          <div class="info-value">{session.notes?.nextPlans || '-'}</div>
        </div>
      {/if}
    {#if errorMsg}
      <div class="error-message">{errorMsg}</div>
    {/if}
  </div>
{/if}
<style>
/* Only one <style> block allowed in Svelte. Add all styles here. */
.session-details-box-large.session-details-bottom {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 2000;
  background: var(--color-bg-secondary);
  color: var(--color-text-main);
  border-radius: 0;
  margin: 0;
  padding: 2.2em 2.5em 2em 2.5em;
  box-shadow: 0 0 32px 8px rgba(0,0,0,0.18);
  font-size: 1.18em;
  min-width: 0;
  max-width: 100vw;
  min-height: 100vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  transition: box-shadow 0.2s;
}
.close-btn {
  position: absolute;
  top: 0.2em;
  right: 0.2em;
  background: none;
  border: none;
  font-size: 2em;
  color: var(--color-text-secondary);
  cursor: pointer;
  z-index: 10;
}
.session-details-header {
  display: absolute;
  right: 0;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.2em;
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
.session-tabs {
  display: flex;
  gap: 1.2em;
  margin-bottom: 1.2em;
}
.session-tabs button {
  background: none;
  color: var(--color-text-main);
  border: none;
  font-size: 1.08em;
  padding: 0.3em 1.2em;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}
.session-tabs button.active-tab,
.session-tabs button:hover {
  background: var(--color-bg-button);
  color: var(--color-text-main);
}
.entity-group {
  margin-bottom: 1em;
}
.entity-label {
  font-weight: 600;
  color: var(--color-text-accent);
  margin-bottom: 0.2em;
  display: block;
}
.entity-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5em;
}
.entity-chip {
  display: inline-block;
  padding: 0.3em 0.9em;
  border-radius: 1em;
  background: var(--color-bg-button-hover);
  color: var(--color-text-main);
  font-size: 0.98em;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0,0,0,0.07);
}
.entity-chip.npc { background: #e3f2fd; color: #1976d2; }
.entity-chip.scene { background: #f3e5f5; color: #7b1fa2; }
.entity-chip.player { background: #e8f5e9; color: #388e3c; }
.entity-chip.item { background: #fffde7; color: #fbc02d; }
.error-message {
  color: red;
  font-weight: bold;
  margin-top: 1em;
}
.add-note-box {
  display: flex;
  gap: 0.5em;
  margin-top: 0.5em;
}
.add-note-box input {
  flex: 1;
  padding: 0.5em;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 1em;
}
.add-note-box button {
  background: var(--color-bg-button);
  color: var(--color-text-main);
  border: none;
  border-radius: 4px;
  padding: 0.5em 1em;
  font-size: 1em;
  cursor: pointer;
  transition: background 0.15s;
}
.add-note-box button:hover {
  background: var(--color-bg-button-hover);
}
.error-msg {
  color: red;
  font-size: 0.9em;
  margin-top: 0.5em;
}

.summary-box {
  background: var(--color-bg-main);
  border-radius: 8px;
  padding: 1em;
  box-shadow: 0 1px 6px rgba(0,0,0,0.10);
}

.summary-label{
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-text-secondary);
  margin: 0.5rem 0;
}

.plotdev-box {
  display: flex;
  margin-top: 1em;
  padding-top: 1em;
  border-top: 1px solid var(--color-border);
}

.plotdev-label {
  font-weight: bold;
  color: var(--color-text-secondary);
  margin-right: 0.5em;
}


.overview-row {
  color: var(--color-text-secondary);
  background-color: var(--color-bg-main);
  display: flex;
  gap: 2em;
  margin-top: 1.5em;
  padding: 1em;
  border-radius: 8px;
}
</style>
