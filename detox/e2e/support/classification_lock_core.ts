// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Transport-free core of the classification advisory lock.
 *
 * Kept separate from classification_lock.ts (which binds it to the preference API) so the
 * lock's timing rules can be unit-tested against an in-memory store. `@support/utils`
 * imports detox, so anything that reaches it cannot run under `node --test` / `tsx --test`;
 * the constants below therefore carry literal ms values with their `timeouts` equivalent in
 * a comment, the same way transport_retry.ts does.
 */

export type LockRecord = {
    owner: string;
    expiresAt: number;
};

/**
 * The persisted lock cell. `read` resolves '' when unset; `write('')` clears it.
 * Both may reject — the caller treats a rejection as a transport fault, never as "unlocked".
 */
export type LockStore = {
    read: () => Promise<string>;
    write: (value: string) => Promise<void>;
};

export type AcquireLockOptions = {
    timeoutMs?: number;
    ttlMs?: number;
    pollMs?: number;
    renewMs?: number;
};

/**
 * How long a waiter will queue behind a live holder. timeouts.ONE_MIN * 45.
 * Callers must give their beforeAll hook a timeout larger than this — Jest's per-hook
 * timeout, not jest.setTimeout, is what bounds the acquire.
 */
export const DEFAULT_TIMEOUT_MS = 45 * 60_000;

/**
 * Lease length, NOT the longest legal hold.
 *
 * A holder renews its lease every DEFAULT_RENEW_MS for as long as it lives (see
 * startHeartbeat), so a legitimate 30-minute suite keeps the lock on a 5-minute lease. The
 * TTL therefore only bounds how long a *dead* holder's lock stays un-stealable.
 * The invariant that prevents that (timeoutMs > ttlMs) is now asserted in acquireLock.
 */
export const DEFAULT_TTL_MS = 5 * 60_000;

/**
 * Renewal interval. Six-ish consecutive failures are needed before a live holder loses its
 * lease, which is the trade for a TTL short enough to recover a leak quickly.
 */
export const DEFAULT_RENEW_MS = 45_000;

/** timeouts.TWO_SEC */
export const DEFAULT_POLL_MS = 2_000;

/**
 * Transport faults get a few polls to clear (~8s at DEFAULT_POLL_MS) before we give up.
 * Deliberately much smaller than DEFAULT_TIMEOUT_MS, which exists for lock contention, not
 * for an unreachable server.
 */
export const MAX_CONSECUTIVE_TRANSPORT_FAILURES = 5;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

export const formatError = (value: unknown): string => {
    if (value instanceof Error) {
        return value.message;
    }

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
};

export const parseLock = (value: string): LockRecord | undefined => {
    if (!value) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(value) as Partial<LockRecord>;
        if (typeof parsed.owner === 'string' && typeof parsed.expiresAt === 'number') {
            return {owner: parsed.owner, expiresAt: parsed.expiresAt};
        }
    } catch {
        return undefined;
    }

    return undefined;
};

type Heartbeat = {
    stopped: boolean;
    timer?: ReturnType<typeof setTimeout>;
};

const heartbeats = new Map<string, Heartbeat>();

const warn = (message: string) => {
    // eslint-disable-next-line no-console
    console.warn(`[classification lock] ${message}`);
};

/** Number of owners currently renewing a lease. Exposed for tests and leak checks. */
export const activeHeartbeatCount = (): number => heartbeats.size;

export const stopHeartbeat = (owner: string): void => {
    const heartbeat = heartbeats.get(owner);
    if (!heartbeat) {
        return;
    }

    heartbeat.stopped = true;
    if (heartbeat.timer) {
        clearTimeout(heartbeat.timer);
    }
    heartbeats.delete(owner);
};

const startHeartbeat = (store: LockStore, owner: string, ttlMs: number, renewMs: number): void => {
    stopHeartbeat(owner);

    const heartbeat: Heartbeat = {stopped: false};
    heartbeats.set(owner, heartbeat);

    const schedule = () => {
        if (heartbeat.stopped) {
            return;
        }

        heartbeat.timer = setTimeout(() => {
            tick().catch((error: unknown) => {
                warn(`renewal tick crashed for "${owner}": ${formatError(error)}`);
            });
        }, renewMs);

        // Renewal must never be the reason the jest worker stays alive after a suite ends.
        heartbeat.timer.unref?.();
    };

    const tick = async () => {
        if (heartbeat.stopped) {
            return;
        }

        try {
            const current = parseLock(await store.read());

            // releaseLock may have run while that read was in flight. Writing now would
            // resurrect a lock we have already given up, and the next waiter would queue
            // behind a ghost for a full TTL.
            if (heartbeat.stopped) {
                return;
            }

            if (current && current.owner !== owner) {
                // Our lease lapsed and another owner took it. Re-asserting here would put two
                // shards inside the critical section at once, so stop and make the loss loud.
                warn(`lease for "${owner}" was taken over by "${current.owner}"; renewal stopped`);
                stopHeartbeat(owner);
                return;
            }

            await store.write(JSON.stringify({owner, expiresAt: Date.now() + ttlMs}));
        } catch (error) {
            // A blip is survivable: the next tick retries, and the lease only lapses after
            // roughly ttlMs/renewMs consecutive failures — by which point the holder really
            // is unreachable and a waiter *should* be able to steal the lock.
            warn(`failed to renew the lease for "${owner}": ${formatError(error)}`);
        }

        schedule();
    };

    schedule();
};

/**
 * Take the advisory lock, then keep renewing it until releaseLock is called.
 *
 * Resolves once `owner` holds the lock. Rejects on contention timeout, on a persistently
 * unreachable store, or on an options combination that could not recover a leaked lock.
 */
