// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';

import {confirmDeleteTombstone, deleteAbsentCleanDraft, getReconcilableKeys, processOutboxDelete, processOutboxUpsert, reconcileTeamDrafts, type ReconcileKey} from '@actions/remote/draft';
import {MM_TABLES} from '@constants/database';
import {DRAFT_ABSENCE_CONFIRMATION_DELAY_MS, DraftOutboxOperation, DraftOutboxStatus, MAX_DRAFT_SYNC_EVENT_BUFFER} from '@constants/draft';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {buildDraftOutboxId} from '@queries/servers/drafts';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';
import * as log from '@utils/log';

import {exportedForTesting, type ManagerBaselineInternals, default as DraftSyncManagerDefault} from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type DraftOutboxModel from '@typings/database/models/servers/draft_outbox';
import type {NormalizedDraft} from '@utils/draft/sync';

jest.mock('@actions/remote/draft', () => ({
    reconcileTeamDrafts: jest.fn(),
    getReconcilableKeys: jest.fn(),
    deleteAbsentCleanDraft: jest.fn(),
    confirmDeleteTombstone: jest.fn(),
    processOutboxUpsert: jest.fn(),
    processOutboxDelete: jest.fn(),
}));

const mockedReconcile = jest.mocked(reconcileTeamDrafts);
const mockedGetReconcilableKeys = jest.mocked(getReconcilableKeys);
const mockedDeleteAbsentCleanDraft = jest.mocked(deleteAbsentCleanDraft);
const mockedConfirmDeleteTombstone = jest.mocked(confirmDeleteTombstone);
const mockedProcessOutboxUpsert = jest.mocked(processOutboxUpsert);
const mockedProcessOutboxDelete = jest.mocked(processOutboxDelete);

const {DRAFT_OUTBOX} = MM_TABLES.SERVER;
const {DraftSyncManagerSingleton} = exportedForTesting;
const SERVER_URL = 'draft.sync.manager.test.com';

const CHANNEL_ID = 'channelidchannelidchannelid0';
const ROOT_ID = '';

// Narrow view onto the manager's private per-server state for assertions that would otherwise
// need bespoke test hooks (buffer length, epoch). Typed to avoid `any`.
type ManagerInternals = {
    eventBuffers: Record<string, WebSocketMessage[]>;
    lifecycleEpoch: Record<string, number>;
    inFlightKeys: Record<string, Set<string>>;
};

const internals = (manager: InstanceType<typeof DraftSyncManagerSingleton>) =>
    manager as unknown as ManagerInternals;

const baselineInternals = (manager: InstanceType<typeof DraftSyncManagerSingleton>) =>
    manager as unknown as ManagerBaselineInternals;

// flushMicrotasks: drain the promise queue so a fire-and-forget async reconcile (and any coalesced
// re-run it drains) can settle under fake timers.
const flushMicrotasks = async () => {
    for (let i = 0; i < 10; i++) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise(process.nextTick);
    }
};

const fakeEvent = (): WebSocketMessage => ({
    event: 'draft_created',
    data: {},
    broadcast: {} as WebsocketBroadcast,
    seq: 0,
});

