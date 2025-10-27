<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let sessionHistory: any[] = [];
  export let upcomingSessions: any[] = [];
  export let selectedSessionId: string = '';
  const dispatch = createEventDispatcher();

  // Helper function to format date
  function formatDate(dateString: string) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  }

  // Helper function to get session status
  function getSessionStatus(session: any) {
    if (session.isEnded) return 'completed';
    if (session.date && new Date(session.date) < new Date()) return 'overdue';
    return 'upcoming';
  }

  //Delete Session
  function deleteSession(sessionId: string) {
    dispatch('deleteSession', sessionId);

  }
</script>

<aside class="sessions-sidebar">
  <div class="sidebar-section">
    <div class="section-header">
      <h3>Upcoming Sessions</h3>
      <span class="session-count">{upcomingSessions.length}</span>
    </div>
    <div class="sessions-container">
      {#if upcomingSessions.length === 0}
        <div class="empty-state">
          <span class="empty-icon"></span>
          <p>No upcoming sessions</p>
        </div>
      {:else}
        {#each upcomingSessions as session}
          <div 
            class="session-card {getSessionStatus(session)}"
            class:selected={selectedSessionId === session._id}
            on:click={() => dispatch('selectSession', session)}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && dispatch('selectSession', session)}
          >
            <div class="session-main">
              <div class="session-title">{session.title || 'Untitled Session'}</div>
              {#if session.date}
                <div class="session-date">{formatDate(session.date)}</div>
              {/if}
            </div>
            <div class="session-meta">
              {#if session.notes?.summary}
                <div class="session-preview">{session.notes.summary.slice(0, 60)}{session.notes.summary.length > 60 ? '...' : ''}</div>
              {/if}
              <div class="session-indicators">
                {#if session.notes?.xp && session.notes.xp > 0}
                  <span class="indicator xp-indicator">{session.notes.xp} XP</span>
                {/if}
                <span class="status-indicator {getSessionStatus(session)}">{getSessionStatus(session)}</span>
                <button 
                  class="delete-session-btn" 
                  on:click|stopPropagation={() => deleteSession(session._id)}
                  title="Delete session"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <div class="sidebar-section">
    <div class="section-header">
      <h3>Session History</h3>
      <span class="session-count">{sessionHistory.length}</span>
    </div>
    <div class="sessions-container scrollable">
      {#if sessionHistory.length === 0}
        <div class="empty-state">
          <p>No completed sessions</p>
        </div>
      {:else}
        {#each sessionHistory as session}
          <div 
            class="session-card {getSessionStatus(session)}"
            class:selected={selectedSessionId === session._id}
            on:click={() => dispatch('selectSession', session)}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && dispatch('selectSession', session)}
          >
            <div class="session-main">
              <div class="session-title">{session.title || 'Untitled Session'}</div>
              {#if session.date}
                <div class="session-date">{formatDate(session.date)}</div>
              {/if}
            </div>
            <div class="session-meta">
              {#if session.notes?.summary}
                <div class="session-preview">{session.notes.summary.slice(0, 60)}{session.notes.summary.length > 60 ? '...' : ''}</div>
              {/if}
              <div class="session-indicators">
                {#if session.notes?.xp && session.notes.xp > 0}
                  <span class="indicator xp-indicator">{session.notes.xp} XP</span>
                {/if}
                <span class="status-indicator {getSessionStatus(session)}">completed</span>
                <button 
                  class="delete-session-btn" 
                  on:click|stopPropagation={() => deleteSession(session._id)}
                  title="Delete session"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <button class="create-session-btn" on:click={() => dispatch('createSession')}>
    <span class="btn-icon">+</span>
    Create New Session
  </button>
</aside>

<style>
.sessions-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
  max-height: calc(100vh - 8rem);
  overflow: hidden;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.section-header h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-accent);
  margin: 0;
}

.session-count {
  background: var(--color-bg-button);
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  min-width: 1.5rem;
  text-align: center;
  font-weight: 500;
}

.sessions-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 0;
}

.sessions-container.scrollable {
  flex: 1;
  overflow-y: auto;
  max-height: 40vh;
  padding-right: 0.25rem;
}

.sessions-container.scrollable::-webkit-scrollbar {
  width: 4px;
}

.sessions-container.scrollable::-webkit-scrollbar-track {
  background: transparent;
}

.sessions-container.scrollable::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.sessions-container.scrollable::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}

.session-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.session-card:hover {
  background: var(--color-bg-button);
  border-color: var(--color-text-accent);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.session-card:focus {
  outline: 2px solid var(--color-text-accent);
  outline-offset: 2px;
}

.session-card.selected {
  background: var(--color-bg-accent);
  border-color: var(--color-text-accent);
  box-shadow: 0 0 0 2px var(--color-text-accent);
}

.session-card.upcoming::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: #4f46e5;
}

.session-card.completed::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: #059669;
}

.session-card.overdue::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: #dc2626;
}

.session-main {
  margin-bottom: 0.5rem;
}

.session-title {
  font-weight: 600;
  color: var(--color-text-main);
  font-size: 0.9rem;
  line-height: 1.3;
  margin-bottom: 0.25rem;
}

.session-date {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.session-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.session-preview {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
  opacity: 0.8;
}

.session-indicators {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.indicator {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
  border-radius: 10px;
  font-weight: 500;
}

.xp-indicator {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.status-indicator {
  font-size: 0.65rem;
  padding: 0.1rem 0.3rem;
  border-radius: 8px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-indicator.upcoming {
  background: rgba(79, 70, 229, 0.1);
  color: #4f46e5;
}

.status-indicator.completed {
  background: rgba(5, 150, 105, 0.1);
  color: #059669;
}

.status-indicator.overdue {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

.empty-state p {
  font-size: 0.85rem;
  margin: 0;
}

.create-session-btn {
  background: linear-gradient(135deg, var(--color-bg-button), var(--color-bg-button-hover));
  color: var(--color-text-main);
  border: none;
  border-radius: 8px;
  padding: 0.875rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: auto;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.create-session-btn:hover {
  background: linear-gradient(135deg, var(--color-bg-button-hover), var(--color-bg-button));
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.create-session-btn:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 1.1rem;
  font-weight: bold;
}

.delete-session-btn {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.2);
  border-radius: 6px;
  padding: 0.2rem 0.4rem;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
}

.delete-session-btn:hover {
  background: rgba(220, 38, 38, 0.2);
  border-color: #dc2626;
  transform: scale(1.05);
}

.delete-session-btn:active {
  transform: scale(0.95);
}

/* Responsive adjustments */
@media (max-height: 600px) {
  .sessions-container.scrollable {
    max-height: 25vh;
  }
}

/* Mobile Responsive Styles */
@media (max-width: 768px) {
  .sessions-sidebar {
    gap: 1rem;
    height: auto;
    max-height: none;
    padding: 0.5rem 0;
  }
  
  .sidebar-section {
    flex: none;
  }
  
  .section-header {
    margin-bottom: 0.5rem;
    padding-bottom: 0.375rem;
  }
  
  .section-header h3 {
    font-size: 1rem;
  }
  
  .sessions-container {
    gap: 0.375rem;
  }
  
  .sessions-container.scrollable {
    max-height: 30vh;
    overflow-y: auto;
  }
  
  .session-card {
    padding: 0.625rem;
    border-radius: 6px;
  }
  
  .session-title {
    font-size: 0.85rem;
    line-height: 1.2;
  }
  
  .session-date {
    font-size: 0.7rem;
  }
  
  .session-preview {
    font-size: 0.7rem;
    line-height: 1.3;
  }
  
  .session-indicators {
    gap: 0.375rem;
  }
  
  .indicator {
    font-size: 0.65rem;
    padding: 0.125rem 0.3rem;
  }
  
  .status-indicator {
    font-size: 0.6rem;
    padding: 0.08rem 0.25rem;
  }
  
  .delete-session-btn {
    min-width: 20px;
    height: 20px;
    font-size: 0.65rem;
    padding: 0.15rem 0.3rem;
  }
  
  .create-session-btn {
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
    margin-top: 1rem;
  }
  
  .btn-icon {
    font-size: 1rem;
  }
  
  .session-count {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
    min-width: 1.25rem;
  }
  
  .empty-state {
    padding: 1.5rem 0.75rem;
  }
  
  .empty-icon {
    font-size: 1.5rem;
  }
  
  .empty-state p {
    font-size: 0.8rem;
  }
}

/* Small Mobile Devices */
@media (max-width: 480px) {
  .sessions-sidebar {
    gap: 0.75rem;
  }
  
  .sessions-container.scrollable {
    max-height: 25vh;
  }
  
  .session-card {
    padding: 0.5rem;
  }
  
  .session-title {
    font-size: 0.8rem;
  }
  
  .session-preview {
    display: none; /* Hide preview on very small screens */
  }
  
  .create-session-btn {
    padding: 0.625rem 0.75rem;
    font-size: 0.8rem;
  }
}
</style>
