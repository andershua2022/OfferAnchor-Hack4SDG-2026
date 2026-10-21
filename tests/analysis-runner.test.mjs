import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AnalysisFailure,
  createAnalysisRunner,
} from '../lib/reliability/analysis-runner.mjs';

const validOutput = () => ({
  fixture_label: 'test_only',
  fixture_key: 'example',
  evidence_ids: ['E1'],
});

// Test-only fixture validation; this is not the OfferAnchor extraction contract.
function validateFixtureResult(value) {
  const expectedKeys = ['fixture_label', 'evidence_ids', 'fixture_key'];
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Reflect.ownKeys(value).length !== expectedKeys.length ||
      expectedKeys.some((key) => !Object.hasOwn(value, key)) ||
      value.fixture_label !== 'test_only' || value.fixture_key !== 'example' ||
      !Array.isArray(value.evidence_ids) || value.evidence_ids.length === 0 ||
      value.evidence_ids.some((id) => typeof id !== 'string' || !id) ||
      new Set(value.evidence_ids).size !== value.evidence_ids.length) {
    throw new AnalysisFailure('invalid_output');
  }
  if (value.evidence_ids.some((id) => id !== 'E1')) {
    throw new AnalysisFailure('invalid_citation');
  }
  return {
    fixture_label: 'test_only', fixture_key: 'example', evidence_ids: [...value.evidence_ids],
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function fakeClock() {
  let time = 0;
  let nextId = 0;
  const timers = new Map();
  return {
    now: () => time,
    setTimeout(fn, ms) {
      const id = ++nextId;
      timers.set(id, { at: time + ms, fn });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    advance(ms, { fire = true } = {}) {
      time += ms;
      if (!fire) return;
      while (true) {
        const due = [...timers.entries()]
          .filter(([, timer]) => timer.at <= time)
          .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!due) return;
        timers.delete(due[0]);
        due[1].fn();
      }
    },
    pending: () => timers.size,
  };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

function runnerWith(clock, onState = () => {}) {
  return createAnalysisRunner({ clock, onState });
}

test('start immediately publishes processing and returns a distinct numeric run ID', () => {
  const clock = fakeClock();
  const states = [];
  const runner = runnerWith(clock, (state) => states.push(state));
  assert.deepEqual(runner.getState(), { runId: 0, status: 'idle', reason: null, result: null });
  const id = runner.start({ request: () => new Promise(() => {}), validate: validateFixtureResult });
  assert.equal(typeof id, 'number');
  assert.deepEqual(runner.getState(), { runId: id, status: 'processing', reason: null, result: null });
  assert.deepEqual(states, [{ runId: id, status: 'processing', reason: null, result: null }]);
  states[0].status = 'tampered';
  const snapshot = runner.getState();
  snapshot.status = 'tampered';
  assert.equal(runner.getState().status, 'processing');
  runner.dispose();
});

test('a never-settling provider delays at 20 seconds and times out at 30 seconds', () => {
  const clock = fakeClock();
  let signal;
  const runner = runnerWith(clock);
  runner.start({
    request: ({ signal: requestSignal }) => {
      signal = requestSignal;
      return new Promise(() => {});
    },
    validate: validateFixtureResult,
  });
  clock.advance(19_999);
  assert.equal(runner.getState().status, 'processing');
  clock.advance(1);
  assert.equal(runner.getState().status, 'delayed');
  clock.advance(9_999);
  assert.equal(runner.getState().status, 'delayed');
  clock.advance(1);
  assert.deepEqual({ ...runner.getState(), runId: 0 }, {
    runId: 0, status: 'incomplete', reason: 'timeout', result: null,
  });
  assert.equal(signal.aborted, true);
  assert.equal(clock.pending(), 0);
});

test('a validated result completes before the deadline and clears timers', async () => {
  const clock = fakeClock();
  const runner = runnerWith(clock);
  const expected = validOutput();
  runner.start({ request: () => Promise.resolve(validOutput()), validate: validateFixtureResult });
  await settle();
  assert.deepEqual({ ...runner.getState(), runId: 0 }, {
    runId: 0, status: 'completed', reason: null, result: expected,
  });
  assert.equal(clock.pending(), 0);
  clock.advance(31_000);
  assert.equal(runner.getState().status, 'completed');
});

test('deadline still wins when the provider settles before overdue timers are delivered', async () => {
  const clock = fakeClock();
  const answer = deferred();
  let signal;
  const runner = runnerWith(clock);
  runner.start({
    request: ({ signal: requestSignal }) => {
      signal = requestSignal;
      return answer.promise;
    },
    validate: validateFixtureResult,
  });
  clock.advance(30_000, { fire: false });
  answer.resolve(validOutput());
  await settle();
  assert.equal(runner.getState().status, 'incomplete');
  assert.equal(runner.getState().reason, 'timeout');
  assert.equal(runner.getState().result, null);
  assert.equal(signal.aborted, true);
  clock.advance(0);
  assert.equal(runner.getState().reason, 'timeout');
});

test('a validator crossing the deadline cannot publish a completed result', async () => {
  const clock = fakeClock();
  let signal;
  const runner = runnerWith(clock);
  runner.start({
    request: ({ signal: requestSignal }) => {
      signal = requestSignal;
      return Promise.resolve(validOutput());
    },
    validate: (output) => {
      clock.advance(30_000, { fire: false });
      return validateFixtureResult(output);
    },
  });
  await settle();
  assert.equal(runner.getState().status, 'incomplete');
  assert.equal(runner.getState().reason, 'timeout');
  assert.equal(runner.getState().result, null);
  assert.equal(signal.aborted, true);
  assert.equal(clock.pending(), 0);
});

test('completed result snapshots cannot change stored evidence or later observations', async () => {
  const clock = fakeClock();
  const observed = [];
  const runner = runnerWith(clock, (state) => observed.push(state));
  const providerOutput = validOutput();
  runner.start({ request: () => Promise.resolve(providerOutput), validate: validateFixtureResult });
  await settle();
  const snapshot = runner.getState();
  snapshot.result.fixture_label = 'safe';
  snapshot.result.evidence_ids.push('invented');
  const completedObservation = observed.find((state) => state.status === 'completed');
  completedObservation.result.fixture_key = 'untrusted';
  completedObservation.result.evidence_ids.length = 0;
  providerOutput.evidence_ids.push('provider mutation');
  assert.deepEqual(runner.getState().result, validOutput());
});

test('a result arriving after timeout cannot replace the incomplete state', async () => {
  const clock = fakeClock();
  const answer = deferred();
  const runner = runnerWith(clock);
  runner.start({ request: () => answer.promise, validate: validateFixtureResult });
  clock.advance(30_000);
  answer.resolve(validOutput());
  await settle();
  assert.equal(runner.getState().status, 'incomplete');
  assert.equal(runner.getState().reason, 'timeout');
  assert.equal(runner.getState().result, null);
});

test('a new run aborts the old run and ignores its late response', async () => {
  const clock = fakeClock();
  const oldAnswer = deferred();
  const newAnswer = deferred();
  let oldSignal;
  const runner = runnerWith(clock);
  const first = runner.start({
    request: ({ signal }) => {
      oldSignal = signal;
      return oldAnswer.promise;
    },
    validate: validateFixtureResult,
  });
  const second = runner.start({ request: () => newAnswer.promise, validate: validateFixtureResult });
  assert.notEqual(first, second);
  assert.equal(oldSignal.aborted, true);
  oldAnswer.resolve(validOutput());
  await settle();
  assert.equal(runner.getState().runId, second);
  assert.equal(runner.getState().status, 'processing');
  newAnswer.resolve(validOutput());
  await settle();
  assert.equal(runner.getState().status, 'completed');
});

test('a failed run allows an explicit successful retry', async () => {
  const clock = fakeClock();
  const runner = runnerWith(clock);
  runner.start({ request: () => Promise.reject(new Error('provider secret')), validate: validateFixtureResult });
  await settle();
  assert.equal(runner.getState().reason, 'provider_error');
  const retryId = runner.start({ request: () => Promise.resolve(validOutput()), validate: validateFixtureResult });
  assert.equal(runner.getState().runId, retryId);
  assert.equal(runner.getState().status, 'processing');
  await settle();
  assert.equal(runner.getState().status, 'completed');
  assert.equal(runner.getState().reason, null);
});

test('provider throw and rejection become safe incomplete states', async () => {
  for (const request of [
    () => { throw new Error('private provider details'); },
    () => Promise.reject(new Error('private provider details')),
    () => Promise.reject(new AnalysisFailure('provider_error')),
  ]) {
    const runner = runnerWith(fakeClock());
    runner.start({ request, validate: validateFixtureResult });
    await settle();
    assert.equal(runner.getState().status, 'incomplete');
    assert.equal(runner.getState().reason, 'provider_error');
    assert.equal(runner.getState().result, null);
  }
});

test('validation failures remain incomplete and preserve safe reason codes', async () => {
  for (const [output, reason] of [
    ['not JSON', 'invalid_output'],
    [{ ...validOutput(), fixture_key: 'arbitrary' }, 'invalid_output'],
    [{ ...validOutput(), evidence_ids: ['unknown'] }, 'invalid_citation'],
  ]) {
    const runner = runnerWith(fakeClock());
    runner.start({ request: () => Promise.resolve(output), validate: validateFixtureResult });
    await settle();
    assert.equal(runner.getState().status, 'incomplete');
    assert.equal(runner.getState().reason, reason);
    assert.equal(runner.getState().result, null);
  }
});

test('cancel aborts active work, clears timers, and suppresses late completion', async () => {
  const clock = fakeClock();
  const answer = deferred();
  let signal;
  const runner = runnerWith(clock);
  runner.start({
    request: ({ signal: requestSignal }) => {
      signal = requestSignal;
      return answer.promise;
    },
    validate: validateFixtureResult,
  });
  runner.cancel();
  assert.equal(signal.aborted, true);
  assert.equal(clock.pending(), 0);
  assert.equal(runner.getState().status, 'incomplete');
  assert.equal(runner.getState().reason, 'cancelled');
  answer.resolve(validOutput());
  await settle();
  assert.equal(runner.getState().reason, 'cancelled');
});

test('dispose cancels active work and prevents later starts', () => {
  const clock = fakeClock();
  const runner = runnerWith(clock);
  runner.start({ request: () => new Promise(() => {}), validate: validateFixtureResult });
  runner.dispose();
  assert.equal(runner.getState().reason, 'cancelled');
  assert.equal(clock.pending(), 0);
  assert.throws(
    () => runner.start({ request: () => Promise.resolve(validOutput()), validate: validateFixtureResult }),
  );
});

test('AnalysisFailure exposes only allowed reason codes', () => {
  assert.equal(new AnalysisFailure('invalid_citation').code, 'invalid_citation');
  assert.equal(new AnalysisFailure('invalid_output').code, 'invalid_output');
  assert.equal(new AnalysisFailure('unexpected secret').code, 'provider_error');
});
