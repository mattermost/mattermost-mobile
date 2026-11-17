// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {pollUntilConverged} from './converge';

// A clock that only moves when the code under test sleeps, so cadence is asserted exactly.
const fakeClock = () => {
    let time = 0;
    return {
        now: () => time,
        sleep: async (ms: number) => {
            time += ms;
        },
    };
};

// Answers false until the given time, then true.
const convergesAt = (clock: {now: () => number}, at: number) => async () => clock.now() >= at;

describe('pollUntilConverged', () => {
    it('should return on the first check without reasserting when the state already holds', async () => {
        const clock = fakeClock();
        let reasserts = 0;
        const result = await pollUntilConverged(async () => true, {
            timeoutMs: 10_000,
            pollIntervalMs: 2_000,
            reassertIntervalMs: 30_000,
            reassert: async () => {
                reasserts += 1;
            },
            ...clock,
        });

        assert.deepEqual(result, {converged: true, checks: 1, reasserts: 0, elapsedMs: 0});
        assert.equal(reasserts, 0);
    });

    it('should reassert once per interval while the state has not converged', async () => {
        const clock = fakeClock();
        const reassertTimes: number[] = [];
        const result = await pollUntilConverged(convergesAt(clock, 70_000), {
            timeoutMs: 120_000,
            pollIntervalMs: 2_000,
            reassertIntervalMs: 30_000,
            reassert: async () => {
                reassertTimes.push(clock.now());
            },
            ...clock,
        });

        assert.equal(result.converged, true);
        assert.equal(result.elapsedMs, 70_000);
        assert.deepEqual(reassertTimes, [30_000, 60_000]);
        assert.equal(result.reasserts, 2);
    });

    it('should report a timeout after the budget without throwing', async () => {
        const clock = fakeClock();
        const result = await pollUntilConverged(async () => false, {
            timeoutMs: 10_000,
            pollIntervalMs: 2_000,
            ...clock,
        });

        assert.equal(result.converged, false);
        assert.equal(result.reasserts, 0);
        assert.equal(result.elapsedMs, 10_000);
        assert.equal(result.checks, 6);
    });

    it('should propagate a failing reassert', async () => {
        const clock = fakeClock();
        await assert.rejects(
            pollUntilConverged(async () => false, {
                timeoutMs: 120_000,
                pollIntervalMs: 2_000,
                reassertIntervalMs: 30_000,
                reassert: async () => {
                    throw new Error('write failed');
                },
                ...clock,
            }),
            /write failed/,
        );
    });
});
