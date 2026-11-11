<script lang="ts">
  import { api } from '$lib/api';
  import Modal from '$lib/Modal.svelte';
  import { parseAiText, nameKey, type Draft, type EntityType } from './importParse';

  export let gameId: string;
  /** Current content, to spot names that already exist */
  export let existing: Record<EntityType, any[]>;
  export let allGroups: string[] = [];
  export let onClose: () => void;
  /** Called after import with how many of each type were created */
  export let onImported: (created: Record<EntityType, number>) => void;

  type Row = Draft & { include: boolean };
  const TYPES: [EntityType, string][] = [['npc', 'NPC'], ['item', 'Item'], ['scene', 'Scene'], ['player', 'Player']];

  let text = '';
  let rows: Row[] = [];
  let errors: string[] = [];
  let foundJson = false;
  let defaultGroup = '';
  let importing = false;
  let progress = 0;
  let result = '';
  let failures: string[] = [];

  // Re-parse only when the pasted text changes (not when `existing` refreshes after an import);
  // names that already exist start unticked
  function parse(t: string) {
    const r = parseAiText(t);
    errors = r.errors;
    foundJson = r.foundJson;
    rows = r.drafts.map((d) => ({ ...d, include: !isDuplicate(d.type, d.name, existing) }));
    result = '';
    failures = [];
  }
  $: parse(text);

  function isDuplicate(type: EntityType, name: string, ex: Record<EntityType, any[]>) {
    const key = nameKey(name);
    return (ex[type] ?? []).some((e) => nameKey(e.name) === key);
  }

  $: selected = rows.filter((r) => r.include && r.name.trim());
  $: counts = selected.reduce((m, r) => ({ ...m, [r.type]: (m[r.type] ?? 0) + 1 }), {} as Record<string, number>);

  async function pasteFromClipboard() {
    try {
      text = await navigator.clipboard.readText();
    } catch {
      result = 'Your browser blocked clipboard access. Paste with Ctrl+V instead.';
    }
  }

  async function runImport() {
    importing = true;
    progress = 0;
    failures = [];
    const created: Record<EntityType, number> = { npc: 0, item: 0, scene: 0, player: 0 };
    for (const r of selected) {
      const data = { name: r.name.trim(), description: r.description, group: (r.group || defaultGroup).trim(), ...r.fields };
      try {
        const res = await api('/api/game-content', { method: 'POST', body: JSON.stringify({ type: r.type, gameId, data }) });
        if (res.ok) created[r.type]++;
        else failures.push(`${r.name}: ${(await res.json().catch(() => ({}))).message ?? res.status}`);
      } catch {
        failures.push(`${r.name}: network error`);
      }
      progress++;
    }
    importing = false;
    const total = Object.values(created).reduce((a, b) => a + b, 0);
    result = `Imported ${total} ${total === 1 ? 'entry' : 'entries'}.`;
    // Untick what was created so a second click can't duplicate it
    rows = rows.map((r) => (selected.includes(r) && !failures.some((f) => f.startsWith(`${r.name}:`)) ? { ...r, include: false } : r));
    onImported(created);
  }

  const summary = (c: Record<string, number>) =>
    TYPES.filter(([t]) => c[t]).map(([t, label]) => `${c[t]} ${label}${c[t] === 1 ? '' : 's'}`).join(', ');
</script>

