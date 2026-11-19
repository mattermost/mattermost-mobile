// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {allOrFirstError, findFirst, pollUntilConverged} from './converge';

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

    it('should not reassert without an interval', async () => {
        const clock = fakeClock();
        let reasserts = 0;
        await pollUntilConverged(async () => false, {
            timeoutMs: 60_000,
            pollIntervalMs: 2_000,
            reassert: async () => {
                reasserts += 1;
            },
            ...clock,
        });

        assert.equal(reasserts, 0);
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

// A clock whose timers wake late by `overshootMs`, like a busy runner.
const lateClock = (overshootMs: number) => {
    let time = 0;
    return {
        now: () => time,
        sleep: async (ms: number) => {
            time += ms + overshootMs;
        },
    };
};

describe('pollUntilConverged deadline', () => {
    it('should not check again once a late timer has woken past the deadline', async () => {
        const clock = lateClock(500);
        let checks = 0;
        const result = await pollUntilConverged(async () => {
            checks += 1;
            return clock.now() >= 1_200;
        }, {timeoutMs: 1_000, pollIntervalMs: 2_000, ...clock});

        assert.equal(result.converged, false);
        assert.equal(checks, 1);
        assert.equal(result.elapsedMs, 1_500);
    });

    it('should not check again when a reassert runs past the deadline', async () => {
        const clock = fakeClock();
        let checks = 0;
        const result = await pollUntilConverged(async () => {
            checks += 1;
            return checks > 1;
        }, {
            timeoutMs: 1_000,
            pollIntervalMs: 500,
            reassertIntervalMs: 0,
            reassert: async () => {
                await clock.sleep(5_000);
            },
            ...clock,
        });

        assert.equal(result.converged, false);
        assert.equal(checks, 1);
    });
});

describe('pollUntilConverged slow check', () => {
    it('should not report convergence when the check finishes after the deadline', async () => {
        const clock = fakeClock();
        const result = await pollUntilConverged(async () => {
            await clock.sleep(1_500);
            return true;
        }, {timeoutMs: 1_000, pollIntervalMs: 500, ...clock});

        assert.equal(result.converged, false);
        assert.equal(result.checks, 1);
    });

    it('should count the single pass of a zero budget however long it takes', async () => {
        const clock = fakeClock();
        const result = await pollUntilConverged(async () => {
            await clock.sleep(1_500);
            return true;
        }, {timeoutMs: 0, pollIntervalMs: 500, ...clock});

        assert.equal(result.converged, true);
    });
});

describe('findFirst', () => {
    it('should not return a candidate that is observed after the deadline', async () => {
        const clock = fakeClock();
        const found = await findFirst([['slow', async () => {
            await clock.sleep(1_500);
            return true;
        }]], {timeoutMs: 1_000, pollIntervalMs: 500, ...clock});

        assert.equal(found, undefined);
    });

    it('should not return a candidate that appears after the deadline when the timer wakes late', async () => {
        const clock = lateClock(500);
        const found = await findFirst([['late', convergesAt(clock, 1_200)]], {timeoutMs: 1_000, pollIntervalMs: 2_000, ...clock});

        assert.equal(found, undefined);
    });

    it('should not find a candidate that only appears after the budget', async () => {
        const clock = fakeClock();
        const found = await findFirst([['late', convergesAt(clock, 2_000)]], {timeoutMs: 1_000, pollIntervalMs: 2_000, ...clock});

        assert.equal(found, undefined);
        assert.equal(clock.now(), 1_000);
    });

    it('should return the candidate that appears, even when it is not the first one checked', async () => {
        const clock = fakeClock();
        const found = await findFirst([
            ['login', async () => false],
            ['server', convergesAt(clock, 1_000)],
        ], {timeoutMs: 10_000, pollIntervalMs: 500, ...clock});

        assert.equal(found, 'server');
        assert.equal(clock.now(), 1_000);
    });

    it('should prefer the earlier candidate when both are present', async () => {
        const clock = fakeClock();
        const found = await findFirst([
            ['login', async () => true],
            ['server', async () => true],
        ], {timeoutMs: 10_000, pollIntervalMs: 500, ...clock});

        assert.equal(found, 'login');
    });

    it('should make a single pass when the budget is zero', async () => {
        const clock = fakeClock();
        let checks = 0;
        const found = await findFirst([['tooltip', async () => {
            checks += 1;
            return false;
        }]], {timeoutMs: 0, pollIntervalMs: 500, ...clock});

        assert.equal(found, undefined);
        assert.equal(checks, 1);
        assert.equal(clock.now(), 0);
    });
});

describe('allOrFirstError', () => {
    it('should wait for every promise before rethrowing the first rejection', async () => {
        let slowSettled = false;
        const slow = new Promise<void>((resolve) => {
            setTimeout(() => {
                slowSettled = true;
                resolve();
            }, 20);
        });

        await assert.rejects(allOrFirstError([Promise.reject(new Error('first')), slow, Promise.reject(new Error('second'))]), /first/);
        assert.equal(slowSettled, true);
    });
});
