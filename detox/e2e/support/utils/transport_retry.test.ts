// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    isTransportFailure,
    NETWORK_RETRY_ATTEMPTS,
    TRANSPORT_RETRY_BUDGET_MS,
    withTransportRetry,
    type ApiResult,
} from './transport_retry';

const ENOTFOUND = {error: {message: 'No response from server: getaddrinfo ENOTFOUND ...'}, status: 0} as const;
const FORBIDDEN = {error: {message: 'Forbidden'}, status: 403} as const;

// A success carries `preferences` rather than an `error`/`status` — structurally unrelated to
// ApiResult, so it needs the explicit cast (mirrors how classification_lock casts its results).
const SUCCESS = {preferences: []} as unknown as ApiResult;

type CallCounter = {calls: number};

// Returns an operation that replays `results` in order, holding the last one forever, so a
// single fixture also models "fails every time".
const replay = (results: readonly ApiResult[], counter: CallCounter) => async (): Promise<ApiResult> => {
    counter.calls++;
    return results[Math.min(counter.calls - 1, results.length - 1)]!;
};

describe('classification lock transport retry', () => {
    it('should retry a transient transport failure and return the eventual success', async () => {
        const counter: CallCounter = {calls: 0};
        const result = await withTransportRetry(
            replay([ENOTFOUND, SUCCESS], counter),
            {delayMs: 0, idempotent: true},
        );

        assert.equal(counter.calls, 2, 'should retry once and succeed on the second call');
        assert.deepEqual(result, SUCCESS);
    });

    it('should stop after exactly NETWORK_RETRY_ATTEMPTS calls on persistent transport failure and return the last failure', async () => {
        const counter: CallCounter = {calls: 0};
        const result = await withTransportRetry(
            replay([ENOTFOUND], counter),
            {delayMs: 0, idempotent: true},
        );

        assert.equal(counter.calls, NETWORK_RETRY_ATTEMPTS, 'should not retry past the attempt budget');
        assert.deepEqual(result, ENOTFOUND, 'should return the last failure rather than throw');
    });

    it('should not retry a real server answer (403)', async () => {
        const counter: CallCounter = {calls: 0};
        const result = await withTransportRetry(
            replay([FORBIDDEN], counter),
            {delayMs: 0, idempotent: true},
        );

        assert.equal(counter.calls, 1, 'a real server answer must surface immediately, never retried');
        assert.deepEqual(result, FORBIDDEN, 'the failure must be returned as-is');
    });

    it('should return immediately without retrying or delaying on immediate success', async () => {
        const counter: CallCounter = {calls: 0};
        const start = Date.now();
        const result = await withTransportRetry(
            replay([SUCCESS], counter),
            {delayMs: 0, idempotent: true},
        );
        const elapsed = Date.now() - start;

        assert.equal(counter.calls, 1, 'no retry on immediate success');
        assert.deepEqual(result, SUCCESS);
        assert.ok(elapsed < 200, `no delay should be incurred on immediate success, took ${elapsed}ms`);
    });

    it('should treat a missing status field as NOT a transport failure and not retry', async () => {
        // isTransportFailure({error, status: undefined}) is Boolean(error) && undefined === 0,
        // which is false. So a result with no status field at all is not retried and surfaces
        // after a single call. This documents current behaviour, not a recommendation.
        const missingStatus = {error: {message: 'weird shape'}} as const;
        const counter: CallCounter = {calls: 0};
        const result = await withTransportRetry(
            replay([missingStatus], counter),
            {delayMs: 0, idempotent: true},
        );

        assert.equal(counter.calls, 1, 'no status field => not a transport failure => no retry');
        assert.deepEqual(result, missingStatus);
    });
});

describe('isTransportFailure', () => {
    const cases: Array<{name: string; result: ApiResult; expected: boolean}> = [
        {name: 'status 0 with no error field', result: {status: 0}, expected: false},
        {name: 'status 0 with error (transport failure)', result: ENOTFOUND, expected: true},
        {name: 'error with status 403', result: FORBIDDEN, expected: false},
        {name: 'error with status 500', result: {error: {message: 'boom'}, status: 500}, expected: false},
        {name: 'Cloudflare 524 with error payload', result: {error: {message: 'Error 524'}, status: 524}, expected: true},
        {name: 'timeout message even without status 0', result: {error: {message: 'timeout of 30000ms exceeded'}, status: 504}, expected: true},
        {name: 'AggregateError with no status', result: {error: {message: 'No response from server: AggregateError'}}, expected: true},
        {name: 'empty object', result: {}, expected: false},
    ];

    for (const c of cases) {
        it(`should return ${c.expected} for ${c.name}`, () => {
            assert.equal(isTransportFailure(c.result), c.expected);
        });
    }
});

describe('transport retry idempotency gate', () => {
    it('should not retry a non-idempotent operation by default', async () => {
        const counter: CallCounter = {calls: 0};
        const result = await withTransportRetry(
            replay([ENOTFOUND], counter),
            {delayMs: 0, idempotent: false},
        );

        assert.equal(counter.calls, 1, 'a create that may already have committed must not be replayed');
        assert.deepEqual(result, ENOTFOUND, 'the transport failure is returned for the caller to reconcile');
    });

    it('should retry a non-idempotent operation when the caller opts into duplicate writes', async () => {
        const counter: CallCounter = {calls: 0};
        const result = await withTransportRetry(
            replay([ENOTFOUND, SUCCESS], counter),
            {delayMs: 0, idempotent: false, allowDuplicateWrites: true},
        );

        assert.equal(counter.calls, 2, 'explicit opt-in restores the retry');
        assert.deepEqual(result, SUCCESS);
    });

    it('should stop retrying once the elapsed-time budget is spent', async () => {
        const counter: CallCounter = {calls: 0};
        const result = await withTransportRetry(
            replay([ENOTFOUND], counter),
            {delayMs: TRANSPORT_RETRY_BUDGET_MS, idempotent: true},
        );

        // The first attempt always runs; the budget check then refuses to start a wait it
        // cannot afford, so the attempt cap is never reached.
        assert.equal(counter.calls, 1, 'a delay that does not fit the budget must not be taken');
        assert.ok(counter.calls < NETWORK_RETRY_ATTEMPTS, 'the time budget bounds retries before the attempt cap does');
        assert.deepEqual(result, ENOTFOUND);
    });
});
