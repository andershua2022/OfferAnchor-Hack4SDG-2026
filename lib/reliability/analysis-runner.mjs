const FAILURE_CODES = new Set(['provider_error', 'invalid_output', 'invalid_citation']);

export class AnalysisFailure extends Error {
  constructor(code) {
    const safeCode = FAILURE_CODES.has(code) ? code : 'provider_error';
    super(safeCode);
    this.name = 'AnalysisFailure';
    this.code = safeCode;
  }
}

const nativeClock = {
  now: () => performance.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
};

// The application must supply its own authorized request and synchronous validator.
export function createAnalysisRunner({
  onState = () => {}, clock = nativeClock, delayMs = 20_000, timeoutMs = 30_000,
} = {}) {
  if (typeof onState !== 'function' || !clock ||
      ['now', 'setTimeout', 'clearTimeout'].some((key) => typeof clock[key] !== 'function') ||
      !Number.isFinite(delayMs) || !Number.isFinite(timeoutMs) ||
      delayMs < 0 || timeoutMs <= delayMs) {
    throw new TypeError('Invalid runner configuration');
  }
  let state = { runId: 0, status: 'idle', reason: null, result: null };
  let sequence = 0;
  let active = null;
  let disposed = false;
  const getState = () => structuredClone(state);
  const notify = () => onState(getState());

  function clearTimers(run) {
    for (const timer of run.timers) clock.clearTimeout(timer);
    run.timers.length = 0;
  }

  function finish(run, status, reason, result = null) {
    if (active !== run) return;
    active = null;
    clearTimers(run);
    const terminal = { runId: run.id, status, reason, result };
    state = terminal;
    if (status !== 'completed') run.controller.abort();
    // Abort handlers may synchronously begin another run.
    if (state === terminal) notify();
  }

  function expired(run) {
    if (active !== run) return true;
    if (clock.now() - run.startedAt >= timeoutMs) {
      finish(run, 'incomplete', 'timeout');
      return true;
    }
    return false;
  }

  function fail(run, error, defaultCode) {
    if (expired(run)) return;
    const code = error instanceof AnalysisFailure && FAILURE_CODES.has(error.code)
      ? error.code : defaultCode;
    finish(run, 'incomplete', code);
  }

  function start({ request, validate }) {
    if (disposed) throw new Error('Runner is disposed');
    if (typeof request !== 'function' || typeof validate !== 'function') {
      throw new TypeError('A request and synchronous validator are required');
    }
    const previous = active;
    const run = {
      id: ++sequence, startedAt: clock.now(), controller: new AbortController(), timers: [],
    };
    active = run;
    state = { runId: run.id, status: 'processing', reason: null, result: null };
    if (previous) {
      clearTimers(previous);
      previous.controller.abort();
    }
    if (active !== run) return run.id;
    run.timers.push(clock.setTimeout(() => {
      if (expired(run)) return;
      state = { runId: run.id, status: 'delayed', reason: null, result: null };
      notify();
    }, delayMs));
    run.timers.push(clock.setTimeout(() => {
      if (active === run) finish(run, 'incomplete', 'timeout');
    }, timeoutMs));
    notify();
    if (active !== run) return run.id;
    try {
      // Invoke immediately; attach both handlers so late rejections are consumed.
      Promise.resolve(request({ signal: run.controller.signal })).then((output) => {
        if (expired(run)) return;
        let result;
        try {
          const validated = validate(output);
          if (!validated || typeof validated !== 'object' || Array.isArray(validated) ||
              typeof validated.then === 'function') {
            throw new AnalysisFailure('invalid_output');
          }
          result = structuredClone(validated);
        } catch (error) {
          fail(run, error, 'invalid_output');
          return;
        }
        // A slow validator or a suspended tab must not extend the total deadline.
        if (!expired(run)) finish(run, 'completed', null, result);
      }, (error) => fail(run, error, 'provider_error'));
    } catch (error) {
      fail(run, error, 'provider_error');
    }
    return run.id;
  }

  function cancel() {
    if (active) finish(active, 'incomplete', 'cancelled');
  }

  return {
    start, cancel, getState,
    dispose() {
      disposed = true;
      cancel();
    },
  };
}
