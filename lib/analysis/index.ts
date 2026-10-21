import './server-guard.ts';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  CompleteResponse,
  ErrorCode,
} from '../contracts/index.ts';
import {
  parseAnalyzeRequest,
  validateAnalyzeResponse,
  ContractBoundaryError,
} from '../contracts/index.ts';
import { isRecord } from '../contracts/schema.ts';
import { requireLoadedLibrary, selectReferences } from '../knowledge/index.ts';
import type { ReferenceLibrary } from '../knowledge/index.ts';
import type { ProviderAdapter } from './provider.ts';
import { AnalysisFailure, withinDeadline } from './failure.ts';
import type { SafeUsage } from './failure.ts';
import { getSimulation } from './simulation.ts';
import { resolveProviderExtraction } from './validate.ts';
import providerSchema from '../../contracts/provider-extraction.schema.json' with { type: 'json' };
import { CANDIDATE229_PROMPT_VERSION as PROMPT_VERSION, CANDIDATE229_SYSTEM_PROMPT as SYSTEM_PROMPT } from './prompt-candidate-v2.29.ts';
export { PROMPT_VERSION, SYSTEM_PROMPT };
export type { ProviderAdapter, ProviderConfig } from './provider.ts';
export interface AnalysisContext {
  signal: AbortSignal;
  mode: 'live' | 'simulation';
  provider: ProviderAdapter | null;
  library: ReferenceLibrary;
  timeoutMs?: number;
  onObservation?: (event: AnalysisObservation) => void;
}
export interface AnalysisObservation {
  requestId: string;
  revision: number;
  mode: 'live' | 'simulation';
  promptVersion: string;
  libraryVersion: string;
  modelId: string | null;
  status: 'complete' | 'incomplete';
  errorCode: ErrorCode | null;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  citationsResolved: number;
  questionsDropped: number;
}
const retryable = (code: ErrorCode) =>
  [
    'quota_exceeded',
    'provider_error',
    'timeout',
    'invalid_output',
    'invalid_citation',
    'cancelled',
  ].includes(code);
