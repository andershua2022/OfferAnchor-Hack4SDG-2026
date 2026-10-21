import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyze } from '../../lib/analysis/index.ts';
import { createProviderAdapter, ProviderConfigurationError } from '../../lib/analysis/provider.ts';
import { parseAnalyzeRequest, validateAnalyzeResponse } from '../../lib/contracts/index.ts';
import { loadReferenceLibrary } from '../../lib/knowledge/index.ts';

// Portable consumer check: no project credentials, probe, historical prompts or private toolchain.
const root = new URL('../../', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const manifest = read('tests/analysis/module-handoff.json');
const content = read('knowledge/library.json');
const library = loadReferenceLibrary(content, {
  'en-HK': read('locales/en-HK.json'),
  'zh-Hant-HK': read('locales/zh-Hant-HK.json'),
});
const registry = read('examples/simulation-fixtures.json');
const originalFetch = globalThis.fetch;
let fetchAttempts = 0;
globalThis.fetch = () => { fetchAttempts++; throw Error('Offline consumer check forbids network'); };
after(() => { globalThis.fetch = originalFetch; assert.equal(fetchAttempts, 0); });

function request() { return read('examples/request-personal-loan.json'); }
function context(extra = {}) {
  return { mode: 'simulation', provider: null, library, signal: new AbortController().signal, ...extra };
}
function fictionalProvider(jsonText = JSON.stringify(read('examples/provider-extraction-personal-loan.json'))) {
  let calls = 0;
  const adapter = {
    modelId: 'FICTIONAL_CONSUMER_CHECK_ONLY', region: 'not_verified',
    async extract() {
      calls++;
      return { jsonText, finishReason: 'stop', usage: { inputTokens: 12, outputTokens: 34 }, latencyMs: 1 };
    },
  };
  return { adapter, calls: () => calls };
}
function fictionalApprovedLibrary() {
  const copy = structuredClone(content);
  // Fictional test-only metadata. Never save this copy or treat it as human approval.
  for (const item of [...copy.cards, ...copy.routes]) {
    item.approvalStatus = 'approved';
    item.humanReviewer = 'FICTIONAL_CONSUMER_CHECK_ONLY';
    item.localizedMeaningApproved = true;
  }
  return loadReferenceLibrary(copy, {
    'en-HK': read('locales/en-HK.json'), 'zh-Hant-HK': read('locales/zh-Hant-HK.json'),
  });
}
function explicitDraftLibrary() {
  const copy=structuredClone(content);copy.status='draft';
  for(const item of [...copy.cards,...copy.routes]){
    item.approvalStatus='draft';item.humanReviewer=null;item.localizedMeaningApproved=false;
  }
  return loadReferenceLibrary(copy,{'en-HK':read('locales/en-HK.json'),'zh-Hant-HK':read('locales/zh-Hant-HK.json')});
}

test('Producer handoff stays pinned with explicit content and generation-only consumer overlays', async () => {
  const overlay=read('tests/analysis/approved-content-overlay-2026-10-17.json');
  const {inspectApprovedContentOverlay}=await import('../../tools/check-team-integration.mjs');
  const audit=inspectApprovedContentOverlay();
  const mismatches=[];
  for (const entry of [...manifest.moduleFiles, ...manifest.sharedDependencies]) {
    const bytes = readFileSync(new URL(entry.path, root));
    if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)mismatches.push(entry.path);
  }
  assert.deepEqual(mismatches.sort(),['knowledge/library.json','lib/analysis/index.ts','lib/analysis/provider.ts','lib/contracts/index.ts','locales/en-HK.json']);
  const promptOverlay=read('tests/analysis/runtime-prompt-overlay-2026-10-19-loan-funding.json'),index=readFileSync(new URL('lib/analysis/index.ts',root),'utf8');
  assert.equal(createHash('sha256').update(index).digest('hex'),promptOverlay.indexAfterSha256);
  let producerIndex=index.replace(promptOverlay.newImport,promptOverlay.oldImport);
  for(const patch of promptOverlay.indexRuntimePatches??[])producerIndex=producerIndex.replace(patch.after,patch.before);
  assert.equal(createHash('sha256').update(producerIndex).digest('hex'),promptOverlay.indexBeforeSha256);
  assert.equal(promptOverlay.indexBeforeSha256,manifest.moduleFiles.find(x=>x.path==='lib/analysis/index.ts').sha256);
  assert.equal(createHash('sha256').update(readFileSync(new URL(promptOverlay.candidateFile,root))).digest('hex'),promptOverlay.candidateSha256);
  const active=await import('../../lib/analysis/index.ts');assert.equal(active.PROMPT_VERSION,promptOverlay.activePromptVersion);
  for(const [path,sha256] of Object.entries(promptOverlay.deploymentGenerationAdapter.files))assert.equal(createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex'),sha256);
  assert.equal(promptOverlay.deploymentGenerationAdapter.id,'source-context-roles-events-1.3.0');
  assert.equal(promptOverlay.deploymentGenerationAdapter.sourceAuditVersion,'context-audit-1.8.0');
  assert.equal(promptOverlay.deploymentGenerationAdapter.maxRawRequestsPerExtraction,2);
  const providerOverlay=promptOverlay.providerInputAuditOverlay;let providerSource=readFileSync(new URL(providerOverlay.path,root),'utf8');assert.equal(createHash('sha256').update(providerSource).digest('hex'),providerOverlay.afterSha256);for(const patch of providerOverlay.patches)providerSource=providerSource.replace(patch.after,patch.before);assert.equal(createHash('sha256').update(providerSource).digest('hex'),providerOverlay.beforeSha256);assert.equal(providerOverlay.beforeSha256,manifest.moduleFiles.find(x=>x.path===providerOverlay.path).sha256);
  const boundary=promptOverlay.responseBoundary,contractSource=readFileSync(new URL(boundary.path,root),'utf8');assert.equal(createHash('sha256').update(contractSource).digest('hex'),boundary.afterSha256);assert.equal(createHash('sha256').update(contractSource.replace(boundary.newExpression,boundary.oldExpression)).digest('hex'),boundary.beforeSha256);assert.equal(boundary.beforeSha256,manifest.moduleFiles.find(x=>x.path===boundary.path).sha256);
  assert.deepEqual(Object.keys(overlay.files).sort(),['knowledge/library.json','locales/en-HK.json','locales/zh-Hant-HK.json']);
  assert.deepEqual(audit.changedFiles,['knowledge/library.json','locales/en-HK.json','locales/zh-Hant-HK.json']);
  assert.equal(audit.approvedLocaleChanges,1);
  assert.equal(manifest.contractVersion, '2.0.0');
  assert.equal(manifest.activePromptVersion, 'extract-v2.11');
  assert.equal(manifest.simulationPromptVersion, 'extract-v2.0');
});

test('Browser contract entry works without importing the server-only analysis entry', () => {
  const source = `globalThis.window = {}; const m = await import('./lib/contracts/index.ts');
    const r = m.parseAnalyzeRequest(null); if (r.ok || r.errorCode !== 'invalid_input') process.exit(2);`;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: fileURLToPath(root), encoding: 'utf8', timeout: 10000,
  });
  assert.equal(child.status, 0, child.stderr);
});

