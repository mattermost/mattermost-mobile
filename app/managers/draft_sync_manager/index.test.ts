// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {DraftOutboxStatus, MAX_DRAFT_SYNC_EVENT_BUFFER} from '@constants/draft';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {buildDraftOutboxId} from '@queries/servers/drafts';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';
import * as log from '@utils/log';

import {exportedForTesting, default as DraftSyncManagerDefault} from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type DraftOutboxModel from '@typings/database/models/servers/draft_outbox';

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
};

const internals = (manager: InstanceType<typeof DraftSyncManagerSingleton>) =>
    manager as unknown as ManagerInternals;

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

    it('initialize reads capability and schedules a retry timer when an eligible outbox row exists and sync is enabled', async () => {
        await setSyncConfig('true');
        await createOutbox(DraftOutboxStatus.Pending, 0);

        await manager.initialize(SERVER_URL);

        expect(jest.getTimerCount()).toBe(1);
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

    it('the retry timer firing performs no network call and reschedules itself', async () => {
        await setSyncConfig('true');
        await createOutbox(DraftOutboxStatus.Pending, 0);

        const getClientSpy = jest.spyOn(NetworkManager, 'getClient');
        const querySpy = jest.spyOn(database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX), 'query');

        await manager.initialize(SERVER_URL);
        expect(jest.getTimerCount()).toBe(1);

        querySpy.mockClear();

        // Fire the heartbeat. It must re-query the outbox and reschedule (row still eligible)
        // without ever touching the network.
        await advanceTimers(1);

        expect(getClientSpy).not.toHaveBeenCalled();
        expect(querySpy).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(1);
    });

    it('invalidate synchronously increments the epoch, cancels the timer and clears the event buffer', async () => {
        await setSyncConfig('true');
        await createOutbox(DraftOutboxStatus.Pending, 0);
        await manager.initialize(SERVER_URL);

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

    it('rejects a retry-timer continuation captured before invalidate as stale and touches nothing', async () => {
        await setSyncConfig('true');
        await createOutbox(DraftOutboxStatus.Pending, 0);

        const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
        await manager.initialize(SERVER_URL);

        // Capture the heartbeat callback the manager registered.
        const lastCall = setTimeoutSpy.mock.calls[setTimeoutSpy.mock.calls.length - 1];
        const fireCallback = lastCall[0] as () => void;

        manager.invalidate(SERVER_URL);

        const querySpy = jest.spyOn(database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX), 'query');

        // Firing the stale continuation must not re-query the DB nor reschedule a timer.
        fireCallback();
        await advanceTimers(0);

        expect(querySpy).not.toHaveBeenCalled();
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

    it('handleCapabilityChange reconstructs the timer on disabled->enabled and cancels it on enabled->disabled without deleting outbox rows', async () => {
        // Start disabled with an eligible row: initialize leaves capability off and no timer.
        await createOutbox(DraftOutboxStatus.Pending, 0);
        await manager.initialize(SERVER_URL);
        expect(jest.getTimerCount()).toBe(0);

        // disabled -> enabled reconstructs the heartbeat.
        await setSyncConfig('true');
        await manager.handleCapabilityChange(SERVER_URL);
        expect(jest.getTimerCount()).toBe(1);

        // enabled -> disabled cancels the timer but keeps the durable outbox row.
        await setSyncConfig('false');
        await manager.handleCapabilityChange(SERVER_URL);
        expect(jest.getTimerCount()).toBe(0);

        const rows = await database.collections.get<DraftOutboxModel>(DRAFT_OUTBOX).query(
            Q.where('status', DraftOutboxStatus.Pending),
        ).fetch();
        expect(rows.length).toBe(1);
    });

    it('exposes a singleton default instance', () => {
        expect(DraftSyncManagerDefault).toBeDefined();
    });
});
