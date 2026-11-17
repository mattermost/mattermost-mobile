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
 * @param check - resolves true once the expected state is observed
 * @param options - budget, poll cadence and optional reassert step
 * @returns whether the state converged, with the number of checks and reasserts it took
 */
export async function pollUntilConverged(check: () => Promise<boolean>, options: ConvergeOptions): Promise<ConvergeResult> {
    const now = options.now ?? Date.now;
    const sleep = options.sleep ?? defaultSleep;
    const start = now();
    let lastReassert = start;
    let checks = 0;
    let reasserts = 0;

    /* eslint-disable no-await-in-loop -- each check depends on the previous one */
    for (;;) {
        checks += 1;
        if (await check()) {
            return {converged: true, checks, reasserts, elapsedMs: now() - start};
        }
        if (now() - start >= options.timeoutMs) {
            return {converged: false, checks, reasserts, elapsedMs: now() - start};
        }
        if (options.reassert && options.reassertIntervalMs !== undefined && now() - lastReassert >= options.reassertIntervalMs) {
            await options.reassert();
            reasserts += 1;
            lastReassert = now();
        }
        await sleep(options.pollIntervalMs);
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
    await pollUntilConverged(async () => {
        for (const [key, isPresent] of candidates) {
            // eslint-disable-next-line no-await-in-loop -- candidates are checked one at a time, in priority order
            if (await isPresent()) {
                found = key;
                return true;
            }
        }
        return false;
    }, options);
    return found;
}
