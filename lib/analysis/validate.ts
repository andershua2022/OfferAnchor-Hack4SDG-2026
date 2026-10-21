import type {
  AnalyzeRequest,
  ProviderExtraction,
  CanonicalExtraction,
} from '../contracts/index.ts';
import { schemas, matchesSchema } from '../contracts/schema.ts';
import { requireContract } from '../contracts/errors.ts';
import {
  validateCanonicalExtraction,
  validateCitationShapes,
} from '../contracts/semantic.ts';
export function resolveProviderExtraction(
  value: unknown,
  request: AnalyzeRequest,
): CanonicalExtraction {
  validateCitationShapes(value, 'raw');
  requireContract(
    matchesSchema(value, schemas['provider-extraction.schema.json']),
    'invalid_output', 'raw_schema',
  );
  const raw = structuredClone(value) as ProviderExtraction;
  const evidence = new Map(request.evidence.map((e) => [e.id, e.text]));
  const resolve = (
    cite: ProviderExtraction['actions'][number]['citations'][number],
  ) => {
    const source = evidence.get(cite.evidenceId);
    requireContract(source !== undefined, 'invalid_citation', 'citation_resolution');
    let from = 0,
      pos = -1;
    for (let count = 0; count < cite.occurrence; count++) {
      pos = source.indexOf(cite.quote, from);
      requireContract(pos >= 0, 'invalid_citation', 'citation_resolution');
      from = pos + 1;
    }
    return {
      evidenceId: cite.evidenceId,
      quote: cite.quote,
      start: pos,
      end: pos + cite.quote.length,
    };
  };
  const out = {
    ...raw,
    actions: raw.actions.map((a) => ({
      ...a,
      citations: a.citations.map(resolve),
    })),
    claims: raw.claims.map((c) => ({
      ...c,
      citations: c.citations.map(resolve),
    })),
  };
  return validateCanonicalExtraction(out, request);
}
