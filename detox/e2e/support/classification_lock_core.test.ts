// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {afterEach, describe, it} from 'node:test';

import {
    acquireLock,
    activeHeartbeatCount,
    assertLockOwnership,
    DEFAULT_RENEW_MS,
    DEFAULT_TIMEOUT_MS,
    DEFAULT_TTL_MS,
    parseLock,
    releaseLock,
    stopHeartbeat,
    type LockStore,
} from './classification_lock_core';

// Real timers, tiny values: the lock's whole contract is about time, so the tests exercise
// the actual scheduling rather than a mocked clock. Every duration here is milliseconds.
const TTL = 120;
const RENEW = 25;
const POLL = 10;
const TIMEOUT = 1_000;

const FAST = {timeoutMs: TIMEOUT, ttlMs: TTL, pollMs: POLL, renewMs: RENEW} as const;

const sleep = (ms: number) => new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
});

type FakeStore = LockStore & {
    value: string;
    reads: number;
    writes: number;
    failReads: boolean;
    failWrites: boolean;

    /** Stalls every read, to hold a renewal tick mid-flight. */
    readDelayMs: number;
};

const createStore = (initial = ''): FakeStore => {
    const store: FakeStore = {
        value: initial,
        reads: 0,
        writes: 0,
        failReads: false,
        failWrites: false,
        readDelayMs: 0,
        read: async () => {
            store.reads++;
            if (store.readDelayMs > 0) {
                await sleep(store.readDelayMs);
            }
            if (store.failReads) {
                throw new Error('getaddrinfo ENOTFOUND test.server');
            }
            return store.value;
        },
        write: async (value: string) => {
            store.writes++;
            if (store.failWrites) {
                throw new Error('getaddrinfo ENOTFOUND test.server');
            }
            store.value = value;
        },
    };

    return store;
};

const heldBy = (owner: string, expiresInMs: number) => JSON.stringify({
    owner,
    expiresAt: Date.now() + expiresInMs,
});

const ownerOf = (store: FakeStore) => parseLock(store.value)?.owner;

// Heartbeats live in module state, so a test that leaves one running would renew a lease
// under the next test's store.
const OWNERS = ['owner-a', 'owner-b', 'dead-owner', 'waiter'];
afterEach(() => {
    OWNERS.forEach(stopHeartbeat);
});

describe('parseLock', () => {
    it('should return undefined for an unset, malformed, or incomplete cell', () => {
        assert.equal(parseLock(''), undefined);
        assert.equal(parseLock('not json'), undefined);
        assert.equal(parseLock('{"owner":"a"}'), undefined);
        assert.equal(parseLock('{"expiresAt":1}'), undefined);
    });

    it('should read back a well-formed record', () => {
        assert.deepEqual(parseLock('{"owner":"a","expiresAt":7}'), {owner: 'a', expiresAt: 7});
    });
});

describe('acquireLock — configuration invariants', () => {
    it('should ship defaults that can recover a leaked lock', () => {
        // The shipped values are what CI actually uses, so guard them directly rather than
        // only guarding the options path. 20m timeout vs 35m TTL is the bug this replaces.
        assert.ok(
            DEFAULT_TIMEOUT_MS > DEFAULT_TTL_MS,
            `acquire budget ${DEFAULT_TIMEOUT_MS}ms must outlast the ${DEFAULT_TTL_MS}ms lease`,
        );
        assert.ok(
            DEFAULT_RENEW_MS < DEFAULT_TTL_MS,
            `renewal every ${DEFAULT_RENEW_MS}ms must be more frequent than the ${DEFAULT_TTL_MS}ms lease`,
        );
    });

    it('should reject an empty owner', async () => {
        await assert.rejects(
            () => acquireLock(createStore(), '', FAST),
            /owner must not be empty/,
        );
    });

    it('should reject an acquire budget that cannot outlast the lease', async () => {
        // This is the shipped 20-minute-timeout / 35-minute-TTL bug, in miniature: a waiter
        // that gives up before the lease expires can never recover a leaked lock.
        await assert.rejects(
            () => acquireLock(createStore(), 'owner-a', {timeoutMs: 100, ttlMs: 200, pollMs: POLL, renewMs: 50}),
            /acquire budget \(100ms\) must exceed the lease TTL \(200ms\)/,
        );
    });

    it('should reject a renewal interval that is not shorter than the lease', async () => {
        await assert.rejects(
            () => acquireLock(createStore(), 'owner-a', {timeoutMs: TIMEOUT, ttlMs: 50, pollMs: POLL, renewMs: 50}),
            /renewal interval \(50ms\) must be shorter than the lease TTL \(50ms\)/,
        );
    });
});

