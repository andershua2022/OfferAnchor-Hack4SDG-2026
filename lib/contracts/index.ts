import {selectPolicyReferences} from './policy.ts';
import type { AnalyzeRequest, AnalyzeResponse } from './generated.ts';
import { schemas, matchesSchema, isRecord } from './schema.ts';
import {
  validateCanonicalExtraction,
  validateCitationShapes,
} from './semantic.ts';
import { requireContract } from './errors.ts';
import content from '../../knowledge/library.json' with { type: 'json' };
export type * from './generated.ts';
export { ContractBoundaryError } from './errors.ts';
export function parseAnalyzeRequest(
  value: unknown,
):
  | { ok: true; request: AnalyzeRequest }
  | { ok: false; errorCode: 'invalid_input' } {
  const failed = { ok: false, errorCode: 'invalid_input' } as const;
  try {
    if (!matchesSchema(value, schemas['analyze-request.schema.json']))
      return failed;
    const request = value as AnalyzeRequest;
    if (
      new TextEncoder().encode(JSON.stringify(request)).byteLength >
      96 * 1024
    )
      return failed;
    if (
      new Set(request.evidence.map((e) => e.id)).size !==
        request.evidence.length ||
      new Set(request.evidence.map((e) => e.sequence)).size !==
        request.evidence.length
    )
      return failed;
    if (
      !request.evidence.some((e) =>
        ['instruction', 'reply'].includes(e.kind),
      ) ||
      request.evidence.some((e) => !e.text.trim())
    )
      return failed;
    if (request.evidence.reduce((sum, e) => sum + e.text.length, 0) > 12000)
      return failed;
    return { ok: true, request: structuredClone(request) };
  } catch {
    return failed;
  }
}
export function validateAnalyzeResponse(
  value: unknown,
  request: AnalyzeRequest,
  expectedMode: 'live' | 'simulation',
): AnalyzeResponse {
  if (isRecord(value) && value.status === 'complete')
    validateCitationShapes(value.extraction, 'canonical');
  requireContract(
    parseAnalyzeRequest(request).ok &&
      matchesSchema(value, schemas['analyze-response.schema.json']),
  );
  const out = value as AnalyzeResponse;
  requireContract(
    out.requestId === request.requestId && out.revision === request.revision,
  );
  if (out.status === 'incomplete') {
    requireContract(
      out.retryable ===
        [
          'quota_exceeded',
          'provider_error',
          'timeout',
          'invalid_output',
          'invalid_citation',
          'cancelled',
        ].includes(out.errorCode),
    );
    return structuredClone(out);
  }
  requireContract(out.mode === expectedMode);
  requireContract(
    (out.mode === 'simulation' ? out.provenance.promptVersion === 'extract-v2.0' : ['extract-v2.11', 'extract-v2.12', 'extract-v2.13', 'extract-v2.14', 'extract-v2.15', 'extract-v2.16', 'extract-v2.17', 'extract-v2.18', 'extract-v2.19', 'extract-v2.20', 'extract-v2.21', 'extract-v2.22', 'extract-v2.23', 'extract-v2.24', 'extract-v2.25', 'extract-v2.28', 'extract-v2.29'].includes(out.provenance.promptVersion)) &&
      out.provenance.libraryVersion === content.libraryVersion,
  );
  requireContract(
    out.mode === 'simulation'
      ? out.provenance.modelId === null
      : typeof out.provenance.modelId === 'string' &&
          !!out.provenance.modelId.trim(),
  );
  validateCanonicalExtraction(out.extraction, request);
  requireContract(
    out.extraction.questions.length <= 2 - request.clarificationsUsed,
  );
  requireContract(
    out.guidance === 'clarify_before_action' ||
      out.extraction.questions.length === 0,
  );
  requireContract(
    new Set(out.referenceIds).size === out.referenceIds.length &&
      new Set(out.routeIds).size === out.routeIds.length,
  );
  requireContract(
    out.referenceIds.every((id) => content.cards.some((c) => c.id === id)) &&
      out.routeIds.every((id) => content.routes.some((r) => r.id === id)),
  );
  const selected = selectPolicyReferences(out.extraction, content.cards);
  requireContract(out.guidance === selected.guidance &&
    JSON.stringify(out.referenceIds) === JSON.stringify(selected.referenceIds) &&
    JSON.stringify(out.routeIds) === JSON.stringify(selected.routeIds), 'invalid_output', 'policy');
  return structuredClone(out);
}