for (const fixture of registry.fixtures) {
  test(`Consumer simulation: ${fixture.fixtureId} returns the exact authored output with new identity`, async () => {
    const raw = read('examples/' + fixture.requestFile);
    raw.requestId = 'consumer_smoke_20261011';
    raw.revision = 37;
    const parsed = parseAnalyzeRequest(raw);
    assert.equal(parsed.ok, true);
    const out = await analyze(parsed.request, context());
    const expected = read('examples/' + fixture.responseFile);
    expected.requestId = raw.requestId;
    expected.revision = raw.revision;
    assert.deepEqual(out, expected);
    assert.deepEqual(validateAnalyzeResponse(out, parsed.request, 'simulation'), out);
    assert.equal(out.provenance.modelId, null);
  });
}

test('Unmatched input returns bound incomplete; it never becomes a fixture success', async () => {
  const input = request(); input.evidence[0].text += ' ';
  const out = await analyze(input, context());
  assert.deepEqual(out, { contractVersion: '2.0.0', requestId: input.requestId,
    revision: input.revision, status: 'incomplete', errorCode: 'simulation_unsupported', retryable: false });
});

test('Invalid body is rejected by the parser before the HTTP owner calls analyze', () => {
  for (const input of [null, {}, { ...request(), requestId: '?' }])
    assert.deepEqual(parseAnalyzeRequest(input), { ok: false, errorCode: 'invalid_input' });
});

