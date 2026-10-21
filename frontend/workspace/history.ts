import type { AnalyzeRequest, CompleteResponse } from "../../lib/contracts/index.ts";
import { canExport, initialState, previewFixture, previewReducer, type PreviewState } from "../../app/fixture-preview";

export type SavedCheck = {
  version: 1; id: string; title: string; savedAt: string; request: AnalyzeRequest;
  response: CompleteResponse; body: string; includeQuotes: boolean; nextEvidenceId: number;
};

const STORAGE_KEY = "offeranchor.preview.saved-checks.v1";
function storageKey(profileId?:string):string { if(profileId===undefined)return STORAGE_KEY; if(profileId!=="demo_alex"&&profileId!=="demo_sam"&&!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(profileId))throw new TypeError("Unknown profile"); return STORAGE_KEY+"."+(profileId.startsWith("demo_")?profileId:"account."+profileId.toLowerCase()); }
const MAX_RECORDS = 20, MAX_BODY = 40_000, MAX_RECORD_BYTES = 128 * 1024;
const validText = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 &&
  value.length <= max && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value);
const validBody = (value: unknown) => typeof value === "string" && value.length <= MAX_BODY && !Array.from(value).some(c => { const n = c.codePointAt(0)!; return n >= 0xD800 && n <= 0xDFFF; });
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const stable = (value: unknown): string => JSON.stringify(value, (_key, item) => {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item;
  return Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]]));
});
const errorMessage = "Saved checks are unavailable in this browser.";

function canonicalResponse(request: AnalyzeRequest): CompleteResponse | null {
  try {
    const outcome = previewFixture(request);
    return outcome.status === "complete" && outcome.response.mode === "simulation" &&
      outcome.response.provenance.modelId === null ? outcome.response : null;
  } catch { return null; }
}

export function createSnapshot(state: PreviewState, analyzedRequest: AnalyzeRequest, title: string): SavedCheck {
  const expected = canonicalResponse(analyzedRequest);
  if (!expected || !canExport(state) || state.outcome?.status !== "complete" || !validText(title, 120) ||
    state.phase !== "complete" || state.request.requestId !== analyzedRequest.requestId ||
    state.request.revision !== analyzedRequest.revision ||
    state.request.clarificationsUsed !== analyzedRequest.clarificationsUsed + state.displayedQuestions.length ||
    stable({ ...state.request, clarificationsUsed: analyzedRequest.clarificationsUsed }) !== stable(analyzedRequest) ||
    stable(state.outcome.response) !== stable(expected) || typeof state.includeQuotes !== "boolean" ||
    !validBody(state.body) || !Number.isInteger(state.nextEvidenceId) ||
    state.nextEvidenceId < Math.max(0, ...analyzedRequest.evidence.map(e => Number(e.id.slice(1)))) + 1 || state.nextEvidenceId > 9) {
    throw new TypeError("Only a current registered simulation can be saved.");
  }
  return {
    version: 1, id: `saved_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    title: title.trim(), savedAt: new Date().toISOString(), request: structuredClone(analyzedRequest),
    response: structuredClone(expected), body: state.body, includeQuotes: state.includeQuotes,
    nextEvidenceId: state.nextEvidenceId,
  };
}

export function restoreSnapshot(value: unknown): { record: SavedCheck; state: PreviewState } | null {
  try {
    if (!isRecord(value) || value.version !== 1 ||
      Object.keys(value).sort().join(",") !== "body,id,includeQuotes,nextEvidenceId,request,response,savedAt,title,version" ||
      typeof value.id !== "string" || !validText(value.id, 64) || !/^[A-Za-z0-9_-]{8,64}$/.test(value.id) ||
      !validText(value.title, 120) || typeof value.savedAt !== "string" || value.savedAt.length > 30 ||
      !Number.isFinite(Date.parse(value.savedAt)) || Date.parse(value.savedAt) > Date.now() + 5 * 60_000 ||
      !validBody(value.body) || typeof value.includeQuotes !== "boolean" ||
      !Number.isInteger(value.nextEvidenceId) || (value.nextEvidenceId as number) < Math.max(0, ...(value.request as AnalyzeRequest).evidence.map(e => Number(e.id.slice(1)))) + 1 ||
      (value.nextEvidenceId as number) > 9 ||
      new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_RECORD_BYTES) return null;

    const request = value.request as AnalyzeRequest, response = value.response as CompleteResponse;
    const expected = canonicalResponse(request);
    if (!expected || stable(response) !== stable(expected)) return null;

    const record = value as unknown as SavedCheck;
    const seed: PreviewState = { ...initialState(), request: structuredClone(request) };
    const started = previewReducer(seed, { type: "start", requestId: request.requestId, now: 0 });
    const completed = previewReducer(started, {
      type: "finish", requestId: request.requestId, revision: request.revision,
      outcome: { status: "complete", response: structuredClone(response) }, now: 1,
    });
    if (!canExport(completed) || completed.request.clarificationsUsed !==
      request.clarificationsUsed + completed.displayedQuestions.length) return null;
    const quoted = completed.includeQuotes === record.includeQuotes ? completed :
      previewReducer(completed, { type: "quotes", value: record.includeQuotes });
    const restored = previewReducer(quoted, { type: "body", value: record.body });
    return canExport(restored) ? { record: structuredClone(record), state: {
      ...restored, nextEvidenceId: record.nextEvidenceId,
    } } : null;
  } catch { return null; }
}

export function readDeviceHistory(profileId?:string): { records: SavedCheck[]; error: string | null } {
  try {
    const raw = globalThis.localStorage.getItem(storageKey(profileId));
    if (raw === null) return { records: [], error: null };
    if (raw.length > MAX_RECORDS * MAX_RECORD_BYTES) return { records: [], error: errorMessage };
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return { records: [], error: errorMessage };
    const restored = value.slice(0, MAX_RECORDS).map(restoreSnapshot);
    const records = restored.flatMap(item => item ? [item.record] : []);
    return { records, error: records.length === value.length ? null : errorMessage };
  } catch { return { records: [], error: errorMessage }; }
}

export function writeDeviceHistory(records: SavedCheck[], profileId?:string): { ok: boolean; error: string | null } {
  try {
    const safe = records.slice(0, MAX_RECORDS);
    if (safe.some(record => !restoreSnapshot(record))) return { ok: false, error: errorMessage };
    globalThis.localStorage.setItem(storageKey(profileId), JSON.stringify(safe));
    return { ok: true, error: null };
  } catch { return { ok: false, error: errorMessage }; }
}
