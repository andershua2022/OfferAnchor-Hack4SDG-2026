import type { ErrorCode } from '../contracts/index.ts';
export interface SafeUsage {
  inputTokens: number | null;
  outputTokens: number | null;
}
export class AnalysisFailure extends Error {
  readonly errorCode: ErrorCode;
  readonly usage: SafeUsage;
  constructor(
    code: ErrorCode,
    usage: SafeUsage = { inputTokens: null, outputTokens: null },
  ) {
    super('Analysis did not complete');
    this.name = 'AnalysisFailure';
    this.errorCode = code;
    this.usage = usage;
  }
}
export async function withinDeadline<T>(
  operation: () => Promise<T>,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<T> {
  if (signal.aborted) throw new AnalysisFailure('cancelled');
  const started = performance.now();
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (error: unknown, value?: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      if (error) reject(error);
      else resolve(value!);
    };
    const cancel = () => finish(new AnalysisFailure('cancelled'));
    const timer = setTimeout(
      () => finish(new AnalysisFailure('timeout')),
      timeoutMs,
    );
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) {
      cancel();
      return;
    }
    Promise.resolve()
      .then(() => {
        if (settled || signal.aborted) throw new AnalysisFailure('cancelled');
        return operation();
      })
      .then(
        (value) => {
          if (signal.aborted) finish(new AnalysisFailure('cancelled'));
          else if (performance.now() - started >= timeoutMs)
            finish(new AnalysisFailure('timeout'));
          else finish(null, value);
        },
        (error) => finish(error),
      );
  });
}