describe('DraftSyncManager (Phase 3 shell)', () => {
    let database: Database;
    let operator: ServerDataOperator;
    let manager: InstanceType<typeof DraftSyncManagerSingleton>;

    const setSyncConfig = async (value: 'true' | 'false') => {
        await operator.handleConfigs({
            configs: [{id: 'AllowSyncedDrafts', value}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    };

    const createOutbox = async (status: DraftOutboxStatus, nextAttemptAt: number, channelId = CHANNEL_ID, rootId = ROOT_ID) => {
        await database.write(async (writer) => {
            const record = database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).prepareCreate((o) => {
                o._raw.id = buildDraftOutboxId(channelId, rootId);
                o.channelId = channelId;
                o.rootId = rootId;
                o.teamId = 'team1';
                o.operation = 'upsert';
                o.generation = 1;
                o.attemptCount = 0;
                o.nextAttemptAt = nextAttemptAt;
                o.keepLocal = false;
                o.status = status;
                o.lastErrorCode = null;
                o.deletedFingerprint = null;
            });
            await writer.batch(record);
        });
    };

    beforeEach(async () => {
        enableFakeTimers();
        await DatabaseManager.init([SERVER_URL]);
        database = DatabaseManager.serverDatabases[SERVER_URL]!.database;
        operator = DatabaseManager.serverDatabases[SERVER_URL]!.operator;
        manager = new DraftSyncManagerSingleton();
        mockedReconcile.mockReset();
        mockedReconcile.mockResolvedValue({applied: 0, drafts: []});
        mockedGetReconcilableKeys.mockReset();
        mockedGetReconcilableKeys.mockResolvedValue([]);
        mockedDeleteAbsentCleanDraft.mockReset();
        mockedDeleteAbsentCleanDraft.mockResolvedValue();
        mockedConfirmDeleteTombstone.mockReset();
        mockedConfirmDeleteTombstone.mockResolvedValue();
        mockedProcessOutboxUpsert.mockReset();
        mockedProcessOutboxUpsert.mockResolvedValue({outcome: 'done'});
        mockedProcessOutboxDelete.mockReset();
        mockedProcessOutboxDelete.mockResolvedValue({outcome: 'done'});
    });

    afterEach(async () => {
        jest.restoreAllMocks();
        await DatabaseManager.destroyServerDatabase(SERVER_URL);
        disableFakeTimers();
    });

    it('does not import or use the network client (sanity guard for the no-network constraint)', () => {
        // The manager module must never reach for a client in Phase 3.
        const getClientSpy = jest.spyOn(NetworkManager, 'getClient');
        manager.initialize(SERVER_URL);
        expect(getClientSpy).not.toHaveBeenCalled();
    });

    it('initialize arms NO timer with a pending row but no baseline and no known team (busy-loop guard)', async () => {
        await setSyncConfig('true');
        await createOutbox(DraftOutboxStatus.Pending, 0);

        await manager.initialize(SERVER_URL);

        // The drain timer needs a baseline; the reconcile timer needs a known team. On a cold start
        // there is neither, so nothing is armed — this is what prevents a setTimeout(0) busy loop.
        expect(jest.getTimerCount()).toBe(0);
    });

    it('initialize schedules no timer when sync is disabled even with an eligible outbox row', async () => {
        // No AllowSyncedDrafts config -> capability disabled.
        await createOutbox(DraftOutboxStatus.Pending, 0);

        await manager.initialize(SERVER_URL);

        expect(jest.getTimerCount()).toBe(0);
    });

    it('does not schedule a timer for rows that are not retry-eligible', async () => {
        await setSyncConfig('true');
        await createOutbox(DraftOutboxStatus.Blocked, 0);

        await manager.initialize(SERVER_URL);

        expect(jest.getTimerCount()).toBe(0);
    });

    it('a failed reconciliation GET arms a backoff reconcile timer (real delay, never a zero-delay loop)', async () => {
        await setSyncConfig('true');
        await createOutbox(DraftOutboxStatus.Pending, 0);
        mockedReconcile.mockResolvedValue({error: new Error('offline')});

        await manager.initialize(SERVER_URL);
        manager.requestReconcile(SERVER_URL, 'team1', 'trigger');
        await flushMicrotasks();

        // GET failed -> no baseline, so no drain timer; a reconcile-GET retry is armed with a real
        // (>= base) backoff delay so a persistently failing GET can never busy-loop.
        expect(jest.getTimerCount()).toBe(1);

        mockedReconcile.mockClear();
        await advanceTimers(0);
        expect(mockedReconcile).not.toHaveBeenCalled(); // not a zero-delay timer
    });

    it('invalidate synchronously increments the epoch, cancels the timer and clears the event buffer', async () => {
        await setSyncConfig('true');
        await createOutbox(DraftOutboxStatus.Pending, 0);
        mockedReconcile.mockResolvedValue({error: new Error('offline')});
        await manager.initialize(SERVER_URL);

        // Arm a (reconcile backoff) timer to have something to cancel.
        manager.requestReconcile(SERVER_URL, 'team1', 'x');
        await flushMicrotasks();

        manager.enqueueWebSocketEvent(SERVER_URL, fakeEvent());
        expect(internals(manager).eventBuffers[SERVER_URL].length).toBe(1);
        expect(jest.getTimerCount()).toBe(1);

        const epochBefore = internals(manager).lifecycleEpoch[SERVER_URL];
        manager.invalidate(SERVER_URL);

        expect(internals(manager).lifecycleEpoch[SERVER_URL]).toBe(epochBefore + 1);
        expect(jest.getTimerCount()).toBe(0);
        expect(internals(manager).eventBuffers[SERVER_URL].length).toBe(0);

        // Post-invalidate the server is treated as disabled: new events are ignored.
        manager.enqueueWebSocketEvent(SERVER_URL, fakeEvent());
        expect(internals(manager).eventBuffers[SERVER_URL].length).toBe(0);
    });

    it('rejects a timer continuation captured before invalidate as stale and touches nothing', async () => {
        await setSyncConfig('true');
        await createOutbox(DraftOutboxStatus.Pending, 0);
        mockedReconcile.mockResolvedValue({error: new Error('offline')});

        const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
        await manager.initialize(SERVER_URL);
        manager.requestReconcile(SERVER_URL, 'team1', 'x');
        await flushMicrotasks();

        // Capture the reconcile-timer callback the manager registered.
        const lastCall = setTimeoutSpy.mock.calls[setTimeoutSpy.mock.calls.length - 1];
        const fireCallback = lastCall[0] as () => void;

        manager.invalidate(SERVER_URL);
        mockedReconcile.mockClear();

        // Firing the stale continuation must not reconcile nor reschedule a timer.
        fireCallback();
        await advanceTimers(0);

        expect(mockedReconcile).not.toHaveBeenCalled();
        expect(jest.getTimerCount()).toBe(0);
    });

    it('enqueueWebSocketEvent appends synchronously and enforces MAX_DRAFT_SYNC_EVENT_BUFFER', async () => {
        await setSyncConfig('true');
        await manager.initialize(SERVER_URL);

        const logSpy = jest.spyOn(log, 'logDebug');

        // Push cap + 1 events; the buffer must stop growing at the cap and log one overflow.
        for (let i = 0; i < MAX_DRAFT_SYNC_EVENT_BUFFER + 1; i++) {
            manager.enqueueWebSocketEvent(SERVER_URL, fakeEvent());
        }

        expect(internals(manager).eventBuffers[SERVER_URL].length).toBe(MAX_DRAFT_SYNC_EVENT_BUFFER);
        expect(logSpy).toHaveBeenCalledWith(
            'DraftSyncManager.enqueueWebSocketEvent: buffer overflow, dropping event',
            SERVER_URL,
            MAX_DRAFT_SYNC_EVENT_BUFFER,
        );
    });

    it('handleCapabilityChange clears the baseline gate on disable and requires a fresh GET on re-enable, keeping durable rows', async () => {
        await setSyncConfig('true');
        await createOutbox(DraftOutboxStatus.Pending, 0);
        mockedReconcile.mockResolvedValue({applied: 0, drafts: []});
        await manager.initialize(SERVER_URL);

        // Establish a baseline + a known team.
        manager.requestReconcile(SERVER_URL, 'team1', 'first');
        await flushMicrotasks();
        expect(baselineInternals(manager).baseline[SERVER_URL]).toBeDefined();

        // enabled -> disabled: the baseline gate is reset and timers are cleared (a re-enable must not
        // drain against a stale snapshot), but the durable outbox row is preserved.
        await setSyncConfig('false');
        await manager.handleCapabilityChange(SERVER_URL);
        expect(baselineInternals(manager).baseline[SERVER_URL]).toBeUndefined();
        expect(jest.getTimerCount()).toBe(0);

        const rows = await database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).query(
            Q.where('status', DraftOutboxStatus.Pending),
        ).fetch();
        expect(rows.length).toBe(1);

        // disabled -> enabled with a known team: a fresh reconciliation GET is triggered before any
        // draining resumes (no draining against the pre-disable baseline).
        mockedReconcile.mockClear();
        await setSyncConfig('true');
        await manager.handleCapabilityChange(SERVER_URL);
        await flushMicrotasks();
        expect(mockedReconcile).toHaveBeenCalled();
    });

    describe('requestReconcile (Phase 4.1 additive reconciliation)', () => {
        const enableManager = async () => {
            await setSyncConfig('true');
            await manager.initialize(SERVER_URL);
        };

        it('runs reconcileTeamDrafts and records a baseline on success', async () => {
            await enableManager();
            mockedReconcile.mockResolvedValue({applied: 2, drafts: []});

            manager.requestReconcile(SERVER_URL, 'team1', 'test');
            await flushMicrotasks();

            expect(mockedReconcile).toHaveBeenCalledTimes(1);
            expect(mockedReconcile).toHaveBeenCalledWith(SERVER_URL, 'team1');
            expect(baselineInternals(manager).baseline[SERVER_URL]?.teamId).toBe('team1');
        });

        it('does not record a baseline when reconciliation fails', async () => {
            await enableManager();
            mockedReconcile.mockResolvedValue({error: new Error('boom')});

            manager.requestReconcile(SERVER_URL, 'team1', 'test');
            await flushMicrotasks();

            expect(mockedReconcile).toHaveBeenCalledTimes(1);
            expect(baselineInternals(manager).baseline[SERVER_URL]).toBeUndefined();
        });

        it('does not record a baseline when the epoch is invalidated mid-flight', async () => {
            await enableManager();

            let resolveReconcile: (v: {applied?: number}) => void = () => {};
            mockedReconcile.mockReturnValue(new Promise((resolve) => {
                resolveReconcile = resolve;
            }));

            manager.requestReconcile(SERVER_URL, 'team1', 'test');

            // Invalidate while the reconcile await is still outstanding, then let it resolve.
            manager.invalidate(SERVER_URL);
            resolveReconcile({applied: 1});
            await flushMicrotasks();

            expect(baselineInternals(manager).baseline[SERVER_URL]).toBeUndefined();
        });

        it('coalesces rapid requests: reconciles once, then re-runs once for the coalesced request', async () => {
            await enableManager();

            let resolveFirst: (v: {applied?: number}) => void = () => {};
            mockedReconcile.
                mockReturnValueOnce(new Promise((resolve) => {
                    resolveFirst = resolve;
                })).
                mockResolvedValue({applied: 0, drafts: []});

            // First request starts in-flight; the second coalesces behind it.
            manager.requestReconcile(SERVER_URL, 'team1', 'first');
            manager.requestReconcile(SERVER_URL, 'team2', 'second');

            expect(mockedReconcile).toHaveBeenCalledTimes(1);

            // Settle the first pass; the coalesced request drains and runs exactly once more.
            resolveFirst({applied: 1});
            await flushMicrotasks();

            expect(mockedReconcile).toHaveBeenCalledTimes(2);
            expect(mockedReconcile).toHaveBeenNthCalledWith(1, SERVER_URL, 'team1');
            expect(mockedReconcile).toHaveBeenNthCalledWith(2, SERVER_URL, 'team2');
            expect(baselineInternals(manager).baseline[SERVER_URL]?.teamId).toBe('team2');
        });
    });

    describe('runAbsencePass (Phase 4.2 absence quarantine + delete confirmation)', () => {
        const DRAFT_KEY = buildDraftOutboxId(CHANNEL_ID, ROOT_ID);

        const enableManager = async () => {
            await setSyncConfig('true');
            await manager.initialize(SERVER_URL);
        };

        const cleanDraftKey = (over: Partial<ReconcileKey> = {}): ReconcileKey => ({
            channelId: CHANNEL_ID,
            rootId: ROOT_ID,
            kind: 'draft',
            serverUpdateAt: 1000,
            hasOutbox: false,
            authoritative: true,
            ...over,
        });

        const tombstoneKey = (over: Partial<ReconcileKey> = {}): ReconcileKey => ({
            channelId: CHANNEL_ID,
            rootId: ROOT_ID,
            kind: 'tombstone',
            serverUpdateAt: 0,
            hasOutbox: true,
            outboxOperation: DraftOutboxOperation.Delete,
            outboxStatus: DraftOutboxStatus.Pending,
            keepLocal: false,
            authoritative: true,
            ...over,
        });

        const candidates = () => baselineInternals(manager).absenceCandidates[SERVER_URL];

        it('quarantines a clean absent key on first absence without deleting it', async () => {
            await enableManager();
            mockedReconcile.mockResolvedValue({applied: 0, drafts: []});
            mockedGetReconcilableKeys.mockResolvedValue([cleanDraftKey()]);

            manager.requestReconcile(SERVER_URL, 'team1', 'first');
            await flushMicrotasks();

            expect(candidates().get(DRAFT_KEY)?.teamId).toBe('team1');
            expect(candidates().size).toBe(1);
            expect(mockedDeleteAbsentCleanDraft).not.toHaveBeenCalled();
        });

        it('deletes a clean key on the auto-scheduled second same-scope absence after the delay and clears the candidate', async () => {
            await enableManager();
            mockedReconcile.mockResolvedValue({applied: 0, drafts: []});
            mockedGetReconcilableKeys.mockResolvedValue([cleanDraftKey()]);
            // Simulate production: once deleted, the key leaves the reconcilable universe.
            mockedDeleteAbsentCleanDraft.mockImplementation(async () => {
                mockedGetReconcilableKeys.mockResolvedValue([]);
            });

            manager.requestReconcile(SERVER_URL, 'team1', 'first');
            await flushMicrotasks();

            // First absence only quarantines; the manager auto-schedules the delayed second GET.
            expect(mockedDeleteAbsentCleanDraft).not.toHaveBeenCalled();

            await advanceTimers(DRAFT_ABSENCE_CONFIRMATION_DELAY_MS);
            await flushMicrotasks();

            expect(mockedDeleteAbsentCleanDraft).toHaveBeenCalledTimes(1);
            expect(mockedDeleteAbsentCleanDraft).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, ROOT_ID);
            expect(candidates().has(DRAFT_KEY)).toBe(false);
        });

        it('does not delete when the second absence occurs before the delay elapses', async () => {
            await enableManager();
            mockedReconcile.mockResolvedValue({applied: 0, drafts: []});
            mockedGetReconcilableKeys.mockResolvedValue([cleanDraftKey()]);

            manager.requestReconcile(SERVER_URL, 'team1', 'first');
            await flushMicrotasks();

            await advanceTimers(DRAFT_ABSENCE_CONFIRMATION_DELAY_MS - 1);

            manager.requestReconcile(SERVER_URL, 'team1', 'second');
            await flushMicrotasks();

            expect(mockedDeleteAbsentCleanDraft).not.toHaveBeenCalled();
            expect(candidates().has(DRAFT_KEY)).toBe(true);
        });

        it('clears the candidate and never deletes when the key reappears in the snapshot', async () => {
            await enableManager();
            mockedGetReconcilableKeys.mockResolvedValue([cleanDraftKey()]);

            // First reconcile: key absent from the snapshot -> quarantined.
            mockedReconcile.mockResolvedValue({applied: 0, drafts: []});
            manager.requestReconcile(SERVER_URL, 'team1', 'first');
            await flushMicrotasks();
            expect(candidates().has(DRAFT_KEY)).toBe(true);

            // Second reconcile: key present in the snapshot -> candidate cleared, no deletion.
            mockedReconcile.mockResolvedValue({applied: 0, drafts: [{channelId: CHANNEL_ID, rootId: ROOT_ID} as NormalizedDraft]});
            await advanceTimers(DRAFT_ABSENCE_CONFIRMATION_DELAY_MS);
            manager.requestReconcile(SERVER_URL, 'team1', 'second');
            await flushMicrotasks();

            expect(candidates().has(DRAFT_KEY)).toBe(false);
            expect(mockedDeleteAbsentCleanDraft).not.toHaveBeenCalled();
        });

        it('runs no absence pass and deletes nothing when reconciliation fails', async () => {
            await enableManager();
            mockedReconcile.mockResolvedValue({error: new Error('boom')});
            mockedGetReconcilableKeys.mockResolvedValue([cleanDraftKey()]);

            manager.requestReconcile(SERVER_URL, 'team1', 'first');
            await flushMicrotasks();

            expect(mockedGetReconcilableKeys).not.toHaveBeenCalled();
            expect(mockedDeleteAbsentCleanDraft).not.toHaveBeenCalled();
            expect(candidates().size).toBe(0);
        });

        it('confirms a delete tombstone via confirmDeleteTombstone on the auto-scheduled second same-scope absence past the delay', async () => {
            await enableManager();
            mockedReconcile.mockResolvedValue({applied: 0, drafts: []});
            mockedGetReconcilableKeys.mockResolvedValue([tombstoneKey()]);
            mockedConfirmDeleteTombstone.mockImplementation(async () => {
                mockedGetReconcilableKeys.mockResolvedValue([]);
            });

            manager.requestReconcile(SERVER_URL, 'team1', 'first');
            await flushMicrotasks();
            expect(mockedConfirmDeleteTombstone).not.toHaveBeenCalled();
            expect(candidates().get(DRAFT_KEY)?.teamId).toBe('team1');

            await advanceTimers(DRAFT_ABSENCE_CONFIRMATION_DELAY_MS);
            await flushMicrotasks();

            expect(mockedConfirmDeleteTombstone).toHaveBeenCalledTimes(1);
            expect(mockedConfirmDeleteTombstone).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, ROOT_ID);
            expect(mockedDeleteAbsentCleanDraft).not.toHaveBeenCalled();
            expect(candidates().has(DRAFT_KEY)).toBe(false);
        });

        it('does not confirm when the next observation is under a different teamId scope (window restarts)', async () => {
            await enableManager();
            mockedReconcile.mockResolvedValue({applied: 0, drafts: []});
            mockedGetReconcilableKeys.mockResolvedValue([cleanDraftKey()]);

            manager.requestReconcile(SERVER_URL, 'team1', 'first');
            await flushMicrotasks();
            expect(candidates().get(DRAFT_KEY)?.teamId).toBe('team1');

            // A team switch reconciles under team2 (which also clears the team1 auto-timer). The team2
            // observation sees a team1 candidate, so the window restarts under team2 and nothing is
            // confirmed — scope, not timing, is the gate here.
            manager.requestReconcile(SERVER_URL, 'team2', 'second-other-scope');
            await flushMicrotasks();

            expect(candidates().get(DRAFT_KEY)?.teamId).toBe('team2');
            expect(mockedDeleteAbsentCleanDraft).not.toHaveBeenCalled();
        });

        it('drops an ineligible key candidate (preserve) instead of deleting it', async () => {
            await enableManager();
            mockedReconcile.mockResolvedValue({applied: 0, drafts: []});

            // First pass: eligible clean key -> quarantined.
            mockedGetReconcilableKeys.mockResolvedValue([cleanDraftKey()]);
            manager.requestReconcile(SERVER_URL, 'team1', 'first');
            await flushMicrotasks();
            expect(candidates().has(DRAFT_KEY)).toBe(true);

            // Second pass past the delay, but the key is now non-authoritative (membership lost).
            mockedGetReconcilableKeys.mockResolvedValue([cleanDraftKey({authoritative: false})]);
            await advanceTimers(DRAFT_ABSENCE_CONFIRMATION_DELAY_MS);
            manager.requestReconcile(SERVER_URL, 'team1', 'second');
            await flushMicrotasks();

            expect(mockedDeleteAbsentCleanDraft).not.toHaveBeenCalled();
            expect(candidates().has(DRAFT_KEY)).toBe(false);
        });
    });

    describe('drainOutbox (Phase 4.3 outbox workers)', () => {
        const enableManager = async () => {
            await setSyncConfig('true');
            await manager.initialize(SERVER_URL);
        };

        const setBaseline = (tId = 'team1') => {
            baselineInternals(manager).baseline[SERVER_URL] = {teamId: tId, at: Date.now()};
        };

        const createOutboxRow = async (over: {
            operation?: 'upsert' | 'delete';
            status?: DraftOutboxStatus;
            nextAttemptAt?: number;
            channelId?: string;
            rootId?: string;
            teamId?: string;
        } = {}) => {
            const channelId = over.channelId ?? CHANNEL_ID;
            const rootId = over.rootId ?? ROOT_ID;
            await database.write(async (writer) => {
                const record = database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).prepareCreate((o) => {
                    o._raw.id = buildDraftOutboxId(channelId, rootId);
                    o.channelId = channelId;
                    o.rootId = rootId;
                    o.teamId = over.teamId ?? 'team1';
                    o.operation = over.operation ?? 'upsert';
                    o.generation = 1;
                    o.attemptCount = 0;
                    o.nextAttemptAt = over.nextAttemptAt ?? 0;
                    o.keepLocal = false;
                    o.status = over.status ?? DraftOutboxStatus.Pending;
                    o.lastErrorCode = null;
                    o.deletedFingerprint = null;
                });
                await writer.batch(record);
            });
        };

        it('does nothing (no worker call) when there is no baseline', async () => {
            await enableManager();
            await createOutboxRow();

            manager.wake(SERVER_URL);
            await flushMicrotasks();

            expect(mockedProcessOutboxUpsert).not.toHaveBeenCalled();
            expect(mockedProcessOutboxDelete).not.toHaveBeenCalled();
        });

        it('drains an eligible pending upsert and delete once a baseline exists', async () => {
            await enableManager();
            setBaseline();
            await createOutboxRow({operation: 'upsert', channelId: CHANNEL_ID});

            const deleteChannel = 'deletechanneldeletechannel00';
            await createOutboxRow({operation: 'delete', channelId: deleteChannel});

            manager.wake(SERVER_URL);
            await flushMicrotasks();

            expect(mockedProcessOutboxUpsert).toHaveBeenCalledTimes(1);
            expect(mockedProcessOutboxUpsert).toHaveBeenCalledWith(SERVER_URL, CHANNEL_ID, ROOT_ID);
            expect(mockedProcessOutboxDelete).toHaveBeenCalledTimes(1);
            expect(mockedProcessOutboxDelete).toHaveBeenCalledWith(SERVER_URL, deleteChannel, ROOT_ID);
        });

        it('skips a key already marked in-flight', async () => {
            await enableManager();
            setBaseline();
            await createOutboxRow();

            // Pre-mark the key in-flight to simulate an overlapping drain holding it.
            internals(manager).inFlightKeys[SERVER_URL].add(buildDraftOutboxId(CHANNEL_ID, ROOT_ID));

            manager.wake(SERVER_URL);
            await flushMicrotasks();

            expect(mockedProcessOutboxUpsert).not.toHaveBeenCalled();
        });

        it('does not drain ConfirmingDelete, Blocked, or WaitingForUpload rows', async () => {
            await enableManager();
            setBaseline();
            await createOutboxRow({operation: 'delete', status: DraftOutboxStatus.ConfirmingDelete, channelId: 'confirmdelchan0confirmdelcha0'});
            await createOutboxRow({operation: 'upsert', status: DraftOutboxStatus.Blocked, channelId: 'blockedchan00blockedchan0000'});
            await createOutboxRow({operation: 'upsert', status: DraftOutboxStatus.WaitingForUpload, channelId: 'waitupchan000waitupchan00000'});

            manager.wake(SERVER_URL);
            await flushMicrotasks();

            expect(mockedProcessOutboxUpsert).not.toHaveBeenCalled();
            expect(mockedProcessOutboxDelete).not.toHaveBeenCalled();
        });

        it('does not drain a row scheduled for the future (nextAttemptAt > now)', async () => {
            await enableManager();
            setBaseline();
            await createOutboxRow({nextAttemptAt: Date.now() + 60000});

            manager.wake(SERVER_URL);
            await flushMicrotasks();

            expect(mockedProcessOutboxUpsert).not.toHaveBeenCalled();
        });

        it('disables the server and clears the timer on a suspend outcome', async () => {
            await enableManager();
            setBaseline();
            await createOutboxRow();
            mockedProcessOutboxUpsert.mockResolvedValue({outcome: 'suspend'});

            manager.wake(SERVER_URL);
            await flushMicrotasks();

            expect(jest.getTimerCount()).toBe(0);

            // The server is now disabled for the session: new events are ignored.
            manager.enqueueWebSocketEvent(SERVER_URL, fakeEvent());
            expect(internals(manager).eventBuffers[SERVER_URL].length).toBe(0);
        });

        it('discards the drain result when the epoch is invalidated mid-drain', async () => {
            await enableManager();
            setBaseline();
            await createOutboxRow({channelId: CHANNEL_ID});
            await createOutboxRow({channelId: 'secondchannel0secondchannel0'});

            // The first worker invalidates the manager while draining; the loop must then stop and
            // never process the second eligible row.
            mockedProcessOutboxUpsert.mockImplementation(async () => {
                manager.invalidate(SERVER_URL);
                return {outcome: 'done'};
            });

            manager.wake(SERVER_URL);
            await flushMicrotasks();

            expect(mockedProcessOutboxUpsert).toHaveBeenCalledTimes(1);
            expect(jest.getTimerCount()).toBe(0);
        });

        it('initialize transitions a WaitingForUpload row to BlockedUpload(upload_interrupted)', async () => {
            await setSyncConfig('true');
            await createOutbox(DraftOutboxStatus.WaitingForUpload, 0);

            await manager.initialize(SERVER_URL);

            const rows = await database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).query(
                Q.where('channel_id', CHANNEL_ID),
            ).fetch();
            expect(rows.length).toBe(1);
            expect(rows[0].status).toBe(DraftOutboxStatus.BlockedUpload);
            expect(rows[0].lastErrorCode).toBe('upload_interrupted');
        });
    });

    it('exposes a singleton default instance', () => {
        expect(DraftSyncManagerDefault).toBeDefined();
    });
});
