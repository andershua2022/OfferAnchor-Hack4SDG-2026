import assert from "node:assert/strict";
import { test } from "node:test";
import { briefBody, canExport, fixtures, initialState, inputWithinBounds, normalizeLines,
  previewFixture, previewReducer, protectedFooter, text } from "../../app/fixture-preview";

function loaded(id = "loan-en") {
  return previewReducer(initialState(), { type: "load", fixtureId: id });
}
function completed(id = "loan-en") {
  const state = previewReducer(loaded(id), { type: "start", requestId: "preview_test_001" });
  return previewReducer(state, { type: "finish", requestId: state.request.requestId,
    revision: state.request.revision, outcome: previewFixture(state.request) });
}

test("all eight registered cases return their exact authored response; only identity is rebased", () => {
  for (const fixture of fixtures) {
    const request = { ...structuredClone(fixture.request), requestId: "preview_rebased", revision: 99 };
    const outcome = previewFixture(request);
    assert.equal(outcome.status, "complete", fixture.fixtureId);
    if (outcome.status !== "complete") throw new Error("Missing authored fixture");
    assert.deepEqual(outcome.response, { ...fixture.response, requestId: request.requestId, revision: 99 });
    assert.equal(outcome.response.provenance.modelId, null);
    assert.equal(outcome.response.mode, "simulation");
  }
});

test("loan, prohibition and unknown remain different authored preview outcomes", () => {
  for (const [id, guidance] of [["loan-en", "pause_requested_action"], ["company-en", "no_personal_financial_request_identified"], ["missing-payer-en", "clarify_before_action"]]) {
    const state = completed(id);
    assert.equal(state.outcome?.status === "complete" && state.outcome.response.guidance, guidance);
    assert.ok(canExport(state));
  }
});

test("edited text, labels, IDs, kinds, order, locale and question counter never get a canned success", () => {
  const request = loaded().request;
  const variants = [
    { ...request, locale: "zh-Hant-HK" }, { ...request, clarificationsUsed: 1 },
    { ...request, evidence: [...request.evidence].reverse() },
    ...["text", "label", "id", "kind", "sequence"].map(field => ({ ...request, evidence: request.evidence.map((e, i) =>
      i === 0 ? { ...e, [field]: field === "sequence" ? 2 : field === "kind" ? "offer" : field === "id" ? "E8" : `${e[field as "text" | "label"]} ` } : e) }))
  ];
  for (const variant of variants) assert.equal(previewFixture(variant).status, "incomplete");
  const edited = { ...request, evidence: request.evidence.map((e, i) => i === 0 ? { ...e, text: e.text + " " } : e) };
  assert.deepEqual(previewFixture(edited), { status: "incomplete", errorCode: "simulation_unsupported", retryable: false });
  const propertyReordered = { ...request, evidence: request.evidence.map(e => ({ text: e.text, sequence: e.sequence, label: e.label, kind: e.kind, id: e.id })) };
  assert.equal(previewFixture(propertyReordered).status, "complete");
});

test("UTF-16, total, source, body and malformed-surrogate input bounds are enforced without truncation", () => {
  const request = loaded("missing-payer-en").request;
  const withText = (value: string) => ({ ...request, evidence: [{ ...request.evidence[0], text: value }] });
  assert.ok(inputWithinBounds(withText("🙂".repeat(2000))));
  for (const value of ["🙂".repeat(2001), " ", "\ud800", "\udc00"]) assert.equal(previewFixture(withText(value)).status, "incomplete");
  const many = (count: number, size: number) => ({ ...request, evidence: Array.from({ length: count }, (_, i) => ({
    ...request.evidence[0], id: `E${i + 1}`, sequence: i + 1, text: "a".repeat(size)
  })) });
  assert.ok(inputWithinBounds(many(3, 4000)));
  assert.equal(inputWithinBounds(many(4, 3001)), false);
  assert.equal(inputWithinBounds(many(9, 1)), false);
  assert.equal(inputWithinBounds({ ...request, evidence: [{ ...request.evidence[0], kind: "user_note" }] }), false);
  assert.equal(inputWithinBounds({ ...request, evidence: [{ ...request.evidence[0], label: "🙂".repeat(61) }] }), false);
  assert.equal(normalizeLines("a\r\nb\r\nc"), "a\nb\nc");
});

