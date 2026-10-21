import './server-guard.ts';
import type { AnalyzeRequest } from '../contracts/index.ts';
import { isRecord } from '../contracts/schema.ts';
import { AnalysisFailure, withinDeadline } from './failure.ts';
import type { SafeUsage } from './failure.ts';
export interface ProviderConfig {
  apiBaseUrl: string;
  apiKey: string;
  modelId: string;
  region: string;
  responseMode: 'json_object' | 'json_schema';
  maxOutputTokens: number;
  timeoutMs: number;
  temperature: number | null;
  thinkingBudget?: number;
}
export interface ProviderAdapter {
  readonly modelId: string;
  readonly region: string;
  readonly maxRequestsPerExtraction?: 1 | 2;
  extract(
    input: {
      request: AnalyzeRequest;
      systemPrompt: string;
      outputSchema: object;
      promptVersion: string;
      auditCandidate?: unknown;
    },
    signal: AbortSignal,
  ): Promise<{
    jsonText: string;
    finishReason: 'stop' | 'length' | 'refusal' | 'other';
    usage: SafeUsage;
    latencyMs: number;
  }>;
}
export class ProviderConfigurationError extends Error {
  readonly errorCode = 'configuration_unavailable';
  constructor() {
    super('Provider configuration is unavailable');
    this.name = 'ProviderConfigurationError';
  }
}
function requireConfig(ok: unknown): asserts ok {
  if (!ok) throw new ProviderConfigurationError();
}
const regionNames: Record<string, string[]> = {
  'ap-southeast-1': ['singapore', 'ap-southeast-1'],
  'cn-beijing': ['beijing', 'cn-beijing', 'china (beijing)'],
  'cn-hongkong': ['hong kong', 'hongkong', 'cn-hongkong', 'hong kong (china)'],
  'ap-northeast-1': ['tokyo', 'ap-northeast-1', 'japan (tokyo)'],
  'us-east-1': ['virginia', 'us (virginia)', 'us-east-1'],
  'eu-central-1': ['frankfurt', 'germany (frankfurt)', 'eu-central-1'],
};
// User-supplied candidate gateway. Protocol, authentication and routing need
// an explicitly authorized account probe; this is not a domain-wide trust rule.
const candidateGatewayHost =
  'st8tp3ajl0df3n8b8l8qu.apigateway-cn-beijing.volceapi.com';