export const acquireLock = async (
    store: LockStore,
    owner: string,
    options: AcquireLockOptions = {},
): Promise<void> => {
    if (!owner) {
        throw new Error('classification lock: owner must not be empty');
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
    const renewMs = options.renewMs ?? DEFAULT_RENEW_MS;

    // The whole point of a TTL is that a waiter can outlast a dead holder's lease.
    if (timeoutMs <= ttlMs) {
        throw new Error(
            `classification lock: acquire budget (${timeoutMs}ms) must exceed the lease TTL ` +
            `(${ttlMs}ms), or a lock leaked by a dead holder can never be recovered.`,
        );
    }

    if (renewMs >= ttlMs) {
        throw new Error(
            `classification lock: renewal interval (${renewMs}ms) must be shorter than the ` +
            `lease TTL (${ttlMs}ms), or a live holder loses its own lock.`,
        );
    }

    const deadline = Date.now() + timeoutMs;
    let lastLock: LockRecord | undefined;
    let lastTransportError: unknown;
    let consecutiveTransportFailures = 0;

    do {
        // A transport fault against the ephemeral test server is the same kind of
        // "try again shortly" this loop already exists for, so absorb it here rather
        // than abandoning acquisition on the first blip.
        try {
            // eslint-disable-next-line no-await-in-loop -- advisory lock acquisition must be sequential
            lastLock = parseLock(await store.read());
            const now = Date.now();
            if (!lastLock || lastLock.expiresAt <= now || lastLock.owner === owner) {
                // eslint-disable-next-line no-await-in-loop
                await store.write(JSON.stringify({owner, expiresAt: now + ttlMs}));

                // eslint-disable-next-line no-await-in-loop -- confirm ownership after the non-atomic write
                const confirmedLock = parseLock(await store.read());
                if (confirmedLock?.owner === owner) {
                    startHeartbeat(store, owner, ttlMs, renewMs);
                    return;
                }
                lastLock = confirmedLock;
            }
            lastTransportError = undefined;
            consecutiveTransportFailures = 0;
        } catch (error) {
            lastTransportError = error;
            consecutiveTransportFailures += 1;

            if (consecutiveTransportFailures >= MAX_CONSECUTIVE_TRANSPORT_FAILURES) {
                throw new Error(
                    `classification lock: ${consecutiveTransportFailures} consecutive transport ` +
                    `failures reading/writing the lock. Last error: ${formatError(error)}`,
                );
            }
        }

        if (Date.now() < deadline) {
            // eslint-disable-next-line no-await-in-loop
            await sleep(Math.min(pollMs, deadline - Date.now()));
        }
    } while (Date.now() < deadline);

    if (lastTransportError) {
        throw new Error(
            `classification lock: gave up after ${timeoutMs}ms of transport failures. ` +
            `Last error: ${formatError(lastTransportError)}`,
        );
    }

    throw new Error(
        `classification lock: timed out after ${timeoutMs}ms waiting for owner ` +
        `"${lastLock?.owner ?? 'unknown'}" (expiresAt=${lastLock?.expiresAt ?? 'unknown'})`,
    );
};

/**
 * Stop renewing and clear the lock. Best effort by design.
 *
 * Release runs in afterAll, against a test server that may already be tearing down. It used
 * to throw there, which both failed the holder's own (otherwise passing) suite and left the
 * lock held for the rest of its TTL. The lease is the authority now: once renewal stops the
 * lock expires within ttlMs whatever happens to this call, so a failure is warned about
 * rather than propagated.
 */
export const releaseLock = async (store: LockStore, owner: string): Promise<void> => {
    if (!owner) {
        return;
    }

    stopHeartbeat(owner);

    try {
        const lock = parseLock(await store.read());
        if (lock?.owner === owner) {
            await store.write('');
        }
    } catch (error) {
        warn(
            `best-effort release failed for "${owner}"; the lease expires on its own. ` +
            formatError(error),
        );
    }
};

/**
 * Re-validate that `owner` still holds the lock, WITHOUT taking it.
 *
 * The acquire path confirms ownership exactly once (write + confirm read). That leaves a
 * window: a second shard that raced the same read-modify-write can overwrite the cell after
 * our confirmation, and because the underlying store is a single last-write-wins preference
 * row, both shards then believe they hold the lock and mutate the shared server config
 * concurrently — which is exactly how run 33122005735's shard 18 (global_classification_banner)
 * began patching FeatureFlagClassificationMarkings=false at 22:44:43 while shard 9
 * (classification_banner_across_screens) held the lock from ~22:43:00 to ~22:50:27. Shard 9's
 * six banner tests then ran against a flag the app saw as off.
 *
 * Callers invoke this before every config mutation and in their beforeEach: losing the lock
 * now fails fast with the stealer's identity in the message, instead of surfacing later as
 * opaque per-test timeouts against a flag another suite is flipping.
 */
export const assertLockOwnership = async (store: LockStore, owner: string): Promise<void> => {
    if (!owner) {
        throw new Error('classification lock: owner must not be empty');
    }

    const lock = parseLock(await store.read());
    if (!lock) {
        throw new Error(
            `classification lock: ownership check failed — the lock cell is empty but "${owner}" ` +
            'expected to hold it. Another suite may have released it mid-run; re-acquire before mutating shared config.',
        );
    }

    if (lock.owner !== owner) {
        throw new Error(
            `classification lock: "${owner}" lost the lock to "${lock.owner}" (expiresAt=${lock.expiresAt}). ` +
            'Concurrent classification suites are mutating the shared classification config; this ' +
            'run\'s banner assertions cannot be trusted. Re-run the shard — do not widen timeouts.',
        );
    }
};
