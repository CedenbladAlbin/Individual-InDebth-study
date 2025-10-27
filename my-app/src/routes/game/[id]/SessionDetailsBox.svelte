<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { authenticatedFetch, sessionsApi } from '$lib/api.js';
  
  const dispatch = createEventDispatcher();
  
  export let session: any;
  export let show: boolean = true;
  export let edit: boolean = false;
  export let editData: any = {};
  export let onEdit: () => void;
  export let onSave: () => void;
  export let onCancel: () => void;
  export let onToggle: () => void;
  export let onClose: () => void;

  // Props for entity management (passed from parent game page)
  export let npcs: any[] = [];
  export let players: any[] = [];
  export let items: any[] = [];
  export let scenes: any[] = [];
  export let itemMap: { [key: string]: any } = {};
  export let npcMap: { [key: string]: any } = {};
  export let sceneMap: { [key: string]: any } = {};
  export let playerMap: { [key: string]: any } = {};
  export let startCreate: (type: string, data: any) => void = () => {};
  export let startConnect: (type: string, data: any) => void = () => {};
  export let openNotes: (type: string, id: string) => void = () => {};
  export let deleteContent: (type: string, id: string) => void = () => {};
  export let onRemoveConnection: (type: string, entity: any, targetId: string) => void = () => {};
  export let handleEntityClick: (type: string, entity: any) => void = () => {};
  export let startEdit: (type: string, data: any) => void = () => {};

  let activeTab: 'overview' | 'entities' | 'notes' | 'advanced' = 'overview';
  let entityActiveTab: 'scene' | 'npc' | 'player' | 'item' = 'scene';

  // Import section components
  import EntitySection from '$lib/EntitySection.svelte';
  import SceneFullscreenView from '$lib/SceneFullscreenView.svelte';

  let fullscreenScene: any = null;

  function openFullscreenScene(scene: any) {
    console.log('Opening fullscreen scene:', scene);
    fullscreenScene = scene;
  }

  function closeFullscreenScene() {
    fullscreenScene = null;
  }

  // Initialize editData with session data
  $: if (session && !editData.initialized) {
    editData = {
      initialized: true,
      summary: session.notes?.summary || '',
      plotDevelopments: session.notes?.plotDevelopments || '',
      xp: session.notes?.xp || 0,
      isEnded: session.isEnded || false,
      date: session.date ? new Date(session.date).toISOString().split('T')[0] : '',
      sessionNotes: session.notes?.custom || '',
      additionalNotes: session.notes?.additional || '',
      quests: session.notes?.quests || '',
      loot: session.notes?.loot || '',
      secrets: session.notes?.secrets || '',
      factions: session.notes?.factions || '',
      mysteries: session.notes?.mysteries || '',
      goals: session.notes?.goals || '',
      downtime: session.notes?.downtime || '',
      nextPlans: session.notes?.nextPlans || ''
    };
  }

  import { goto } from '$app/navigation';

  let noteInput = '';
  let loading = false;
  let errorMsg = '';
  let showAddNote = false;
  let saveTimeout: NodeJS.Timeout;
  let hasUserInteracted = false;
  let lastSavedData = '';

  // Auto-save function with debouncing
  async function autoSave() {
    if (!editData.initialized || !hasUserInteracted) return;
    
    // Check if data has actually changed
    const currentDataString = JSON.stringify({
      isEnded: editData.isEnded,
      date: editData.date,
      summary: editData.summary,
      plotDevelopments: editData.plotDevelopments,
      xp: editData.xp,
      sessionNotes: editData.sessionNotes,
      additionalNotes: editData.additionalNotes,
      quests: editData.quests,
      loot: editData.loot,
      secrets: editData.secrets,
      factions: editData.factions,
      mysteries: editData.mysteries,
      goals: editData.goals,
      downtime: editData.downtime,
      nextPlans: editData.nextPlans
    });
    
    if (currentDataString === lastSavedData) return;
    
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        const res = await authenticatedFetch(`/api/sessions/${session._id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            isEnded: editData.isEnded,
            date: editData.date ? new Date(editData.date).toISOString() : null,
            notes: {
              summary: editData.summary,
              plotDevelopments: editData.plotDevelopments,
              xp: editData.xp,
              custom: editData.sessionNotes,
              additional: editData.additionalNotes,
              quests: editData.quests,
              loot: editData.loot,
              secrets: editData.secrets,
              factions: editData.factions,
              mysteries: editData.mysteries,
              goals: editData.goals,
              downtime: editData.downtime,
              nextPlans: editData.nextPlans
            }
          })
        });
        if (!res.ok) throw new Error(await res.text());
        lastSavedData = currentDataString;
        console.log('Auto-saved successfully');
        
        // Dispatch event to update parent component with new session data
        dispatch('sessionUpdated', {
          ...session,
          isEnded: editData.isEnded,
          date: editData.date ? new Date(editData.date).toISOString() : null,
          notes: {
            summary: editData.summary,
            plotDevelopments: editData.plotDevelopments,
            xp: editData.xp,
            custom: editData.sessionNotes,
            additional: editData.additionalNotes,
            quests: editData.quests,
            loot: editData.loot,
            secrets: editData.secrets,
            factions: editData.factions,
            mysteries: editData.mysteries,
            goals: editData.goals,
            downtime: editData.downtime,
            nextPlans: editData.nextPlans
          }
        });
      } catch (e) {
        console.error('Auto-save failed:', e);
      }
    }, 1000); // Save after 1 second of no changes
  }

  // Function to mark user interaction
  function markUserInteraction() {
    hasUserInteracted = true;
    autoSave();
  }

  // Initialize lastSavedData when component loads
  $: if (editData.initialized && !lastSavedData) {
    lastSavedData = JSON.stringify({
      isEnded: editData.isEnded,
      date: editData.date,
      summary: editData.summary,
      plotDevelopments: editData.plotDevelopments,
      xp: editData.xp,
      sessionNotes: editData.sessionNotes,
      additionalNotes: editData.additionalNotes,
      quests: editData.quests,
      loot: editData.loot,
      secrets: editData.secrets,
      factions: editData.factions,
      mysteries: editData.mysteries,
      goals: editData.goals,
      downtime: editData.downtime,
      nextPlans: editData.nextPlans
    });
  }

  async function addNote() {
    if (!noteInput.trim()) return;
    loading = true;
    errorMsg = '';
    try {
      const res = await authenticatedFetch(`/api/sessions/${session._id}`, {
        method: 'POST',
        body: JSON.stringify({ note: noteInput })
      });
      if (!res.ok) throw new Error(await res.text());
      noteInput = '';
      showAddNote = false;
    } catch (e) {
      errorMsg = (e instanceof Error ? e.message : 'Failed to add note.');
    }
    loading = false;
  }

</script>



{#if session}
  <div class="session-details-box-large session-details-bottom">
    <button class="close-btn" on:click={onClose} title="Close">×</button>
    <div class="session-details-header">
      <h3>{session.title} {session.isEnded ? '(Ended)' : ''}</h3>
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
        <div class="editable-field">
          <div class="summary-box">
            <div class="summary-label">Summary</div>
            <textarea 
              class="editable-field" 
              bind:value={editData.summary}
              on:input={markUserInteraction}
              placeholder="What happened in this session..."
            ></textarea>
          </div>
          
          <div class="summary-box">
            <div class="summary-label">Plot Developments</div>
            <textarea 
              class="editable-field" 
              bind:value={editData.plotDevelopments}
              on:input={markUserInteraction}
              placeholder="Key story developments..."
            ></textarea>
          </div>
        </div>
        
        <div class="session-meta-card">
          <div class="meta-row">
            <div class="meta-item">
              <span class="meta-label">Experience Points</span>
              <input 
                type="number" 
                class="editable-field small"
                bind:value={editData.xp}
                on:input={markUserInteraction}
                placeholder="0"
              />
            </div>
            <div class="meta-item">
              <span class="meta-label">Session Date</span>
              <input 
                type="date" 
                class="editable-field small"
                bind:value={editData.date}
                on:input={markUserInteraction}
              />
            </div>
          </div>
          <div class="meta-row">
            <div class="meta-item full-width">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  bind:checked={editData.isEnded}
                  on:change={markUserInteraction}
                />
                <span class="checkbox-text">Mark session as completed</span>
              </label>
            </div>
          </div>
        </div>
      {:else if activeTab === 'entities'}
        <div class="entities-main-content">
          <nav class="entity-tab-nav">
            <button class:active-tab={entityActiveTab === 'scene'} on:click={() => entityActiveTab = 'scene'}>Scenes</button>
            <button class:active-tab={entityActiveTab === 'npc'} on:click={() => entityActiveTab = 'npc'}>NPCs</button>
            <button class:active-tab={entityActiveTab === 'player'} on:click={() => entityActiveTab = 'player'}>Players</button>
            <button class:active-tab={entityActiveTab === 'item'} on:click={() => entityActiveTab = 'item'}>Items</button>
          </nav>
          
      
          {#if fullscreenScene}
            <SceneFullscreenView
              scene={fullscreenScene}
              npcs={npcs.filter((n) => n.sceneId === fullscreenScene._id)}
              items={items.filter((i) => i.sceneId === fullscreenScene._id)}
              players={players}
              on:close={closeFullscreenScene}
            />
          {/if}

          {#if entityActiveTab === 'scene'}
            <EntitySection
              entities={scenes}
              entityType="scene"
              {startConnect}
              {startCreate}
              {startEdit}
              {openNotes}
              {deleteContent}
              onRemoveConnection={onRemoveConnection}
              {itemMap}
              {npcMap}
              {sceneMap}
              {playerMap}
              on:entityClick={e => openFullscreenScene(e.detail)}
            />
          {/if}

          {#if entityActiveTab === 'npc'}
            <EntitySection
              entities={npcs}
              entityType="npc"
              {startConnect}
              {startCreate}
              {startEdit}
              {openNotes}
              {deleteContent}
              onRemoveConnection={onRemoveConnection}
              {itemMap}
              {npcMap}
              {sceneMap}
              {playerMap}
            />
          {/if}

          {#if entityActiveTab === 'player'}
            <EntitySection
              entities={players}
              entityType="player"
              {startConnect}
              {startCreate}
              {startEdit}
              {openNotes}
              {deleteContent}
              onRemoveConnection={onRemoveConnection}
              {itemMap}
              {npcMap}
              {sceneMap}
              {playerMap}
            />
          {/if}

          {#if entityActiveTab === 'item'}
            <EntitySection
              entities={items}
              entityType="item"
              {startConnect}
              {startCreate}
              {startEdit}
              {openNotes}
              {deleteContent}
              onRemoveConnection={onRemoveConnection}
              {itemMap}
              {npcMap}
              {sceneMap}
              {playerMap}
            />
          {/if}
        </div>
      {:else if activeTab === 'notes'}
        <div class="editable-field notes">
          <div class="info-label">Session Notes</div>
          <textarea 
            class="editable-field" 
            bind:value={editData.sessionNotes}
            on:input={markUserInteraction}
            placeholder="Enter session notes..."
          ></textarea>
          
          <div class="info-label">Additional Notes</div>
          <textarea 
            class="editable-field" 
            bind:value={editData.additionalNotes}
            on:input={markUserInteraction}
            placeholder="Enter additional notes..."
          ></textarea>
        </div>
      {:else if activeTab === 'advanced'}
        <div class="advanced-content">
          <!-- Adventure Progress Section -->
          <div class="advanced-section">
            <div class="section-header">
              <div class="section-title">
                Adventure Progress
              </div>
              <div class="section-subtitle">Track quests, rewards, and discoveries</div>
            </div>
            
            <div class="field-grid">
              <div class="field-card">
                <div class="field-label">
                  Quests & Objectives
                </div>
                <textarea 
                  class="editable-field advanced" 
                  bind:value={editData.quests}
                  on:input={markUserInteraction}
                  placeholder="Active quests and progress, completed objectives, new quest leads discovered..."
                ></textarea>
              </div>
              
              <div class="field-card">
                <div class="field-label">
                  Loot & Rewards
                </div>
                <textarea 
                  class="editable-field advanced" 
                  bind:value={editData.loot}
                  on:input={markUserInteraction}
                  placeholder="Items acquired, gold and treasure, equipment upgrades..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Story & Lore Section -->
          <div class="advanced-section">
            <div class="section-header">
              <div class="section-title">
                Story & Lore
              </div>
              <div class="section-subtitle">Secrets, factions, and mysteries uncovered</div>
            </div>
            
            <div class="field-grid">
              <div class="field-card">
                <div class="field-label">
                  Secrets Revealed
                </div>
                <textarea 
                  class="editable-field advanced" 
                  bind:value={editData.secrets}
                  on:input={markUserInteraction}
                  placeholder="Hidden information discovered, secret passages or rooms, NPC secrets revealed..."
                ></textarea>
              </div>
              
              <div class="field-card">
                <div class="field-label">
                  Faction Activities
                </div>
                <textarea 
                  class="editable-field advanced" 
                  bind:value={editData.factions}
                  on:input={markUserInteraction}
                  placeholder="Faction interactions, political developments, alliance changes..."
                ></textarea>
              </div>
              
              <div class="field-card full-width">
                <div class="field-label">
                  Mysteries & Clues
                </div>
                <textarea 
                  class="editable-field advanced" 
                  bind:value={editData.mysteries}
                  on:input={markUserInteraction}
                  placeholder="Unresolved mysteries and clues, investigation leads, questions raised during the session..."
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Planning Section -->
          <div class="advanced-section">
            <div class="section-header">
              <div class="section-title">
                Session Planning
              </div>
              <div class="section-subtitle">Goals and future session preparation</div>
            </div>
            
            <div class="field-grid">
              <div class="field-card">
                <div class="field-label">
                  Goals & Objectives
                </div>
                <textarea 
                  class="editable-field advanced" 
                  bind:value={editData.goals}
                  on:input={markUserInteraction}
                  placeholder="Session objectives achieved, player goals pursued, party priorities..."
                ></textarea>
              </div>
              
              <div class="field-card">
                <div class="field-label">
                  Downtime Activities
                </div>
                <textarea 
                  class="editable-field advanced" 
                  bind:value={editData.downtime}
                  on:input={markUserInteraction}
                  placeholder="Training and skill development, shopping and crafting, social activities..."
                ></textarea>
              </div>
              
              <div class="field-card full-width">
                <div class="field-label">
                  Next Session Preparation
                </div>
                <textarea 
                  class="editable-field advanced" 
                  bind:value={editData.nextPlans}
                  on:input={markUserInteraction}
                  placeholder="Plot threads to follow up, NPCs to prepare, locations to detail, encounters to plan..."
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      {/if}
    {#if errorMsg}
      <div class="error-message">{errorMsg}</div>
    {/if}
  </div>
{/if}
<style>
.session-details-box-large.session-details-bottom {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 2500;
  background: var(--color-bg-secondary);
  color: var(--color-text-main);
  border-radius: 0;
  margin: 0;
  padding: 2.2em 2.5em 2em 2.5em;
  box-shadow: 0 0 32px 8px rgba(0,0,0,0.18);
  font-size: 1.18em;
  min-width: 0;
  max-width: 100vw;
  height: 95vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  transition: box-shadow 0.2s;
  overflow-x: hidden;
}
.session-details-box-large{
  z-index: 1;
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

.session-details-actions .save-btn {
  background: var(--color-bg-success);
}

.session-details-actions .save-btn:hover {
  background: var(--color-bg-success-dark);
}

.session-details-actions .delete-btn {
  background: var(--color-bg-danger);
}

.session-details-actions .delete-btn:hover {
  background: var(--color-bg-danger-dark);
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
.entity-chip.npc { background: var(--color-bg-secondary); color: var(--color-text-accent); }
.entity-chip.scene { background: var(--color-bg-secondary); color: var(--color-text-accent3); }
.entity-chip.player { background: var(--color-bg-secondary); color: var(--color-text-accent); }
.entity-chip.item { background: var(--color-bg-secondary); color: var(--color-text-warning); }
.error-message {
  color: var(--color-bg-danger);
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

/* Editable Field Styles */
.editable-field {
  background: var(--color-bg-main);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-main);
  padding: 1rem;
  font-size: 1rem;
  font-family: inherit;
  line-height: 1.5;
  transition: all 0.2s ease;
  width: calc(100% - 2rem);
}

.editable-field:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.15);
  outline: none;
  background: var(--color-surface);
}

.editable-field:hover {
  border-color: var(--color-text-accent);
}

.editable-field.small {
  width: 100%;
  padding: 0.75rem;
}

.editable-field.large {
  width: 100%;
  
}

.notes-textarea {
  min-height: 150px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5em;
  font-size: 0.95em;
}

.field-row {
  margin-bottom: 1.5em;
}

/* Entity Tab Navigation */
.entities-main-content {
  display: flex;
  flex-direction: column;
  gap: 1em;
}

.entity-tab-nav {
  display: flex;
  gap: 1.2em;
  margin-bottom: 1.2em;
  padding-bottom: 1em;
  border-bottom: 1px solid var(--color-border);
}

.entity-tab-nav button {
  background: none;
  color: var(--color-text-main);
  border: none;
  font-size: 1.08em;
  padding: 0.3em 1.2em;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}

.entity-tab-nav button.active-tab,
.entity-tab-nav button:hover {
  background: var(--color-bg-button);
  color: var(--color-text-main);
}

/* ===== ADVANCED SECTION STYLES ===== */
.advanced-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.advanced-section {
  background: var(--color-bg-main);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border: 1px solid var(--color-border);
}

.section-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--color-border);
}

.section-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text-accent);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-subtitle {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(35%, 1fr));
  gap: 1.5rem;
}

.field-card {
  background: var(--color-bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid var(--color-border);
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.field-card:hover {
  border-color: var(--color-primary);
  box-shadow: 0 6px 20px rgba(0,0,0,0.12);
  transform: translateY(-2px);
}

.field-card.full-width {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-accent);
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-bottom: 2px solid var(--color-primary);
  padding-bottom: 0.5rem;
}

.editable-field.advanced {
  min-height: 140px;
  max-height: 300px;
  font-size: 1rem;
  line-height: 1.6;
  border: 2px solid var(--color-border);
  background: var(--color-bg-main);
  border-radius: 8px;
  padding: 1rem;
  font-family: inherit;
  resize: vertical;
  transition: all 0.2s ease;
}

.editable-field.advanced:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.15);
  outline: none;
  background: var(--color-surface);
}

.editable-field.advanced:hover {
  border-color: var(--color-text-accent);
}

/* ===== MOBILE RESPONSIVE DESIGN ===== */
@media (max-width: 768px) {
  .session-details-box-large.session-details-bottom {
    padding: 1rem;
    font-size: 1rem;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2000;
    overflow-y: auto;
  }

  .close-btn {
    top: 0.5rem;
    right: 0.5rem;
    font-size: 1.5rem;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-main);
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }

  .session-details-header {
    margin-bottom: 1rem;
    padding-right: 3rem;
  }

  .session-details-header h3 {
    font-size: 1.2rem;
    margin: 0;
    line-height: 1.3;
  }

  /* Mobile Tab Navigation */


  .session-tabs button {
    flex: 1;
    min-width: 70px;
    padding: 0.6rem 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
    border-radius: 6px;
    margin: 0;
  }

  .session-tabs button.active-tab {
    background: var(--color-bg-button);
    color: var(--color-text-main);
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  /* Mobile Overview Layout */
  .overview-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .summary-box {
    background: var(--color-bg-main);
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  .summary-label {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-accent);
    margin: 0 0 0.75rem 0;
  }

  .session-meta-card {
    background: var(--color-bg-main);
    border-radius: 12px;
    padding: 1.25rem;
    margin-top: 1rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  .meta-row {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .meta-row:last-child {
    margin-bottom: 0;
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    min-width: 140px;
  }

  .meta-item.full-width {
    flex: 1 1 100%;
    min-width: auto;
  }

  .meta-label {
    font-weight: 600;
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.75rem;
    background: var(--color-bg-secondary);
    border-radius: 8px;
    border: 1px solid var(--color-border);
    transition: all 0.2s ease;
  }

  .checkbox-label:hover {
    background: var(--color-bg-button);
  }

  .checkbox-label input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  .checkbox-text {
    font-weight: 500;
  }

  /* Mobile Entity Navigation */
  .entity-tab-nav {
    display: flex;
    gap: 0;
    margin-bottom: 1rem;
    background: var(--color-bg-main);
    border-radius: 8px;
    padding: 4px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .entity-tab-nav button {
    flex: 1;
    min-width: 60px;
    padding: 0.6rem 0.3rem;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    border-radius: 6px;
    margin: 0;
  }

  .entity-tab-nav button.active-tab {
    background: var(--color-bg-button);
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  /* Mobile Form Fields */
  .editable-field {
    font-size: 0.9rem;
    padding: 0.75rem;
    border-radius: 8px;
  }

  .editable-field.small {
    width: 100px;
    padding: 0.5rem;
  }

  .editable-field.medium {
    min-height: 100px;
    padding: 0.75rem;
  }

  .editable-field.large {
    min-height: 120px;
    padding: 0.75rem;
  }

  .notes-textarea {
    min-height: 140px;
  }

  /* Mobile Notes Fields */
  .notes-fields {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .info-label {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-accent);
    margin-bottom: 0.5rem;
  }

  /* Mobile Advanced Fields */
  .advanced-section {
    margin-bottom: 2rem;
  }

  .field-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .field-card {
    padding: 1.25rem;
    background: var(--color-bg-secondary);
    border-radius: 10px;
    border: 2px solid var(--color-border);
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }

  .field-card:hover {
    transform: none; /* Disable transform on mobile */
  }

  .field-label {
    font-size: 1rem;
    margin-bottom: 0.75rem;
  }

  .editable-field.advanced {
    min-height: 120px;
    max-height: 250px;
    font-size: 0.95rem;
    padding: 0.875rem;
    border-radius: 6px;
  }

  /* Mobile Entity Content */
  .entities-main-content {
    gap: 1rem;
  }

  /* Mobile Error Messages */
  .error-message,
  .error-msg {
    font-size: 0.85rem;
    padding: 0.75rem;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.2);
    border-radius: 6px;
    margin-top: 1rem;
  }

  /* Mobile Add Note Box */
  .add-note-box {
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .add-note-box input {
    padding: 0.75rem;
    font-size: 0.9rem;
    border-radius: 8px;
  }

  .add-note-box button {
    padding: 0.75rem 1.25rem;
    font-size: 0.9rem;
    border-radius: 8px;
    font-weight: 600;
  }
}

/* Small Mobile Devices */
@media (max-width: 480px) {
  .session-details-box-large.session-details-bottom {
    padding: 0.75rem;
  }

  .session-details-header h3 {
    font-size: 1.1rem;
  }

  .session-tabs button {
    padding: 0.5rem 0.25rem;
    font-size: 0.75rem;
  }

  .entity-tab-nav button {
    padding: 0.5rem 0.2rem;
    font-size: 0.7rem;
  }

  .meta-row {
    flex-direction: column;
    gap: 0.75rem;
  }

  .meta-item {
    min-width: auto;
    flex: none;
  }

  .editable-field.small {
    width: 100%;
  }

  .summary-label {
    font-size: 1rem;
  }

  .info-label {
    font-size: 0.9rem;
  }
}

/* Landscape Mobile Adjustments */
@media (max-width: 768px) and (orientation: landscape) {
  .session-details-box-large.session-details-bottom {
    padding: 0.75rem;
  }

  .meta-row {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .meta-item {
    flex: 1;
    min-width: 140px;
  }

  .notes-textarea {
    min-height: 100px;
  }

  .editable-field.medium,
  .editable-field.large {
    min-height: 80px;
  }
}
</style>