describe('acquireLock', () => {
    it('should take an unheld lock and start renewing it', async () => {
        const store = createStore();

        await acquireLock(store, 'owner-a', FAST);

        assert.equal(ownerOf(store), 'owner-a');
        assert.equal(activeHeartbeatCount(), 1);
    });

    it('should treat an expired matching-owner record as available and confirm only a live lease', async () => {
        const store = createStore(JSON.stringify({owner: 'owner-a', expiresAt: Date.now() - 1}));

        await acquireLock(store, 'owner-a', FAST);

        const lock = parseLock(store.value);
        assert.equal(lock?.owner, 'owner-a');
        assert.ok((lock?.expiresAt ?? 0) > Date.now(), 'confirmed acquire must write an unexpired lease');
    });

    it('should recover a lock leaked by a holder that never released', async () => {
        // The CI failure: shard 8's release threw, so nothing ever cleared the cell. The
        // waiter must outlast the dead lease inside its own budget.
        const store = createStore(heldBy('dead-owner', TTL));

        const startedAt = Date.now();
        await acquireLock(store, 'waiter', FAST);
        const waitedMs = Date.now() - startedAt;

        assert.equal(ownerOf(store), 'waiter');
        assert.ok(waitedMs >= TTL, `expected to wait out the ${TTL}ms lease, waited ${waitedMs}ms`);
        assert.ok(waitedMs < TIMEOUT, `expected recovery inside the ${TIMEOUT}ms budget, waited ${waitedMs}ms`);
    });

    it("should keep a live holder's lease alive past the TTL", async () => {
        const store = createStore();
        await acquireLock(store, 'owner-a', FAST);

        await sleep(TTL * 2);

        const lock = parseLock(store.value);
        assert.equal(lock?.owner, 'owner-a');
        assert.ok(
            (lock?.expiresAt ?? 0) > Date.now(),
            'a renewed lease must still be in the future after two TTLs',
        );
    });

    it('should block a second owner while the lease is renewed', async () => {
        const store = createStore();
        await acquireLock(store, 'owner-a', FAST);

        await assert.rejects(
            () => acquireLock(store, 'owner-b', {timeoutMs: TTL * 3, ttlMs: TTL, pollMs: POLL, renewMs: RENEW}),
            /timed out after \d+ms waiting for owner "owner-a"/,
        );
        assert.equal(ownerOf(store), 'owner-a');
    });

    it('should serialise two contending owners', async () => {
        const store = createStore();
        await acquireLock(store, 'owner-a', FAST);

        const contender = acquireLock(store, 'owner-b', FAST);
        await sleep(RENEW * 2);
        assert.equal(ownerOf(store), 'owner-a', 'owner-b must not enter while owner-a holds');

        await releaseLock(store, 'owner-a');
        await contender;

        assert.equal(ownerOf(store), 'owner-b');
    });

    it('should give up quickly when the store is unreachable rather than burning the contention budget', async () => {
        const store = createStore();
        store.failReads = true;

        await assert.rejects(
            () => acquireLock(store, 'owner-a', FAST),
            /5 consecutive transport failures/,
        );
        assert.ok(store.reads >= 5, `expected at least 5 read attempts, saw ${store.reads}`);
    });
});

