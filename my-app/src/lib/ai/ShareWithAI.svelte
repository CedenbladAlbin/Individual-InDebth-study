<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api';
  import Modal from '$lib/Modal.svelte';
  import {
    PRESETS, buildPack, campaignGroups, estimateTokens, taskContext,
    type CampaignExport, type PresetId, type Scope
  } from './contextPack';

  export let gameId: string;
  export let onClose: () => void;
  /** Open with a scope already chosen, e.g. from a session */
  export let initialScope: Scope = { kind: 'all' };
  /** Switch to "Import from an AI" to bring the answer back */
  export let onImport: () => void = () => {};

  const AIS = [
    { id: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/', prefill: (q: string) => `https://chatgpt.com/?q=${q}` },
    { id: 'claude', label: 'Claude', url: 'https://claude.ai/new', prefill: (q: string) => `https://claude.ai/new?q=${q}` },
    { id: 'gemini', label: 'Gemini', url: 'https://gemini.google.com/app', prefill: null }
  ];
  /** Above this many tokens, free AI plans often refuse or truncate the paste */
  const LARGE = 60000;
  /** Longest pack we put in a URL; longer ones go through the clipboard */
  const MAX_URL = 6000;

  let data: CampaignExport | null = null;
  let error = '';

  let presetId: PresetId = 'codm';
  let scopeKind: Scope['kind'] = initialScope.kind;
  let sessionId = initialScope.kind === 'session' ? initialScope.sessionId : '';
  let sceneId = initialScope.kind === 'scene' ? initialScope.sceneId : '';
  let group = initialScope.kind === 'group' ? initialScope.group : '';
  let sessionCount = 10;
  let includeSecrets = true;
  let task = '';
  let taskEdited = false;
  let status = '';

  onMount(async () => {
    const res = await api(`/api/games/${gameId}/export`);
    if (!res.ok) {
      error = 'Could not load the campaign.';
      return;
    }
    data = await res.json();
    const sessions = [...(data?.sessions ?? [])].reverse();
    if (!sessionId) sessionId = sessions.find((s) => s.isEnded)?._id ?? sessions[0]?._id ?? '';
    if (!sceneId) sceneId = data?.scenes[0]?._id ?? '';
    if (!group) group = campaignGroups(data!)[0] ?? '';
    applyPreset(presetId);
  });

  $: scope = (
    scopeKind === 'session' ? { kind: 'session', sessionId }
    : scopeKind === 'scene' ? { kind: 'scene', sceneId }
    : scopeKind === 'group' ? { kind: 'group', group }
    : { kind: 'all' }
  ) as Scope;

  /** Fill the task from the preset (and the chosen scope), unless the user has written their own */
  function applyPreset(id: PresetId, force = true) {
    if (!data) return;
    const preset = PRESETS.find((p) => p.id === id)!;
    if (force || !taskEdited) {
      task = preset.task(taskContext(data, scope));
      taskEdited = false;
    }
    if (force) includeSecrets = preset.secrets;
  }
  // Keep the preset text in sync with the scope while the user hasn't edited it
  $: if (data && scope && !taskEdited) applyPreset(presetId, false);

  $: pack = data ? buildPack(data, { scope, sessionCount, includeSecrets, task }) : '';
  $: tokens = estimateTokens(pack);
  $: groups = data ? campaignGroups(data) : [];
  $: sessionsDesc = data ? [...data.sessions].reverse() : [];
  $: scenesSorted = data ? [...data.scenes].sort((a, b) => a.name.localeCompare(b.name)) : [];

  async function copy() {
    try {
      await navigator.clipboard.writeText(pack);
    } catch {
      // Fallback for browsers that block the async clipboard API
      const ta = document.createElement('textarea');
      ta.value = pack;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    status = 'Copied. Paste it into your AI chat with Ctrl+V.';
  }

  async function openIn(ai: (typeof AIS)[number]) {
    await copy();
    const q = encodeURIComponent(pack);
    if (ai.prefill && q.length <= MAX_URL) {
      window.open(ai.prefill(q), '_blank', 'noopener');
      status = `Opened ${ai.label} with the brief filled in. It's also on your clipboard.`;
    } else {
      window.open(ai.url, '_blank', 'noopener');
      status = `Opened ${ai.label}. The brief is on your clipboard: paste it with Ctrl+V.`;
    }
  }

  function download() {
    const slug = (data?.game.name ?? 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const blob = new Blob([pack], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}-${presetId}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    status = 'Downloaded. You can attach the file in most AI chats.';
  }
</script>

<Modal title="Share with an AI" {onClose} size="lg">
  <span slot="eyebrow" class="eyebrow">Your own AI chat, no cost in this app</span>

  {#if error}
    <div class="alert alert-error" role="alert">{error}</div>
  {:else if !data}
    <p class="muted">Preparing your campaign…</p>
  {:else}
    <div class="layout">
      <div class="controls stack-lg">
        <p class="hint">
          The app writes a brief with your campaign data, rules for the AI and a task. Paste it into ChatGPT, Claude, Gemini or an AI browser extension.
          Nothing is sent anywhere until you paste it.
        </p>

        <fieldset class="field">
          <legend class="field-label">What do you need help with?</legend>
          <div class="presets">
            {#each PRESETS as p}
              <button type="button" class="preset" aria-pressed={presetId === p.id} on:click={() => { presetId = p.id; applyPreset(p.id); }}>{p.label}</button>
            {/each}
          </div>
        </fieldset>

        <div class="field">
          <span class="field-label">What should the AI know about?</span>
          <select class="input" bind:value={scopeKind} aria-label="Scope">
            <option value="all">The whole campaign</option>
            <option value="session" disabled={!sessionsDesc.length}>One session</option>
            <option value="scene" disabled={!scenesSorted.length}>One scene</option>
            <option value="group" disabled={!groups.length}>One group (city, clan, region…)</option>
          </select>
          {#if scopeKind === 'session'}
            <select class="input" bind:value={sessionId} aria-label="Session">
              {#each sessionsDesc as s (s._id)}<option value={s._id}>{s.title}</option>{/each}
            </select>
          {:else if scopeKind === 'scene'}
            <select class="input" bind:value={sceneId} aria-label="Scene">
              {#each scenesSorted as s (s._id)}<option value={s._id}>{s.name}</option>{/each}
            </select>
          {:else if scopeKind === 'group'}
            <select class="input" bind:value={group} aria-label="Group">
              {#each groups as g}<option value={g}>{g}</option>{/each}
            </select>
          {/if}
        </div>

        {#if scopeKind !== 'session'}
          <label class="field">
            <span class="field-label">Sessions to include</span>
            <select class="input" bind:value={sessionCount}>
              <option value={3}>The 3 most recent</option>
              <option value={10}>The 10 most recent</option>
              <option value={25}>The 25 most recent</option>
              <option value={0}>All of them</option>
            </select>
          </label>
        {/if}

        <label class="toggle">
          <input type="checkbox" bind:checked={includeSecrets} />
          <span>
            <strong>Include DM secrets</strong>
            <span class="hint">Secrets, mysteries and private notes. Turn off before sharing with players.</span>
          </span>
        </label>

        <label class="field">
          <span class="field-label">Task for the AI <span class="faint">(edit freely)</span></span>
          <textarea class="input" rows="6" bind:value={task} on:input={() => (taskEdited = true)}></textarea>
        </label>
      </div>

      <div class="preview-col">
        <div class="preview-head">
          <span class="field-label">Preview</span>
          <span class="faint small">≈ {tokens.toLocaleString()} tokens · {pack.length.toLocaleString()} characters</span>
        </div>
        {#if tokens > LARGE}
          <div class="alert alert-info">This is long. Free AI plans may cut it off: choose one group, scene or fewer sessions.</div>
        {/if}
        <!-- Plain text on the page, so AI browser extensions can read it too -->
        <pre class="preview" aria-label="Brief for the AI">{pack}</pre>
      </div>
    </div>
  {/if}

  <svelte:fragment slot="footer">
    {#if status}<span class="status small" role="status">{status}</span>{/if}
    <button class="btn btn-ghost" on:click={onImport} title="Bring the AI's new NPCs, items or scenes back into the game">⤓ Import answer…</button>
    <button class="btn btn-ghost" disabled={!pack} on:click={download}>Download .md</button>
    {#each AIS as ai}
      <button class="btn btn-outline" disabled={!pack} on:click={() => openIn(ai)}>Open {ai.label}</button>
    {/each}
    <button class="btn btn-primary" disabled={!pack} on:click={copy}>Copy</button>
  </svelte:fragment>
</Modal>

<style>
  /* Controls : preview = 1 : φ */
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.618fr);
    gap: var(--sp-5);
    align-items: start;
  }
  fieldset { margin: 0; padding: 0; border: none; min-width: 0; }
  legend { padding: 0; margin-bottom: var(--sp-2); }
  .presets { display: flex; flex-wrap: wrap; gap: var(--sp-2); }
  .preset {
    padding: var(--sp-2) var(--sp-3);
    border: 1px solid var(--border-strong);
    border-radius: var(--r-pill);
    background: none;
    color: var(--text-muted);
    font-size: var(--fs-xs);
    font-weight: 600;
    cursor: pointer;
  }
  .preset:hover { color: var(--text); }
  .preset[aria-pressed='true'] { border-color: var(--primary-text); background: var(--primary-soft); color: var(--text); }
  .field select + select { margin-top: var(--sp-2); }
  .toggle { display: flex; align-items: flex-start; gap: var(--sp-3); cursor: pointer; }
  .toggle input { width: 16px; height: 16px; margin-top: 3px; accent-color: var(--primary); }
  .toggle span { display: flex; flex-direction: column; }
  .preview-col { display: flex; flex-direction: column; gap: var(--sp-3); min-width: 0; }
  .preview-head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--sp-3); }
  .preview {
    margin: 0;
    max-height: min(55vh, 610px);
    overflow: auto;
    padding: var(--sp-4);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg);
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: var(--fs-xs);
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .status { margin-right: auto; color: var(--success-text); align-self: center; }

  @media (max-width: 987px) {
    .layout { grid-template-columns: 1fr; }
  }
</style>