<Modal title="Import from an AI" {onClose} size="lg">
  <span slot="eyebrow" class="eyebrow">Paste the answer, check it, add it to your game</span>

  <div class="stack-lg">
    <div class="field">
      <div class="label-row">
        <label class="field-label" for="ai-answer">The AI's answer</label>
        <button type="button" class="btn btn-ghost btn-sm" on:click={pasteFromClipboard}>Paste from clipboard</button>
      </div>
      <textarea
        id="ai-answer"
        class="input answer"
        rows="7"
        placeholder={'Paste the whole reply from ChatGPT, Claude or Gemini. The app looks for the ```json block with NPCs, items, scenes or players.'}
        bind:value={text}
      ></textarea>
      <span class="hint">Tip: briefs made with "Share with AI" already ask the AI to end with an importable JSON block.</span>
    </div>

    {#each errors as e}<div class="alert alert-error" role="alert">{e} Ask the AI to "repeat the JSON block, valid JSON only".</div>{/each}
    {#if text.trim() && !foundJson}
      <div class="alert alert-info">No JSON found in this text. Ask the AI: "Give me that as a JSON block I can import."</div>
    {/if}

    {#if rows.length}
      <div class="row toolbar">
        <strong>{rows.length} found</strong>
        <label class="default-group">
          <span class="faint small">Group for rows without one</span>
          <input class="input" list="import-groups" maxlength="60" placeholder="e.g. Port Varrow" bind:value={defaultGroup} />
          <datalist id="import-groups">{#each allGroups as g}<option value={g}></option>{/each}</datalist>
        </label>
      </div>

      <div class="table" role="table" aria-label="Entries to import">
        <div class="tr th" role="row">
          <span role="columnheader"><input type="checkbox" aria-label="Select all" checked={rows.every((r) => r.include)} on:change={(e) => (rows = rows.map((r) => ({ ...r, include: e.currentTarget.checked })))} /></span>
          <span role="columnheader">Type</span>
          <span role="columnheader">Name</span>
          <span role="columnheader">Group</span>
          <span role="columnheader">Details</span>
        </div>
        {#each rows as r (r.key)}
          {@const dup = isDuplicate(r.type, r.name, existing)}
          <div class="tr" role="row" class:off={!r.include} data-type={r.type}>
            <span role="cell"><input type="checkbox" aria-label={`Import ${r.name}`} bind:checked={r.include} /></span>
            <span role="cell" class="type-cell">
              <span class="dot"></span>
              <select class="input input-sm" bind:value={r.type} aria-label="Type">
                {#each TYPES as [t, label]}<option value={t}>{label}</option>{/each}
              </select>
            </span>
            <span role="cell" class="name-cell">
              <input class="input input-sm" maxlength="200" bind:value={r.name} aria-label="Name" />
              {#if dup}<span class="badge exists" title="Something with this name already exists, so it is unticked">already exists</span>{/if}
            </span>
            <span role="cell"><input class="input input-sm" maxlength="60" list="import-groups" placeholder={defaultGroup || '–'} bind:value={r.group} aria-label="Group" /></span>
            <span role="cell" class="details" title={[...Object.values(r.fields), r.description].filter(Boolean).join('\n')}>
              {[...Object.values(r.fields), r.description].filter(Boolean).join(' · ') || '–'}
            </span>
          </div>
        {/each}
      </div>
    {/if}

    {#if result}
      <div class="alert alert-success" role="status">{result}</div>
    {/if}
    {#each failures as f}<div class="alert alert-error">{f}</div>{/each}
  </div>

  <svelte:fragment slot="footer">
    {#if importing}
      <span class="faint small count">Importing {progress} of {selected.length}…</span>
    {:else if selected.length}
      <span class="faint small count">{summary(counts)}</span>
    {/if}
    <button class="btn btn-ghost" on:click={onClose}>{result ? 'Done' : 'Cancel'}</button>
    <button class="btn btn-primary" disabled={importing || selected.length === 0} on:click={runImport}>
      Import {selected.length || ''}
    </button>
  </svelte:fragment>
</Modal>

<style>
  .label-row { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); }
  .answer { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: var(--fs-xs); }
  .toolbar { justify-content: space-between; }
  .default-group { display: flex; align-items: center; gap: var(--sp-3); }
  .default-group .input { width: 233px; min-height: var(--control-h-sm); }
  .table { display: flex; flex-direction: column; max-height: 377px; overflow-y: auto; }
  /* name : group : details roughly φ : 1 : φ */
  .tr {
    display: grid;
    grid-template-columns: 21px 120px minmax(0, 1.618fr) minmax(0, 1fr) minmax(0, 1.618fr);
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-1);
    border-bottom: 1px solid var(--border);
  }
  .tr.off { opacity: 0.5; }
  .th { font-size: var(--fs-xs); font-weight: 650; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.06em; position: sticky; top: 0; background: var(--surface); z-index: 1; }
  .tr input[type='checkbox'] { width: 15px; height: 15px; accent-color: var(--primary); }
  .input-sm { min-height: var(--control-h-sm); padding: 0 var(--sp-2); font-size: var(--fs-xs); }
  .type-cell { display: flex; align-items: center; gap: var(--sp-2); }
  .name-cell { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .exists { align-self: flex-start; background: rgba(242, 181, 82, 0.15); color: var(--warning); font-size: 11px; }
  .details { font-size: var(--fs-xs); color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .count { margin-right: auto; align-self: center; }
  @media (max-width: 610px) {
    .tr { grid-template-columns: 21px 96px minmax(0, 1fr); }
    .tr > :nth-child(4), .tr > :nth-child(5) { display: none; }
    .default-group { flex-direction: column; align-items: stretch; }
  }
</style>
