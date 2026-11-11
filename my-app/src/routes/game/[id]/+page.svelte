<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { api, getToken } from '$lib/api';
  import Modal from '$lib/Modal.svelte';
  import GameContentForm, { FIELDS } from '$lib/GameContentForm.svelte';
  import SidebarSessions from '$lib/SidebarSessions.svelte';
  import SceneFullscreenView from '$lib/SceneFullscreenView.svelte';
  import EntityBrowser from '$lib/EntityBrowser.svelte';
  import EntityPicker, { type Candidate } from '$lib/EntityPicker.svelte';
  import SessionDetailsBox from './SessionDetailsBox.svelte';
  import { sortByDate, formatSessionDate } from '$lib/sessions';

  type ContentType = 'scene' | 'npc' | 'player' | 'item';

  const TABS: { type: ContentType; label: string; one: string }[] = [
    { type: 'scene', label: 'Scenes', one: 'scene' },
    { type: 'npc', label: 'NPCs', one: 'NPC' },
    { type: 'player', label: 'Players', one: 'player' },
    { type: 'item', label: 'Items', one: 'item' }
  ];
  const ONE: Record<string, string> = { scene: 'Scene', npc: 'NPC', player: 'Player', item: 'Item' };

  $: id = $page.params.id ?? '';

  let game: any = null;
  let loading = true;
  let error = '';

  let npcs: any[] = [];
  let players: any[] = [];
  let items: any[] = [];
  let scenes: any[] = [];

  // Lookup maps keyed by _id
  let npcMap: Record<string, any> = {};
  let sceneMap: Record<string, any> = {};
  let playerMap: Record<string, any> = {};
  let itemMap: Record<string, any> = {};

  let activeTab: ContentType = 'scene';
  let groupFilter = '';
  let creatingType: ContentType | null = null;
  let editing: { type: ContentType; entity: any } | null = null;
  let selectedEntity: { type: ContentType; entity: any } | null = null;
  let fullscreenScene: any = null;

  let sessions: any[] = [];
  let selectedSession: any = null;

  let notesModal: { type: string, entityId: string, name: string, notes: any[], loading: boolean, error: string, editingNote: any | null } | null = null;
  let newNoteTitle = '';
  let newNoteText = '';

  $: lists = { scene: scenes, npc: npcs, player: players, item: items } as Record<ContentType, any[]>;
  $: activeLabel = TABS.find(t => t.type === activeTab)!;
  $: allGroups = [...new Set([...scenes, ...npcs, ...players, ...items].map((e) => (e.group || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  function switchTab(type: ContentType) {
    activeTab = type;
    groupFilter = '';
  }

  /** Sessions an entity was linked to, newest first */
  function sessionsWith(type: string, id: string) {
    const key = ({ npc: 'npcs', player: 'players', item: 'items', scene: 'scenes' } as Record<string, string>)[type];
    return sortByDate(sessions.filter((s) => s.connections?.[key]?.includes(id)), 'desc');
  }
  let showAllAppearances = false;
  let lastEntityId = '';
  $: if (selectedEntity?.entity._id !== lastEntityId) {
    lastEntityId = selectedEntity?.entity._id ?? '';
    showAllAppearances = false;
  }
  $: appearances = selectedEntity && sessions ? sessionsWith(selectedEntity.type, selectedEntity.entity._id) : [];

  onMount(async () => {
    if (!getToken()) {
      window.location.href = '/login';
      return;
    }
    try {
      const res = await api(`/api/games/${id}`);
      if (res.ok) {
        game = await res.json();
        await Promise.all([fetchAllContent(), fetchSessions()]);
      } else {
        error = res.status === 404 ? 'This game does not exist or belongs to someone else.' : 'Failed to load game.';
      }
    } catch {
      error = 'Failed to load game.';
    }
    loading = false;
  });

  async function fetchAllContent() {
    const load = async (type: ContentType) => {
      const res = await api(`/api/game-content?${type}=1&gameId=${id}`);
      return res.ok ? await res.json() : [];
    };
    [npcs, players, items, scenes] = await Promise.all([load('npc'), load('player'), load('item'), load('scene')]);
    npcMap = Object.fromEntries(npcs.map(n => [n._id, n]));
    sceneMap = Object.fromEntries(scenes.map(s => [s._id, s]));
    playerMap = Object.fromEntries(players.map(p => [p._id, p]));
    itemMap = Object.fromEntries(items.map(i => [i._id, i]));
    // Keep open views in sync with the fresh data
    if (fullscreenScene) fullscreenScene = sceneMap[fullscreenScene._id] ?? null;
    if (selectedEntity) {
      const maps: Record<string, Record<string, any>> = { npc: npcMap, player: playerMap, item: itemMap, scene: sceneMap };
      const fresh = maps[selectedEntity.type][selectedEntity.entity._id];
      selectedEntity = fresh ? { type: selectedEntity.type, entity: fresh } : null;
    }
  }

  async function fetchSessions() {
    const res = await api(`/api/sessions?gameId=${id}`);
    if (!res.ok) return;
    sessions = await res.json();
    if (selectedSession) {
      const fresh = sessions.find(s => s._id === selectedSession._id);
      selectedSession = fresh ? enrichSessionEntities(fresh) : null;
    }
  }

  function enrichSessionEntities(session: any) {
    const resolve = (ids: any[] = [], map: Record<string, any>) =>
      ids.map((sid: any) => (typeof sid === 'object' ? sid : map[sid] || { _id: sid }));
    return {
      ...session,
      npcs: resolve(session.connections?.npcs, npcMap),
      scenes: resolve(session.connections?.scenes, sceneMap),
      players: resolve(session.connections?.players, playerMap),
      items: resolve(session.connections?.items, itemMap)
    };
  }

  /* ---------- Connections ---------- */
  async function post(path: string, body: object) {
    const res = await api(path, { method: 'POST', body: JSON.stringify(body) });
    return res.ok;
  }
  /** Run several connect calls, then refresh once */
  async function connectAll(bodies: object[], failMessage: string) {
    let failed = 0;
    for (const b of bodies) if (!(await post('/api/game-content/connect', b))) failed++;
    if (failed) alert(`${failMessage} (${failed} of ${bodies.length} failed)`);
    await fetchAllContent();
  }
  async function disconnect(type: string, entity: any) {
    if (!(await post('/api/game-content/disconnect', { type, fromId: entity._id }))) alert('Failed to remove link.');
    await fetchAllContent();
  }
  // Used by the cards' small × buttons
  const handleRemoveConnection = (type: string, entity: any, _targetId: string) => disconnect(type, entity);

  /* ---------- Picker ---------- */
  let picker: {
    title: string;
    candidates: Candidate[];
    multiple: boolean;
    suggestedIds: string[];
    disabledIds: string[];
    confirmLabel: string;
    apply: (picked: Candidate[]) => Promise<void>;
  } | null = null;

  const as = (type: Candidate['type'], list: any[]): Candidate[] => list.map((entity) => ({ type, entity }));
  const unassigned = (i: any) => !i.ownerPlayerId && !i.ownerNpcId && !i.sceneId;
  /** Same group, or a scene whose location matches the group (e.g. NPCs from "Port Varrow") */
  const related = (e: any, list: any[]) => {
    const g = (e.group || e.location || '').trim().toLowerCase();
    if (!g) return [];
    return list.filter((x) => [x.group, x.location].some((v) => (v || '').trim().toLowerCase() === g)).map((x) => x._id);
  };

  function openLinker(type: ContentType, entity: any, relation: 'default' | 'items' = 'default') {
    if (type === 'item') {
      picker = {
        title: `Give or place "${entity.name}"`,
        candidates: [...as('player', players), ...as('npc', npcs), ...as('scene', scenes)],
        multiple: false,
        suggestedIds: [...players.map((p) => p._id), ...related(entity, [...npcs, ...scenes])],
        disabledIds: [entity.ownerPlayerId, entity.ownerNpcId, entity.sceneId].filter(Boolean),
        confirmLabel: 'Give',
        apply: async ([t]) => connectAll([{ itemId: entity._id, targetType: t.type, targetId: t.entity._id }], 'Failed to move item')
      };
    } else if ((type === 'npc' || type === 'player') && (relation === 'items' || type === 'player')) {
      picker = {
        title: `Give items to ${entity.name}`,
        candidates: as('item', items),
        multiple: true,
        suggestedIds: [...items.filter(unassigned).map((i) => i._id), ...related(entity, items)],
        disabledIds: entity.itemIds ?? [],
        confirmLabel: 'Give',
        apply: async (picked) => connectAll(picked.map((p) => ({ itemId: p.entity._id, targetType: type, targetId: entity._id })), 'Failed to give items')
      };
    } else if (type === 'npc') {
      picker = {
        title: `Place ${entity.name} in a scene`,
        candidates: as('scene', scenes),
        multiple: false,
        suggestedIds: related(entity, scenes),
        disabledIds: entity.sceneId ? [entity.sceneId] : [],
        confirmLabel: 'Place',
        apply: async ([s]) => connectAll([{ npcId: entity._id, sceneId: s.entity._id }], 'Failed to place NPC')
      };
    } else if (type === 'scene' && relation === 'items') {
      picker = {
        title: `Add items to ${entity.name}`,
        candidates: as('item', items),
        multiple: true,
        suggestedIds: [...items.filter(unassigned).map((i) => i._id), ...related(entity, items)],
        disabledIds: items.filter((i) => i.sceneId === entity._id).map((i) => i._id),
        confirmLabel: 'Add',
        apply: async (picked) => connectAll(picked.map((p) => ({ itemId: p.entity._id, targetType: 'scene', targetId: entity._id })), 'Failed to add items')
      };
    } else if (type === 'scene') {
      picker = {
        title: `Add NPCs to ${entity.name}`,
        candidates: as('npc', npcs),
        multiple: true,
        suggestedIds: related(entity, npcs),
        disabledIds: npcs.filter((n) => n.sceneId === entity._id).map((n) => n._id),
        confirmLabel: 'Add',
        apply: async (picked) => connectAll(picked.map((p) => ({ npcId: p.entity._id, sceneId: entity._id })), 'Failed to add NPCs')
      };
    }
  }

  async function runPicker(picked: Candidate[]) {
    const p = picker;
    picker = null;
    if (p && picked.length) await p.apply(picked);
  }

  /* ---------- Bulk actions from the list view ---------- */
  async function setGroup(ids: string[], group: string) {
    const res = await api('/api/game-content', { method: 'PATCH', body: JSON.stringify({ type: activeTab, ids, data: { group } }) });
    if (!res.ok) alert('Failed to update group.');
    await fetchAllContent();
  }
  function bulkLink(ids: string[]) {
    const n = ids.length;
    if (activeTab === 'npc') {
      picker = {
        title: `Place ${n} NPC${n === 1 ? '' : 's'} in a scene`,
        candidates: as('scene', scenes),
        multiple: false,
        suggestedIds: related(npcMap[ids[0]] ?? {}, scenes),
        disabledIds: [],
        confirmLabel: 'Place',
        apply: async ([s]) => connectAll(ids.map((npcId) => ({ npcId, sceneId: s.entity._id })), 'Failed to place NPCs')
      };
    } else if (activeTab === 'item') {
      picker = {
        title: `Give or place ${n} item${n === 1 ? '' : 's'}`,
        candidates: [...as('player', players), ...as('npc', npcs), ...as('scene', scenes)],
        multiple: false,
        suggestedIds: players.map((p) => p._id),
        disabledIds: [],
        confirmLabel: 'Give',
        apply: async ([t]) => connectAll(ids.map((itemId) => ({ itemId, targetType: t.type, targetId: t.entity._id })), 'Failed to move items')
      };
    }
  }
  async function bulkDelete(ids: string[]) {
    let failed = 0;
    for (const entityId of ids) {
      const res = await api(`/api/game-content?type=${activeTab}&id=${entityId}`, { method: 'DELETE' });
      if (!res.ok) failed++;
    }
    if (failed) alert(`${failed} could not be deleted.`);
    await fetchAllContent();
  }

  async function deleteContent(type: string, entity: any) {
    if (!confirm(`Delete "${entity.name}"? Its notes and links will be removed too.`)) return;
    const res = await api(`/api/game-content?type=${type}&id=${entity._id}`, { method: 'DELETE' });
    if (!res.ok) alert('Failed to delete.');
    if (selectedEntity?.entity._id === entity._id) selectedEntity = null;
    await fetchAllContent();
  }

  /* ---------- Notes ---------- */
  async function openNotes(type: string, entity: any) {
    notesModal = { type, entityId: entity._id, name: entity.name, notes: [], loading: true, error: '', editingNote: null };
    newNoteTitle = '';
    newNoteText = '';
    try {
      const res = await api(`/api/game-content/notes?type=${type}&entityId=${entity._id}`);
      if (res.ok) notesModal.notes = await res.json();
      else notesModal.error = 'Failed to load notes.';
    } catch {
      notesModal.error = 'Failed to load notes.';
    }
    notesModal.loading = false;
  }

  async function addNote() {
    if (!notesModal || !newNoteTitle.trim() || !newNoteText.trim()) return;
    const res = await api('/api/game-content/notes', {
      method: 'POST',
      body: JSON.stringify({ type: notesModal.type, entityId: notesModal.entityId, title: newNoteTitle, text: newNoteText })
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
    if (!notesModal || !confirm('Delete this note?')) return;
    const res = await api(`/api/game-content/notes?noteId=${noteId}`, { method: 'DELETE' });
    if (res.ok) notesModal.notes = notesModal.notes.filter(n => n._id !== noteId);
    else notesModal.error = 'Failed to delete note.';
  }

  async function updateNote() {
    if (!notesModal?.editingNote) return;
    const { _id, title, text } = notesModal.editingNote;
    const res = await api('/api/game-content/notes', {
      method: 'PUT',
      body: JSON.stringify({ noteId: _id, title, text })
    });
    if (res.ok) {
      notesModal.notes = notesModal.notes.map(n => (n._id === _id ? { ...n, title, text } : n));
      notesModal.editingNote = null;
    } else {
      notesModal.error = 'Failed to update note.';
    }
  }

  /* ---------- Detail view ---------- */
  type LinkEntry = { name: string; type: string; remove: () => void };
  type LinkSection = { label: string; type: string; entries: LinkEntry[]; action?: { label: string; run: () => void } };

  /** Linked things shown in the detail view, each with a remove button and an "add" action */
  function linksFor(sel: { type: ContentType; entity: any }): LinkSection[] {
    const e = sel.entity;
    const item = (i: string, kind: string): LinkEntry => ({ name: itemMap[i]?.name ?? 'Unknown', type: 'item', remove: () => disconnect(kind, { _id: i }) });
    if (sel.type === 'npc') return [
      {
        label: 'Location', type: 'scene',
        entries: e.sceneId ? [{ name: sceneMap[e.sceneId]?.name ?? 'Unknown', type: 'scene', remove: () => disconnect('npc-scene', e) }] : [],
        action: { label: e.sceneId ? 'Move…' : 'Place in scene…', run: () => openLinker('npc', e) }
      },
      { label: 'Carries', type: 'item', entries: (e.itemIds ?? []).map((i: string) => item(i, 'item-npc')), action: { label: '+ Give items…', run: () => openLinker('npc', e, 'items') } }
    ];
    if (sel.type === 'player') return [
      { label: 'Carries', type: 'item', entries: (e.itemIds ?? []).map((i: string) => item(i, 'item-player')), action: { label: '+ Give items…', run: () => openLinker('player', e) } }
    ];
    if (sel.type === 'scene') return [
      {
        label: 'NPCs here', type: 'npc',
        entries: npcs.filter((n) => n.sceneId === e._id).map((n) => ({ name: n.name, type: 'npc', remove: () => disconnect('npc-scene', n) })),
        action: { label: '+ Add NPCs…', run: () => openLinker('scene', e) }
      },
      {
        label: 'Items here', type: 'item',
        entries: items.filter((i) => i.sceneId === e._id).map((i) => ({ name: i.name, type: 'item', remove: () => disconnect('item-scene', i) })),
        action: { label: '+ Add items…', run: () => openLinker('scene', e, 'items') }
      }
    ];
    const holder =
      e.ownerPlayerId ? { name: playerMap[e.ownerPlayerId]?.name, type: 'player', kind: 'item-player', label: 'Owned by' }
      : e.ownerNpcId ? { name: npcMap[e.ownerNpcId]?.name, type: 'npc', kind: 'item-npc', label: 'Owned by' }
      : e.sceneId ? { name: sceneMap[e.sceneId]?.name, type: 'scene', kind: 'item-scene', label: 'Location' }
      : null;
    return [{
      label: holder?.label ?? 'Owner or location', type: holder?.type ?? 'player',
      entries: holder ? [{ name: holder.name ?? 'Unknown', type: holder.type, remove: () => disconnect(holder.kind, e) }] : [],
      action: { label: holder ? 'Change…' : 'Give / place…', run: () => openLinker('item', e) }
    }];
  }
</script>

<svelte:head>
  <title>{game ? `${game.name} · ` : ''}DnD Session Manager</title>
</svelte:head>

<main class="page">
  {#if loading}
    <p class="muted">Loading…</p>
  {:else if error}
    <a href="/my-games" class="back-link">← My games</a>
    <div class="alert alert-error" role="alert">{error}</div>
  {:else if game}
    <a href="/my-games" class="back-link">← My games</a>
    <header class="page-header">
      <div>
        <h1>{game.name}</h1>
        {#if game.description}<p class="muted lead">{game.description}</p>{/if}
      </div>
    </header>

    <div class="game-grid">
      <aside class="game-sidebar">
        <SidebarSessions
          {sessions}
          selectedSessionId={selectedSession?._id}
          on:createSession={() => goto(`/session/new?gameId=${id}`)}
          on:selectSession={e => selectedSession = enrichSessionEntities(e.detail)}
        />
      </aside>

      <section class="game-main">
        <div class="tab-bar">
          <div class="tabs" role="tablist" aria-label="Game content">
            {#each TABS as tab}
              <button
                class="tab"
                role="tab"
                data-type={tab.type}
                aria-selected={activeTab === tab.type}
                on:click={() => switchTab(tab.type)}
              >
                <span class="dot"></span>{tab.label}<span class="badge">{lists[tab.type].length}</span>
              </button>
            {/each}
          </div>
          <button class="btn btn-primary btn-sm new-btn" on:click={() => (creatingType = activeTab)}>
            + New {activeLabel.one}
          </button>
        </div>

        <div role="tabpanel">
          {#key activeTab}
            <EntityBrowser
              type={activeTab}
              entities={lists[activeTab]}
              {itemMap}
              {npcMap}
              {sceneMap}
              {playerMap}
              {allGroups}
              bind:groupFilter
              onOpen={(e) => (selectedEntity = { type: activeTab, entity: e })}
              onOpenMap={(e) => (fullscreenScene = e)}
              onNotes={(e) => openNotes(activeTab, e)}
              onDelete={(e) => deleteContent(activeTab, e)}
              onCreate={() => (creatingType = activeTab)}
              onLink={(e) => openLinker(activeTab, e)}
              onRemoveConnection={handleRemoveConnection}
              onSetGroup={setGroup}
              onBulkLink={bulkLink}
              onBulkDelete={bulkDelete}
            />
          {/key}
        </div>
      </section>
    </div>
  {/if}
</main>

{#if fullscreenScene}
  <SceneFullscreenView
    scene={fullscreenScene}
    npcs={npcs.filter((n) => n.sceneId === fullscreenScene._id)}
    items={items.filter((i) => i.sceneId === fullscreenScene._id)}
    {players}
    allNpcs={npcs}
    on:close={() => (fullscreenScene = null)}
    on:changed={fetchAllContent}
  />
{/if}

{#if selectedSession}
  {#key selectedSession._id}
    <SessionDetailsBox
      session={selectedSession}
      onClose={() => { selectedSession = null; }}
      onChanged={fetchSessions}
    />
  {/key}
{/if}

{#if creatingType}
  <Modal title={`New ${TABS.find(t => t.type === creatingType)?.one}`} onClose={() => (creatingType = null)}>
    <GameContentForm
      type={creatingType}
      gameId={id}
      groups={allGroups}
      defaultGroup={groupFilter && groupFilter !== '__none__' ? groupFilter : ''}
      on:created={() => { fetchAllContent(); creatingType = null; }}
      on:cancel={() => (creatingType = null)}
    />
  </Modal>
{/if}

{#if editing}
  <Modal title={`Edit ${editing.entity.name}`} onClose={() => (editing = null)}>
    <GameContentForm
      type={editing.type}
      gameId={id}
      entity={editing.entity}
      groups={allGroups}
      on:saved={() => { fetchAllContent(); editing = null; }}
      on:cancel={() => (editing = null)}
    />
  </Modal>
{/if}

{#if selectedEntity && !editing}
  {@const sel = selectedEntity}
  {@const e = sel.entity}
  <Modal title={e.name} onClose={() => (selectedEntity = null)}>
    <span slot="eyebrow" class="eyebrow type-eyebrow" data-type={sel.type}>
      <span class="dot"></span>{ONE[sel.type]}
      {#if e.group}<span class="badge group-badge">{e.group}</span>{/if}
    </span>
    <div class="stack-lg">
      {#if e.description}<p class="detail-desc">{e.description}</p>{/if}
      <dl class="detail-facts">
        {#each FIELDS[sel.type] as [key, label]}
          <div><dt>{label}</dt><dd class:faint={!e[key]}>{e[key] || '–'}</dd></div>
        {/each}
      </dl>
      {#each linksFor(sel) as link}
        <section class="stack link-section" data-type={link.type}>
          <div class="link-head">
            <h3 class="eyebrow">{link.label}</h3>
            {#if link.action}<button class="btn btn-outline btn-sm" on:click={link.action.run}>{link.action.label}</button>{/if}
          </div>
          <div class="row">
            {#each link.entries as entry}
              <span class="chip" data-type={entry.type}>
                <span class="dot"></span><span class="chip-label">{entry.name}</span>
                <button class="chip-remove" aria-label={`Remove ${entry.name}`} title="Remove link" on:click={entry.remove}>×</button>
              </span>
            {:else}
              <span class="faint small">None yet.</span>
            {/each}
          </div>
        </section>
      {/each}
      <section class="stack">
        <h3 class="eyebrow">Appears in {appearances.length} {appearances.length === 1 ? 'session' : 'sessions'}</h3>
        {#if appearances.length === 0}
          <span class="faint small">Not linked to any session yet.</span>
        {:else}
          <ul class="appearances">
            {#each showAllAppearances ? appearances : appearances.slice(0, 5) as s (s._id)}
              <li>
                <button class="appearance" on:click={() => { selectedEntity = null; selectedSession = enrichSessionEntities(s); }}>
                  <span class="title">{s.title}</span>
                  <span class="faint small">{formatSessionDate(s)}</span>
                </button>
              </li>
            {/each}
          </ul>
          {#if appearances.length > 5 && !showAllAppearances}
            <button class="btn btn-ghost btn-sm more" on:click={() => (showAllAppearances = true)}>Show all {appearances.length}</button>
          {/if}
        {/if}
      </section>
    </div>
    <svelte:fragment slot="footer">
      <button class="btn btn-danger" on:click={() => deleteContent(sel.type, e)}>Delete</button>
      <span class="spacer"></span>
      <button class="btn btn-ghost" on:click={() => openNotes(sel.type, e)}>Notes</button>
      <button class="btn btn-outline" on:click={() => (editing = { type: sel.type, entity: e })}>Edit</button>
      {#if sel.type === 'scene'}
        <button class="btn btn-primary" on:click={() => { fullscreenScene = e; selectedEntity = null; }}>Open map</button>
      {/if}
    </svelte:fragment>
  </Modal>
{/if}

{#if picker}
  <EntityPicker
    title={picker.title}
    candidates={picker.candidates}
    multiple={picker.multiple}
    suggestedIds={picker.suggestedIds}
    disabledIds={picker.disabledIds}
    confirmLabel={picker.confirmLabel}
    onConfirm={runPicker}
    onClose={() => (picker = null)}
  />
{/if}

{#if notesModal}
  <Modal title={`Notes · ${notesModal.name}`} onClose={() => (notesModal = null)}>
    <div class="stack-lg">
      {#if notesModal.error}<div class="alert alert-error" role="alert">{notesModal.error}</div>{/if}

      <form class="note-form card" on:submit|preventDefault={addNote}>
        <input class="input" type="text" placeholder="Title" bind:value={newNoteTitle} />
        <textarea class="input" rows="3" placeholder="What should you remember?" bind:value={newNoteText}></textarea>
        <div class="row-end">
          <button type="submit" class="btn btn-primary btn-sm" disabled={!newNoteTitle.trim() || !newNoteText.trim()}>Add note</button>
        </div>
      </form>

      {#if notesModal.loading}
        <p class="muted">Loading…</p>
      {:else if notesModal.notes.length === 0}
        <p class="faint small">No notes yet.</p>
      {:else}
        <ul class="note-list">
          {#each notesModal.notes as note (note._id)}
            <li class="note">
              {#if notesModal.editingNote?._id === note._id}
                <form class="stack" on:submit|preventDefault={updateNote}>
                  <input class="input" type="text" bind:value={notesModal.editingNote.title} />
                  <textarea class="input" rows="3" bind:value={notesModal.editingNote.text}></textarea>
                  <div class="row-end">
                    <button type="button" class="btn btn-ghost btn-sm" on:click={() => notesModal && (notesModal.editingNote = null)}>Cancel</button>
                    <button type="submit" class="btn btn-primary btn-sm">Save</button>
                  </div>
                </form>
              {:else}
                <div class="note-head">
                  <h3>{note.title}</h3>
                  <div class="row">
                    <button class="btn btn-ghost btn-sm" on:click={() => notesModal && (notesModal.editingNote = { ...note })}>Edit</button>
                    <button class="btn btn-danger btn-sm" on:click={() => deleteNote(note._id)}>Delete</button>
                  </div>
                </div>
                <p class="muted note-text">{note.text}</p>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </Modal>
{/if}

<style>
  /* Sidebar : content = 1 : φ² (≈ 27.6% / 72.4%) */
  .game-grid {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) minmax(0, 2.618fr);
    gap: var(--sp-6);
    align-items: start;
  }
  .game-sidebar {
    position: sticky;
    top: calc(var(--sp-7) + var(--sp-5));
    max-height: calc(100vh - var(--sp-7) - 2 * var(--sp-5));
    overflow-y: auto;
    scrollbar-width: thin;
  }
  .game-main {
    display: flex;
    flex-direction: column;
    gap: var(--sp-5);
    min-width: 0;
  }

  .tab-bar {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    border-bottom: 1px solid var(--border);
  }
  .tab-bar .tabs { flex: 1; border-bottom: none; }
  .new-btn { flex: none; }

  .type-eyebrow { display: inline-flex; align-items: center; gap: var(--sp-2); }
  .group-badge { margin-left: var(--sp-2); text-transform: none; letter-spacing: 0; }
  .detail-desc { white-space: pre-wrap; }
  .detail-facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(144px, 1fr));
    gap: var(--sp-4);
    margin: 0;
  }
  .detail-facts dt { font-size: var(--fs-xs); color: var(--text-faint); }
  .detail-facts dd { margin: 0; font-weight: 600; }
  .link-head { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); }
  .spacer { flex: 1; }

  .appearances { display: flex; flex-direction: column; gap: var(--sp-1); margin: 0; padding: 0; list-style: none; }
  .appearance {
    display: flex;
    justify-content: space-between;
    gap: var(--sp-4);
    width: 100%;
    padding: var(--sp-2) var(--sp-3);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: none;
    text-align: left;
    cursor: pointer;
  }
  .appearance:hover { background: var(--surface-2); }
  .appearance .title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .more { align-self: flex-start; }

  .note-form {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    padding: var(--sp-4);
    background: var(--surface-2);
  }
  .note-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-3);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .note {
    padding: var(--sp-4);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
  }
  .note-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
  }
  .note-head h3 { font-size: var(--fs-base); }
  .note-text { margin-top: var(--sp-2); white-space: pre-wrap; }

  @media (max-width: 987px) {
    .game-grid { grid-template-columns: 1fr; }
    .game-sidebar { position: static; order: 2; max-height: none; }
  }
  @media (max-width: 610px) {
    .tab-bar { flex-direction: column; align-items: stretch; gap: var(--sp-3); }
    .new-btn { order: -1; }
  }
</style>