test('Explicit draft selected guidance stays incomplete even with a structurally valid fictional provider', async () => {
  const provider = fictionalProvider();
  const draft=explicitDraftLibrary();
  assert.equal(draft.status,'draft');
  const out = await analyze(request(), context({ mode: 'live', provider: provider.adapter,library:draft }));
  assert.equal(provider.calls(), 1);
  assert.equal(out.status, 'incomplete');
  assert.equal(out.errorCode, 'configuration_unavailable');
  assert.deepEqual(read('knowledge/library.json'), content);
});

test('The same entry completes with fictional provider and fictional content approval, preserving safe usage', async () => {
  const provider = fictionalProvider(); const observations = [];
  const input = request();
  const out = await analyze(input, context({ mode: 'live', provider: provider.adapter,
    library: fictionalApprovedLibrary(), onObservation: (event) => observations.push(event) }));
  assert.equal(provider.calls(), 1);
  assert.equal(out.status, 'complete');
  assert.equal(out.guidance, 'pause_requested_action');
  assert.equal(out.provenance.modelId, 'FICTIONAL_CONSUMER_CHECK_ONLY');
  validateAnalyzeResponse(out, input, 'live');
  assert.equal(observations.length, 1);
  assert.equal(observations[0].inputTokens, 12);
  assert.equal(observations[0].outputTokens, 34);
  assert.ok(!Object.hasOwn(out, 'raw'));
  assert.deepEqual(read('knowledge/library.json'), content);
});

test('Abort before analysis prevents even a fictional provider attempt', async () => {
  const provider = fictionalProvider(); const abort = new AbortController(); abort.abort();
  const out = await analyze(request(), context({ mode: 'live', provider: provider.adapter, signal: abort.signal }));
  assert.equal(provider.calls(), 0);
  assert.equal(out.status, 'incomplete'); assert.equal(out.errorCode, 'cancelled');
});

test('Provider exception becomes a bound safe error without private text', async () => {
  const input = request(); let calls = 0;
  const provider = { modelId: 'FICTIONAL_CONSUMER_CHECK_ONLY', region: 'not_verified',
    async extract() { calls++; throw Error('FICTIONAL_PRIVATE_ERROR_MUST_NOT_LEAK'); } };
  const out = await analyze(input, context({ mode: 'live', provider }));
  assert.equal(calls, 1);
  assert.deepEqual(out, { contractVersion: '2.0.0', requestId: input.requestId,
    revision: input.revision, status: 'incomplete', errorCode: 'provider_error', retryable: true });
});

test('A consumer validating a previous revision cannot accept it as current', async () => {
  const input = request(); const out = await analyze(input, context());
  assert.throws(() => validateAnalyzeResponse(out, { ...input, revision: input.revision + 1 }, 'simulation'),
    (error) => error.errorCode === 'invalid_output');
});


test('Misplaced credential is rejected before it can become public model provenance', () => {
  const fictionalKey = 'FICTIONAL_CREDENTIAL_FOR_CONFIG_REGRESSION';
  for (const [apiBaseUrl, region] of [
    ['https://dashscope-intl.aliyuncs.com/compatible-mode/v1', 'Singapore'],
    ['https://api.deepseek.com/v1', 'not_verified'],
    ['https://st8tp3ajl0df3n8b8l8qu.apigateway-cn-beijing.volceapi.com/v1', 'not_verified'],
  ]) assert.throws(() => createProviderAdapter({
    apiBaseUrl, region, apiKey: fictionalKey, modelId: fictionalKey,
    responseMode: 'json_object', maxOutputTokens: 3000, timeoutMs: 25000, temperature: null,
  }), (error) => error instanceof ProviderConfigurationError &&
      error.errorCode === 'configuration_unavailable' && !error.message.includes(fictionalKey));
});
