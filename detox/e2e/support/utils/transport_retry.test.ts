// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {
    isTransportFailure,
    NETWORK_RETRY_ATTEMPTS,
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
    it('retries a transient transport failure and returns the eventual success', async () => {
        const counter: CallCounter = {calls: 0};
        const result = await withTransportRetry(
            replay([ENOTFOUND, SUCCESS], counter),
            {delayMs: 0},
        );

        assert.equal(counter.calls, 2, 'should retry once and succeed on the second call');
        assert.deepEqual(result, SUCCESS);
    });

    it('stops after exactly NETWORK_RETRY_ATTEMPTS calls on persistent transport failure and returns the last failure', async () => {
        const counter: CallCounter = {calls: 0};
        const result = await withTransportRetry(
            replay([ENOTFOUND], counter),
            {delayMs: 0},
        );

        assert.equal(counter.calls, NETWORK_RETRY_ATTEMPTS, 'should not retry past the attempt budget');
        assert.deepEqual(result, ENOTFOUND, 'should return the last failure rather than throw');
    });

    it('does not retry a real server answer (403)', async () => {
        const counter: CallCounter = {calls: 0};
        const result = await withTransportRetry(
            replay([FORBIDDEN], counter),
            {delayMs: 0},
        );

        assert.equal(counter.calls, 1, 'a real server answer must surface immediately, never retried');
        assert.deepEqual(result, FORBIDDEN, 'the failure must be returned as-is');
    });

    it('returns immediately without retrying or delaying on immediate success', async () => {
        const counter: CallCounter = {calls: 0};
        const start = Date.now();
        const result = await withTransportRetry(
            replay([SUCCESS], counter),
            {delayMs: 0},
        );
        const elapsed = Date.now() - start;

        assert.equal(counter.calls, 1, 'no retry on immediate success');
        assert.deepEqual(result, SUCCESS);
        assert.ok(elapsed < 200, `no delay should be incurred on immediate success, took ${elapsed}ms`);
    });

    it('pins current behaviour: a missing status field is treated as NOT a transport failure (no retry)', async () => {
        // isTransportFailure({error, status: undefined}) is Boolean(error) && undefined === 0,
        // which is false. So a result with no status field at all is not retried and surfaces
        // after a single call. This documents current behaviour, not a recommendation.
        const missingStatus = {error: {message: 'weird shape'}} as const;
        const counter: CallCounter = {calls: 0};
        const result = await withTransportRetry(
            replay([missingStatus], counter),
            {delayMs: 0},
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
        {name: 'empty object', result: {}, expected: false},
    ];

    for (const c of cases) {
        it(`returns ${c.expected} for ${c.name}`, () => {
            assert.equal(isTransportFailure(c.result), c.expected);
        });
    }
});