export async function analyze(
  input: AnalyzeRequest,
  context: AnalysisContext,
): Promise<AnalyzeResponse> {
  if (
    !isRecord(input) ||
    typeof input.requestId !== 'string' ||
    !/^[A-Za-z0-9_-]{8,64}$/.test(input.requestId) ||
    !Number.isSafeInteger(input.revision) ||
    input.revision < 1
  )
    throw new ContractBoundaryError();
  let onObservation: AnalysisContext['onObservation'];
  try {
    onObservation = context.onObservation;
  } catch {
    // Observation failures must not change analysis behavior.
  }
  // Keep in-flight settings stable when the caller reuses its context.
  context = {
    signal: context.signal,
    mode: context.mode,
    provider: context.provider,
    library: context.library,
    timeoutMs: context.timeoutMs,
    onObservation,
  };
  // Authored simulations retain their historical provenance; live uses the tested candidate.
  const promptVersion = context.mode === 'simulation' ? 'extract-v2.0' : PROMPT_VERSION;
  const timeoutMs = context.timeoutMs ?? 28000;
  const started = performance.now(),
    identity = {
      contractVersion: '2.0.0' as const,
      requestId: input.requestId,
      revision: input.revision,
    };
  let usage: SafeUsage = { inputTokens: null, outputTokens: null },
    citationsResolved = 0,
    questionsDropped = 0;
  let out: AnalyzeResponse;
  try {
    const parsed = parseAnalyzeRequest(input);
    if (!parsed.ok) throw new AnalysisFailure('invalid_input');
    const request = parsed.request;
    if (!['live', 'simulation'].includes(context.mode))
      throw new AnalysisFailure('configuration_unavailable');
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 53000)
      throw new AnalysisFailure('configuration_unavailable');
    requireLoadedLibrary(context.library);
    if (context.signal.aborted) throw new AnalysisFailure('cancelled');
    let extraction: CompleteResponse['extraction'];
    if (context.mode === 'simulation')
      extraction = getSimulation(request).extraction;
    else {
      const provider = context.provider;
      if (
        !provider ||
        typeof provider.modelId !== 'string' ||
        !provider.modelId.trim() ||
        provider.modelId.length > 120 ||
        typeof provider.region !== 'string' ||
        !provider.region.trim()
      )
        throw new AnalysisFailure('configuration_unavailable');
      const result = await withinDeadline(
        () =>
          provider.extract(
            {
              request,
              systemPrompt: SYSTEM_PROMPT,
              outputSchema: providerSchema,
              promptVersion,
            },
            context.signal,
          ),
        context.signal,
        timeoutMs,
      );
      usage = {
        inputTokens:
          Number.isSafeInteger(result.usage?.inputTokens) &&
          result.usage.inputTokens! >= 0
            ? result.usage.inputTokens
            : null,
        outputTokens:
          Number.isSafeInteger(result.usage?.outputTokens) &&
          result.usage.outputTokens! >= 0
            ? result.usage.outputTokens
            : null,
      };
      if (
        result.finishReason !== 'stop' ||
        typeof result.jsonText !== 'string' ||
        !result.jsonText.trim() ||
        new TextEncoder().encode(result.jsonText).byteLength > 96 * 1024
      )
        throw new AnalysisFailure('invalid_output', usage);
      let raw: unknown;
      try {
        raw = JSON.parse(result.jsonText);
      } catch {
        throw new AnalysisFailure('invalid_output', usage);
      }
      extraction = resolveProviderExtraction(raw, request);
    }
    const selected = selectReferences(
      extraction,
      context.library,
      request.locale,
      context.mode,
    );
    citationsResolved = [...extraction.actions, ...extraction.claims].reduce(
      (n, item) => n + item.citations.length,
      0,
    );
    const retained =
      selected.guidance === 'clarify_before_action'
        ? extraction.questions.slice(0, 2 - request.clarificationsUsed)
        : [];
    questionsDropped = extraction.questions.length - retained.length;
    extraction = { ...extraction, questions: retained };
    if (context.signal.aborted) throw new AnalysisFailure('cancelled', usage);
    if (performance.now() - started >= timeoutMs)
      throw new AnalysisFailure('timeout', usage);
    out = validateAnalyzeResponse(
      {
        ...identity,
        status: 'complete',
        mode: context.mode,
        extraction,
        ...selected,
        provenance: {
          modelId: context.mode === 'live' ? context.provider!.modelId : null,
          promptVersion,
          libraryVersion: context.library.libraryVersion,
        },
      },
      request,
      context.mode,
    );
  } catch (error) {
    const known =
      error instanceof AnalysisFailure ||
      error instanceof ContractBoundaryError;
    const code: ErrorCode = known
      ? error.errorCode
      : isRecord(error) && error.errorCode === 'configuration_unavailable'
        ? 'configuration_unavailable'
        : 'provider_error';
    if (
      error instanceof AnalysisFailure &&
      (error.usage.inputTokens !== null || error.usage.outputTokens !== null)
    )
      usage = error.usage;
    out = {
      ...identity,
      status: 'incomplete',
      errorCode: code,
      retryable: retryable(code),
    };
  }
  try {
    void Promise.resolve(
      context.onObservation?.({
        requestId: identity.requestId,
        revision: identity.revision,
        mode: context.mode,
        promptVersion,
        libraryVersion: context.library.libraryVersion,
        modelId:
          context.mode === 'simulation'
            ? null
            : (context.provider?.modelId ?? null),
        status: out.status,
        errorCode: out.status === 'incomplete' ? out.errorCode : null,
        latencyMs: Math.max(0, performance.now() - started),
        ...usage,
        citationsResolved,
        questionsDropped,
      }),
    ).catch(() => {});
  } catch {
    /* Telemetry cannot affect the product result. */
  }
  return out;
}