describe('releaseLock', () => {
    it('should clear its own lock and stop renewing', async () => {
        const store = createStore();
        await acquireLock(store, 'owner-a', FAST);

        await releaseLock(store, 'owner-a');
        assert.equal(store.value, '');
        assert.equal(activeHeartbeatCount(), 0);

        const writesAfterRelease = store.writes;
        await sleep(RENEW * 3);
        assert.equal(store.writes, writesAfterRelease, 'renewal must stop at release');
    });

    it('should leave a lock held by someone else alone', async () => {
        const store = createStore(heldBy('owner-a', TTL * 10));

        await releaseLock(store, 'owner-b');

        assert.equal(ownerOf(store), 'owner-a');
    });

    it('should not throw when the store is unreachable, and still stop renewing', async () => {
        // Shard 8's afterAll: the release path hit ENOTFOUND. That must not fail an otherwise
        // passing suite, and — with renewal stopped — the lease now expires on its own.
        const store = createStore();
        await acquireLock(store, 'owner-a', FAST);
        store.failReads = true;

        await releaseLock(store, 'owner-a');

        assert.equal(activeHeartbeatCount(), 0);

        const writesAfterRelease = store.writes;
        await sleep(RENEW * 3);
        assert.equal(store.writes, writesAfterRelease, 'a failed release must not leave a heartbeat running');
    });

    it('should be a no-op for an empty owner', async () => {
        const store = createStore(heldBy('owner-a', TTL * 10));

        await releaseLock(store, '');

        assert.equal(store.reads, 0);
        assert.equal(ownerOf(store), 'owner-a');
    });
});

describe('heartbeat', () => {
    it('should not resurrect the lock when a renewal tick is in flight at release', async () => {
        const store = createStore();
        await acquireLock(store, 'owner-a', FAST);

        // Stall the next tick inside its read, then release underneath it.
        store.readDelayMs = 100;
        await sleep(RENEW + 10);
        store.readDelayMs = 0;

        await releaseLock(store, 'owner-a');
        assert.equal(store.value, '');

        // Let the stalled tick finish. It must notice the release and write nothing.
        await sleep(150);
        assert.equal(store.value, '', 'a tick in flight at release must not re-take the lock');
    });

    it('should stop renewing once another owner has taken the lease over', async () => {
        const store = createStore();
        await acquireLock(store, 'owner-a', FAST);

        // Simulate the lease having lapsed and owner-b having stolen it.
        store.value = heldBy('owner-b', TTL * 10);

        await sleep(RENEW * 3);

        assert.equal(ownerOf(store), 'owner-b', 'owner-a must not write itself back in');
        assert.equal(activeHeartbeatCount(), 0);
    });
});

describe('assertLockOwnership', () => {
    it('should pass while the owner still holds the lock', async () => {
        const store = createStore();
        await acquireLock(store, 'shard-9', FAST);

        await assertLockOwnership(store, 'shard-9');

        await releaseLock(store, 'shard-9');
    });

    it('should throw naming the stealer when another owner took the cell', async () => {
        const store = createStore();
        await acquireLock(store, 'shard-9', FAST);
        await releaseLock(store, 'shard-9');

        // Simulate the lost-update race: a second shard overwrites the cell after the
        // first owner's acquire already confirmed it, without waiting for release.
        await store.write(JSON.stringify({owner: 'shard-18', expiresAt: Date.now() + TTL}));

        await assert.rejects(
            () => assertLockOwnership(store, 'shard-9'),
            /lost the lock to "shard-18"/,
        );
    });

    it('should throw when the lock cell was cleared mid-run', async () => {
        const store = createStore();

        await assert.rejects(
            () => assertLockOwnership(store, 'shard-9'),
            /lock cell is empty/,
        );
    });

    it('should reject an empty owner', async () => {
        const store = createStore();

        await assert.rejects(
            () => assertLockOwnership(store, ''),
            /owner must not be empty/,
        );
    });
});