test("evidence or locale edits immediately discard the brief and reject retired results", () => {
  for (const event of [
    { type: "edit" as const, id: "E2", field: "text" as const, value: "Fictional changed instruction" },
    { type: "locale" as const, locale: "zh-Hant-HK" }, { type: "delete" as const, id: "E1" }
  ]) {
    const current = completed();
    const edited = previewReducer(current, event);
    assert.equal(canExport(edited), false); assert.equal(edited.body, ""); assert.equal(protectedFooter(edited), "");
    assert.equal(edited.request.revision, current.request.revision + 1);
    assert.equal(previewReducer(edited, { type: "finish", requestId: current.request.requestId,
      revision: current.request.revision, outcome: current.outcome! }), edited);
  }
});

test("superseded and duplicate completions cannot initialize an edited body or consume questions", () => {
  let state = loaded("missing-payer-en");
  state = previewReducer(state, { type: "start", requestId: "preview_old_run" });
  const oldRequest = structuredClone(state.request);
  state = previewReducer(state, { type: "start", requestId: "preview_new_run" });
  const stale = { type: "finish" as const, requestId: oldRequest.requestId, revision: oldRequest.revision, outcome: previewFixture(oldRequest) };
  assert.equal(previewReducer(state, stale), state);
  const event = { type: "finish" as const, requestId: state.request.requestId, revision: state.request.revision, outcome: previewFixture(state.request) };
  state = previewReducer(state, event);
  assert.equal(state.request.clarificationsUsed, 1); assert.equal(state.displayedQuestions.length, 1);
  state = previewReducer(state, { type: "body", value: "Fictional edited body" });
  assert.equal(previewReducer(state, event), state);
  const switched = previewReducer(state, { type: "locale", locale: "zh-Hant-HK" });
  assert.equal(switched.request.clarificationsUsed, 1);
});

test("source deletion never reuses evidence IDs; seeded loads and clear are deliberate new sessions", () => {
  let state = loaded("funding-note-en");
  assert.equal(state.request.clarificationsUsed, 1);
  state = previewReducer(state, { type: "delete", id: "E2" });
  state = previewReducer(state, { type: "add", kind: "reply", label: "Fictional reply", value: "Fictional test reply" });
  assert.equal(state.request.evidence.at(-1)?.id, "E3");
  while (state.nextEvidenceId <= 8) state = previewReducer(state, { type: "add", kind: "reply", label: "Fictional reply", value: "Fictional test reply" });
  state = previewReducer(state, { type: "delete", id: "E3" });
  assert.equal(previewReducer(state, { type: "add", kind: "reply", label: "Fictional reply", value: "extra" }), state);
  assert.deepEqual(previewReducer(state, { type: "clear" }), initialState());
});

test("full and short exports share the locked footer; quote omission retains claims, unknowns and mode", () => {
  for (const id of ["loan-en", "company-zh", "task-denial-en"]) {
    let state = completed(id);
    assert.ok(state.outcome?.status === "complete");
    if (state.outcome?.status !== "complete") throw new Error("No fixture");
    const response = state.outcome.response;
    const body = briefBody(response, state.request.locale, false);
    assert.ok(!body.includes("[0:"));
    for (const unknown of state.outcome.response.extraction.unknowns) assert.ok(body.includes(unknown.issue));
    for (const claim of state.outcome.response.extraction.claims) assert.ok(body.includes(claim.status));
    state = previewReducer(state, { type: "body", value: body });
    const footer = protectedFooter(state);
    for (const token of ["2.2", "2.0.0", "simulation", "draft-0.2.0", "edited: true", text(state.request.locale, "brief.boundary")]) assert.ok(footer.includes(token));
    for (const unknown of response.extraction.unknowns) assert.ok(footer.includes(unknown.issue));
  }
});

test("incomplete preview retires result and draft; UI locales never silently fall back", () => {
  let state = completed();
  state = previewReducer(state, { type: "edit", id: "E2", field: "text", value: "Fictional unmatched instruction" });
  state = previewReducer(state, { type: "start", requestId: "preview_unmatched" });
  state = previewReducer(state, { type: "finish", requestId: state.request.requestId, revision: state.request.revision, outcome: previewFixture(state.request) });
  assert.equal(state.phase, "incomplete"); assert.equal(state.active, null); assert.equal(canExport(state), false); assert.equal(state.body, "");
  assert.throws(() => text("en-HK", "missing.key")); assert.throws(() => text("unknown", "app.name"));
});