function checkedConfig(value: ProviderConfig): ProviderConfig {
  try {
    requireConfig(isRecord(value) && (Object.keys(value).length === 8 || Object.keys(value).length === 9 && Object.hasOwn(value, 'thinkingBudget')));
    requireConfig(
      typeof value.apiKey === 'string' &&
        /^[\x21-\x7e]{1,2048}$/.test(value.apiKey),
    );
    requireConfig(
      typeof value.modelId === 'string' &&
        // Model IDs enter public provenance and safe observations.
        value.modelId !== value.apiKey &&
        /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,119}$/.test(value.modelId),
    );
    requireConfig(
      typeof value.region === 'string' &&
        !!value.region.trim() &&
        value.region.length <= 80,
    );
    requireConfig(
      value.responseMode === 'json_object' ||
        value.responseMode === 'json_schema',
    );
    requireConfig(
      Number.isSafeInteger(value.maxOutputTokens) &&
        value.maxOutputTokens >= 1 &&
        value.maxOutputTokens <= 8192,
    );
    requireConfig(
      Number.isSafeInteger(value.timeoutMs) &&
        value.timeoutMs >= 1 &&
        value.timeoutMs <= 50000,
    );
    requireConfig(
      value.temperature === null ||
        (typeof value.temperature === 'number' &&
          Number.isFinite(value.temperature) &&
          value.temperature >= 0 &&
          value.temperature <= 2),
    );
    if (Object.hasOwn(value, 'thinkingBudget')) {
      requireConfig(typeof value.thinkingBudget === 'number' && Number.isSafeInteger(value.thinkingBudget) && value.thinkingBudget >= 128 && value.thinkingBudget <= 2048 && /^qwen3\.8-(?:max|flash)(?:-0902|-2026-09-02)?$/.test(value.modelId));
    }
    const url = new URL(value.apiBaseUrl);
    requireConfig(
      url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        !url.href.includes('?') &&
        !url.href.includes('#') &&
        !url.port,
    );
    if (url.hostname === 'api.deepseek.com') {
      requireConfig(
        ['', '/', '/v1', '/v1/'].includes(url.pathname) &&
          value.responseMode === 'json_object' &&
          value.region === 'not_verified',
      );
      return { ...value, apiBaseUrl: url.href.replace(/\/$/, '') };
    }
    if (url.hostname === candidateGatewayHost) {
      requireConfig(
        ['/v1', '/v1/'].includes(url.pathname) &&
          value.responseMode === 'json_object' &&
          value.region === 'not_verified',
      );
      return { ...value, apiBaseUrl: url.href.replace(/\/$/, '') };
    }
    requireConfig(url.pathname.replace(/\/$/, '') === '/compatible-mode/v1');
    const legacy: Record<string, string> = {
      'dashscope-intl.aliyuncs.com': 'ap-southeast-1',
      'dashscope.aliyuncs.com': 'cn-beijing',
      'cn-hongkong.dashscope.aliyuncs.com': 'cn-hongkong',
      'dashscope-us.aliyuncs.com': 'us-east-1',
    };
    const region =
      legacy[url.hostname] ??
      /^([a-z0-9][a-z0-9-]*)\.(ap-southeast-1|cn-beijing|cn-hongkong|ap-northeast-1|us-east-1|eu-central-1)\.maas\.aliyuncs\.com$/.exec(
        url.hostname,
      )?.[2];
    requireConfig(
      region && regionNames[region].includes(value.region.toLowerCase()),
    );
    if (value.responseMode === 'json_schema')
      requireConfig(
        (region !== 'ap-southeast-1' && /^qwen-plus(?:-|$)/.test(value.modelId)) ||
          (region === 'cn-beijing' && value.modelId === 'qwen3.8-max'),
      );
    return { ...value, apiBaseUrl: url.href.replace(/\/$/, '') };
  } catch {
    throw new ProviderConfigurationError();
  }
}
async function boundedBody(
  response: Response,
  signal: AbortSignal,
): Promise<string> {
  if (!response.body) throw new AnalysisFailure('invalid_output');
  const reader = response.body.getReader(),
    decoder = new TextDecoder('utf-8', { fatal: true });
  const cancelBody = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener('abort', cancelBody, { once: true });
  if (signal.aborted) cancelBody();
  let count = 0,
    text = '';
  try {
    for (;;) {
      let item: ReadableStreamReadResult<Uint8Array>;
      try {
        item = await reader.read();
      } catch {
        throw new AnalysisFailure('provider_error');
      }
      if (signal.aborted) throw new AnalysisFailure('cancelled');
      if (item.done) break;
      count += item.value.byteLength;
      if (count > 512 * 1024)
        throw new AnalysisFailure('invalid_output');
      try {
        text += decoder.decode(item.value, { stream: true });
      } catch {
        throw new AnalysisFailure('invalid_output');
      }
    }
    if (signal.aborted) throw new AnalysisFailure('cancelled');
    try {
      return text + decoder.decode();
    } catch {
      throw new AnalysisFailure('invalid_output');
    }
  } finally {
    signal.removeEventListener('abort', cancelBody);
    cancelBody();
    reader.releaseLock();
  }
}
export function createProviderAdapter(config: ProviderConfig): ProviderAdapter {
  const cfg = checkedConfig(config),
    host = new URL(cfg.apiBaseUrl).hostname;
  return Object.freeze({
    modelId: cfg.modelId,
    region: cfg.region,
    async extract(
      input: Parameters<ProviderAdapter['extract']>[0],
      signal: AbortSignal,
    ) {
      const started = performance.now(),
        controller = new AbortController();
      const cancel = () => controller.abort();
      signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) cancel();
      const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
      try {
        return await withinDeadline(
          async () => {
            const responseFormat =
              cfg.responseMode === 'json_object'
                ? { type: 'json_object' }
                : {
                    type: 'json_schema',
                    json_schema: {
                      name: 'offeranchor_extraction',
                      strict: true,
                      schema: input.outputSchema,
                    },
                  };
            const body = {
              model: cfg.modelId,
              stream: false,
              n: 1,
              max_tokens: cfg.maxOutputTokens,
              response_format: responseFormat,
              ...(cfg.temperature === null
                ? {}
                : { temperature: cfg.temperature }),
              ...(host === 'api.deepseek.com'
                ? { thinking: { type: 'disabled' } }
                : host.endsWith('.aliyuncs.com') &&
                    cfg.modelId.startsWith('qwen')
                  ? { enable_thinking: false }
                  : {}),
              ...(host === candidateGatewayHost &&
              cfg.modelId === 'deepseek-v4-flash'
                ? { thinking: { type: 'disabled' } }
                : host === candidateGatewayHost &&
                    ['glm-5.3-flash', 'glm-5.3'].includes(cfg.modelId)
                  ? { reasoning_effort: 'low' }
                  : host === candidateGatewayHost &&
                      cfg.modelId === 'qwen3.8-max'
                    ? { enable_thinking: false }
                    : {}),
              ...(cfg.thinkingBudget === undefined ? {} : { enable_thinking: true, thinking_budget: cfg.thinkingBudget }),
              messages: [
                {
                  role: 'system',
                  content:
                    input.systemPrompt +
                    '\nRequired output JSON schema:\n' +
                    JSON.stringify(input.outputSchema),
                },
                {
                  role: 'user',
                  content: JSON.stringify({
                    locale: input.request.locale,
                    remainingQuestions: 2 - input.request.clarificationsUsed,
                    evidence: input.request.evidence,
                    ...(input.auditCandidate === undefined
                      ? {}
                      : { auditCandidate: input.auditCandidate }),
                  }),
                },
              ],
            };
            const response = await fetch(cfg.apiBaseUrl + '/chat/completions', {
              method: 'POST',
              redirect: 'error',
              headers: {
                Authorization: 'Bearer ' + cfg.apiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
              signal: controller.signal,
              cache: 'no-store',
            });
            if (!response.ok) {
              void response.body?.cancel().catch(() => {});
              throw new AnalysisFailure('provider_error');
            }
            const wireText = await boundedBody(response, controller.signal);
            let data: unknown;
            try {
              data = JSON.parse(wireText);
            } catch {
              throw new AnalysisFailure('invalid_output');
            }
            if (!isRecord(data)) throw new AnalysisFailure('invalid_output');
            const token = (v: unknown) =>
              typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
                ? v
                : null;
            const usage = {
              inputTokens: token(
                isRecord(data.usage) ? data.usage.prompt_tokens : null,
              ),
              outputTokens: token(
                isRecord(data.usage) ? data.usage.completion_tokens : null,
              ),
            };
            if (
              !Array.isArray(data.choices) ||
              data.choices.length !== 1 ||
              !isRecord(data.choices[0])
            )
              throw new AnalysisFailure('invalid_output', usage);
            const choice = data.choices[0];
            if (!isRecord(choice.message))
              throw new AnalysisFailure('invalid_output', usage);
            if (choice.message.tool_calls || choice.message.function_call)
              throw new AnalysisFailure('invalid_output', usage);
            const finishReason: 'stop' | 'length' | 'refusal' | 'other' =
              choice.message.refusal ||
              ['content_filter', 'refusal'].includes(
                String(choice.finish_reason),
              )
                ? 'refusal'
                : choice.finish_reason === 'stop'
                  ? 'stop'
                  : choice.finish_reason === 'length'
                    ? 'length'
                    : 'other';
            return {
              jsonText:
                typeof choice.message.content === 'string'
                  ? choice.message.content
                  : '',
              finishReason,
              usage,
              latencyMs: performance.now() - started,
            };
          },
          signal,
          cfg.timeoutMs,
        );
      } catch (e) {
        if (signal.aborted) throw new AnalysisFailure('cancelled');
        if (
          controller.signal.aborted ||
          performance.now() - started >= cfg.timeoutMs
        )
          throw new AnalysisFailure('timeout');
        if (e instanceof AnalysisFailure) throw e;
        throw new AnalysisFailure('provider_error');
      } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', cancel);
        controller.abort();
      }
    },
  });
}
