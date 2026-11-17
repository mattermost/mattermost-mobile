// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type ConvergeOptions = {

    /** Overall budget, measured from the first check. */
    timeoutMs: number;

    /** Delay between two checks that did not converge. */
    pollIntervalMs: number;

    /**
     * Run while the checks keep failing, at most once per reassertIntervalMs. Its errors propagate: a write
     * the caller relies on must not fail silently.
     */
    reassert?: () => Promise<void>;
    reassertIntervalMs?: number;

    /** Injected for tests. */
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
};

export type ConvergeResult = {
    converged: boolean;
    checks: number;
    reasserts: number;
    elapsedMs: number;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
});

/**
 * Polls `check` until it reports the expected state or the budget runs out. While it keeps reporting the old
 * state, `reassert` is run once per `reassertIntervalMs`, so a state the server cached from stale data can be
 * dropped by repeating the write that should have changed it.
 *
 * The first check always runs, even with a zero budget. Every later check runs only while the deadline has not
 * passed, and each sleep is capped at the time left. A state observed after the deadline is never reported as
 * converged, even when a timer, a reassert or the check itself overshoots. A zero budget is one pass that counts.
 * @param check - resolves true once the expected state is observed
 * @param options - budget, poll cadence and optional reassert step
 * @returns whether the state converged, with the number of checks and reasserts it took
 */
export async function pollUntilConverged(check: () => Promise<boolean>, options: ConvergeOptions): Promise<ConvergeResult> {
    const now = options.now ?? Date.now;
    const sleep = options.sleep ?? defaultSleep;
    const start = now();
    const elapsed = () => now() - start;
    let lastReassert = start;
    let checks = 0;
    let reasserts = 0;

    /* eslint-disable no-await-in-loop -- each check depends on the previous one */
    for (;;) {
        if (checks > 0 && elapsed() > options.timeoutMs) {
            return {converged: false, checks, reasserts, elapsedMs: elapsed()};
        }
        checks += 1;
        const observed = await check();
        if (observed && (options.timeoutMs === 0 || elapsed() <= options.timeoutMs)) {
            return {converged: true, checks, reasserts, elapsedMs: elapsed()};
        }
        if (elapsed() >= options.timeoutMs) {
            return {converged: false, checks, reasserts, elapsedMs: elapsed()};
        }
        if (options.reassert && options.reassertIntervalMs !== undefined && now() - lastReassert >= options.reassertIntervalMs) {
            await options.reassert();
            reasserts += 1;
            lastReassert = now();
        }
        await sleep(Math.min(options.pollIntervalMs, Math.max(0, options.timeoutMs - elapsed())));
    }
    /* eslint-enable no-await-in-loop */
}

/**
 * Polls the candidates in order until one reports present, for at most `timeoutMs` (one pass when it is 0).
 * @param candidates - keyed presence checks, earlier ones win when several hold at once
 * @param options - budget and poll cadence
 * @returns the key of the first candidate found, or undefined when none appeared in time
 */
export async function findFirst<K extends string>(
    candidates: ReadonlyArray<readonly [K, () => Promise<boolean>]>,
    options: Pick<ConvergeOptions, 'timeoutMs' | 'pollIntervalMs' | 'now' | 'sleep'>,
): Promise<K | undefined> {
    let found: K | undefined;
    const {converged} = await pollUntilConverged(async () => {
        for (const [key, isPresent] of candidates) {
            // eslint-disable-next-line no-await-in-loop -- candidates are checked one at a time, in priority order
            if (await isPresent()) {
                found = key;
                return true;
            }
        }
        return false;
    }, options);
    return converged ? found : undefined;
}

/**
 * Awaits every promise, then rethrows the first rejection. Unlike Promise.all, nothing is still running once the
 * caller moves on.
 * @param promises - the work to wait for
 */
export async function allOrFirstError(promises: Array<Promise<unknown>>): Promise<void> {
    const results = await Promise.allSettled(promises);
    const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failure) {
        throw failure.reason;
    }
}
