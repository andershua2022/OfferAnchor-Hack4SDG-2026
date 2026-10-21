const rules = [
  'contract', 'raw_schema', 'canonical_schema', 'citation_shape',
  'citation_resolution', 'citation_match', 'citation_limit', 'ids',
  'reference', 'chronology', 'claim', 'unknown', 'mechanism', 'question', 'policy',
] as const;
export type ContractRule = typeof rules[number];
export class ContractBoundaryError extends Error {
  readonly errorCode: 'invalid_output' | 'invalid_citation';
  readonly ruleId: ContractRule;
  constructor(
    errorCode: 'invalid_output' | 'invalid_citation' = 'invalid_output',
    ruleId: ContractRule = 'contract',
  ) {
    super('Contract boundary rejected data');
    this.name = 'ContractBoundaryError';
    this.errorCode = errorCode;
    // Fixed developer labels only; no source text, values, paths or IDs.
    this.ruleId = rules.includes(ruleId) ? ruleId : 'contract';
  }
}
export function requireContract(
  ok: unknown,
  code: 'invalid_output' | 'invalid_citation' = 'invalid_output',
  ruleId: ContractRule = 'contract',
): asserts ok {
  if (!ok) throw new ContractBoundaryError(code, ruleId);
}
