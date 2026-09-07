// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo, {type NetInfoState} from '@react-native-community/netinfo';

import {replaceEphemeralModeAuditEvents} from '@actions/app/global';
import {enqueueAuditEvent, pruneAuditQueueOnSessionEnd} from '@actions/local/ephemeral_mode/audit_queue';
import {EphemeralModeAuditEventKind, MAX_AUDIT_SEND_ATTEMPTS, type EphemeralModeAuditEventInput} from '@constants/ephemeral_mode';
import DatabaseManager from '@database/manager';
import {getPreauthSecret} from '@init/credentials';
import NetworkManager from '@managers/network_manager';
import {getEphemeralModeAuditEvents} from '@queries/app/global';

import {flushAuditQueue, flushOrphanedAuditQueues} from './ephemeral_mode';

jest.mock('@react-native-community/netinfo');
jest.mock('@init/credentials', () => ({
    getPreauthSecret: jest.fn(),
}));
jest.mock('@managers/network_manager', () => ({
    getClient: jest.fn(),
    createClient: jest.fn(),
    invalidateClient: jest.fn(),
}));

const serverUrl = 'flush.test.com';

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const makeClient = () => ({
    logOfflinePurge: jest.fn().mockResolvedValue({status: 'OK'}),
    logCleanup: jest.fn().mockResolvedValue({status: 'OK'}),
    logSessionWipe: jest.fn().mockResolvedValue({status: 'OK'}),
});

const seed = async (event: EphemeralModeAuditEventInput) => {
    await enqueueAuditEvent(serverUrl, event);
};

describe('flushAuditQueue', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        jest.mocked(NetInfo.fetch).mockResolvedValue({isConnected: true} as NetInfoState);
    });

    afterEach(async () => {
        await replaceEphemeralModeAuditEvents(serverUrl, []);
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.clearAllMocks();
    });

    it('should not call the client when the queue is empty', async () => {
        await flushAuditQueue(serverUrl);

        expect(NetworkManager.getClient).not.toHaveBeenCalled();
    });

    it('should send one event of each kind to its matching client method, oldest-first, then clear the queue', async () => {
        await seed({kind: EphemeralModeAuditEventKind.OfflinePurge, offlineTimeMinutes: 30, occurredAt: 1000});
        await seed({kind: EphemeralModeAuditEventKind.Cleanup, postsDeleted: 2, playbookRunsDeleted: 0, occurredAt: 2000});
        await seed({kind: EphemeralModeAuditEventKind.SessionWipe, userId: 'user1', occurredAt: 3000});

        const client = makeClient();
        jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);

        await flushAuditQueue(serverUrl);

        expect(client.logOfflinePurge).toHaveBeenCalledWith(30, 1000, undefined);
        expect(client.logCleanup).toHaveBeenCalledWith(2, 0, 2000, undefined);
        expect(client.logSessionWipe).toHaveBeenCalledWith('user1', 3000, undefined);

        const purgeOrder = client.logOfflinePurge.mock.invocationCallOrder[0];
        const cleanupOrder = client.logCleanup.mock.invocationCallOrder[0];
        const wipeOrder = client.logSessionWipe.mock.invocationCallOrder[0];
        expect(purgeOrder).toBeLessThan(cleanupOrder);
        expect(cleanupOrder).toBeLessThan(wipeOrder);

        expect(await getEphemeralModeAuditEvents(serverUrl)).toHaveLength(0);
    });

    it('should requeue an event whose request failed without a status code', async () => {
        await seed({kind: EphemeralModeAuditEventKind.Cleanup, postsDeleted: 1, playbookRunsDeleted: 0, occurredAt: 1000});

        const client = makeClient();
        client.logCleanup.mockRejectedValue(new Error('network down'));
        jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);

        await flushAuditQueue(serverUrl);

        const events = await getEphemeralModeAuditEvents(serverUrl);
        expect(events).toHaveLength(1);
    });

    it.each([408, 429, 500, 502, 503, 504])(
        'should requeue an event rejected with status code %d',
        async (statusCode) => {
            await seed({kind: EphemeralModeAuditEventKind.Cleanup, postsDeleted: 1, playbookRunsDeleted: 0, occurredAt: 1000});

            const client = makeClient();
            client.logCleanup.mockRejectedValue(Object.assign(new Error('rejected'), {status_code: statusCode}));
            jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);

            await flushAuditQueue(serverUrl);

            const events = await getEphemeralModeAuditEvents(serverUrl);
            expect(events).toHaveLength(1);
        },
    );

    it.each([400, 401, 403, 404, 501, 409])(
        'should drop an event rejected with unlisted status code %d',
        async (statusCode) => {
            await seed({kind: EphemeralModeAuditEventKind.Cleanup, postsDeleted: 1, playbookRunsDeleted: 0, occurredAt: 1000});

            const client = makeClient();
            client.logCleanup.mockRejectedValue(Object.assign(new Error('rejected'), {status_code: statusCode}));
            jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);

            await flushAuditQueue(serverUrl);

            const events = await getEphemeralModeAuditEvents(serverUrl);
            expect(events).toHaveLength(0);
        },
    );

    it('should forward a queued offlinePurge event\'s errorReason to logOfflinePurge as its third argument', async () => {
        await replaceEphemeralModeAuditEvents(serverUrl, [
            {id: 'evt1', kind: EphemeralModeAuditEventKind.OfflinePurge, offlineTimeMinutes: 30, occurredAt: 1000, attempts: 0, errorReason: 'database wipe failed after retries'},
        ]);

        const client = makeClient();
        jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);

        await flushAuditQueue(serverUrl);

        expect(client.logOfflinePurge).toHaveBeenCalledWith(30, 1000, 'database wipe failed after retries');
    });

    it('should forward a queued cleanup event\'s errorReason to logCleanup as its third argument', async () => {
        await replaceEphemeralModeAuditEvents(serverUrl, [
            {id: 'evt1', kind: EphemeralModeAuditEventKind.Cleanup, postsDeleted: 1, playbookRunsDeleted: 0, occurredAt: 1000, attempts: 0, errorReason: 'cleanup failed before completion'},
        ]);

        const client = makeClient();
        jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);

        await flushAuditQueue(serverUrl);

        expect(client.logCleanup).toHaveBeenCalledWith(1, 0, 1000, 'cleanup failed before completion');
    });

    it('should forward a queued sessionWipe event\'s errorReason to logSessionWipe as its third argument', async () => {
        await replaceEphemeralModeAuditEvents(serverUrl, [
            {id: 'evt1', kind: EphemeralModeAuditEventKind.SessionWipe, userId: 'user1', occurredAt: 1000, attempts: 0, errorReason: 'terminateSession failed: databaseOperation'},
        ]);

        const client = makeClient();
        jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);

        await flushAuditQueue(serverUrl);

        expect(client.logSessionWipe).toHaveBeenCalledWith('user1', 1000, 'terminateSession failed: databaseOperation');
    });

    it('should send nothing and leave the queue unchanged when the device is offline', async () => {
        await seed({kind: EphemeralModeAuditEventKind.Cleanup, postsDeleted: 1, playbookRunsDeleted: 0, occurredAt: 1000});
        jest.mocked(NetInfo.fetch).mockResolvedValue({isConnected: false} as NetInfoState);

        await flushAuditQueue(serverUrl);

        expect(NetworkManager.getClient).not.toHaveBeenCalled();
        const events = await getEphemeralModeAuditEvents(serverUrl);
        expect(events).toHaveLength(1);
        expect(events[0].attempts).toBe(0);
    });

    it('should increment attempts on an event whose request failed', async () => {
        await replaceEphemeralModeAuditEvents(serverUrl, [
            {id: 'evt1', kind: EphemeralModeAuditEventKind.Cleanup, postsDeleted: 1, playbookRunsDeleted: 0, occurredAt: 1000, attempts: 3},
        ]);

        const client = makeClient();
        client.logCleanup.mockRejectedValue(new Error('still failing'));
        jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);

        await flushAuditQueue(serverUrl);

        const events = await getEphemeralModeAuditEvents(serverUrl);
        expect(events).toHaveLength(1);
        expect(events[0].attempts).toBe(4);
    });

    it('should discard an event on its final allowed attempt', async () => {
        await replaceEphemeralModeAuditEvents(serverUrl, [
            {id: 'evt1', kind: EphemeralModeAuditEventKind.Cleanup, postsDeleted: 1, playbookRunsDeleted: 0, occurredAt: 1000, attempts: MAX_AUDIT_SEND_ATTEMPTS - 1},
        ]);

        const client = makeClient();
        client.logCleanup.mockRejectedValue(new Error('still failing'));
        jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);

        await flushAuditQueue(serverUrl);

        const events = await getEphemeralModeAuditEvents(serverUrl);
        expect(events).toHaveLength(0);
    });

    it('should keep session events queued when getClient throws, while still sending a queued sessionWipe', async () => {
        await replaceEphemeralModeAuditEvents(serverUrl, [
            {id: 'evt1', kind: EphemeralModeAuditEventKind.Cleanup, postsDeleted: 1, playbookRunsDeleted: 0, occurredAt: 1000, attempts: 0},
            {id: 'evt2', kind: EphemeralModeAuditEventKind.SessionWipe, userId: 'user1', occurredAt: 2000, attempts: 0},
        ]);

        jest.mocked(NetworkManager.getClient).mockImplementation(() => {
            throw new Error(`${serverUrl} client not found`);
        });
        jest.mocked(getPreauthSecret).mockResolvedValue('preauth-secret');
        const tokenlessClient = makeClient();
        jest.mocked(NetworkManager.createClient).mockResolvedValue(tokenlessClient as any);

        await flushAuditQueue(serverUrl);

        expect(tokenlessClient.logSessionWipe).toHaveBeenCalledWith('user1', 2000, undefined);

        const events = await getEphemeralModeAuditEvents(serverUrl);
        expect(events).toHaveLength(1);
        expect(events[0].kind).toBe(EphemeralModeAuditEventKind.Cleanup);
    });

    it('should keep an event enqueued while the requests were in flight', async () => {
        await replaceEphemeralModeAuditEvents(serverUrl, [
            {id: 'evt1', kind: EphemeralModeAuditEventKind.Cleanup, postsDeleted: 1, playbookRunsDeleted: 0, occurredAt: 1000, attempts: 0},
        ]);

        const client = makeClient();
        client.logCleanup.mockImplementation(async () => {
            await enqueueAuditEvent(serverUrl, {
                kind: EphemeralModeAuditEventKind.SessionWipe,
                userId: 'user2',
                occurredAt: 5000,
            });
            return {status: 'OK'};
        });
        jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);

        await flushAuditQueue(serverUrl);

        const events = await getEphemeralModeAuditEvents(serverUrl);
        expect(events).toHaveLength(1);
        expect(events[0].kind).toBe(EphemeralModeAuditEventKind.SessionWipe);
    });

    it('should not restore events pruned by a concurrent session end mid-flight', async () => {
        // evtA fails (would normally be kept with attempts+1), evtB's send triggers a
        // concurrent session end that prunes both session-bound events from storage,
        // and evtC (session-less) succeeds. A write-back computed from the stale
        // pre-flush snapshot would resurrect evtA; one that re-reads storage must not.
        await replaceEphemeralModeAuditEvents(serverUrl, [
            {id: 'evtA', kind: EphemeralModeAuditEventKind.Cleanup, postsDeleted: 1, playbookRunsDeleted: 0, occurredAt: 1000, attempts: 0},
            {id: 'evtB', kind: EphemeralModeAuditEventKind.Cleanup, postsDeleted: 1, playbookRunsDeleted: 0, occurredAt: 2000, attempts: 0},
            {id: 'evtC', kind: EphemeralModeAuditEventKind.SessionWipe, userId: 'user1', occurredAt: 3000, attempts: 0},
        ]);

        const client = makeClient();
        client.logCleanup.mockImplementation(async (_postsDeleted, _playbookRunsDeleted, occurredAt) => {
            if (occurredAt === 1000) {
                throw new Error('still failing');
            }

            // A session ends mid-flush and removes both session-bound events from
            // storage before this pass gets a chance to write evtA's outcome back.
            await pruneAuditQueueOnSessionEnd(serverUrl, false);
            return {status: 'OK'};
        });
        jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);

        await flushAuditQueue(serverUrl);

        const events = await getEphemeralModeAuditEvents(serverUrl);
        expect(events).toHaveLength(0);
    });

    it('should not send anything on a second flush for a server already flushing', async () => {
        await seed({kind: EphemeralModeAuditEventKind.Cleanup, postsDeleted: 1, playbookRunsDeleted: 0, occurredAt: 1000});

        const client = makeClient();
        jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);

        const first = flushAuditQueue(serverUrl);
        const second = flushAuditQueue(serverUrl);
        await Promise.all([first, second]);

        expect(NetworkManager.getClient).toHaveBeenCalledTimes(1);
    });

    it('should create and then invalidate a tokenless client for a sessionWipe when getClient throws', async () => {
        await seed({kind: EphemeralModeAuditEventKind.SessionWipe, userId: 'user1', occurredAt: 1000});

        jest.mocked(NetworkManager.getClient).mockImplementation(() => {
            throw new Error(`${serverUrl} client not found`);
        });
        jest.mocked(getPreauthSecret).mockResolvedValue('preauth-secret');
        const tokenlessClient = makeClient();
        jest.mocked(NetworkManager.createClient).mockResolvedValue(tokenlessClient as any);

        await flushAuditQueue(serverUrl);

        expect(NetworkManager.createClient).toHaveBeenCalledWith(serverUrl, undefined, 'preauth-secret');
        expect(tokenlessClient.logSessionWipe).toHaveBeenCalledWith('user1', 1000, undefined);
        expect(NetworkManager.invalidateClient).toHaveBeenCalledWith(serverUrl);
    });

    it('should reuse the existing client for a sessionWipe without invalidating it', async () => {
        await seed({kind: EphemeralModeAuditEventKind.SessionWipe, userId: 'user1', occurredAt: 1000});

        const client = makeClient();
        jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);

        await flushAuditQueue(serverUrl);

        expect(NetworkManager.createClient).not.toHaveBeenCalled();
        expect(client.logSessionWipe).toHaveBeenCalledWith('user1', 1000, undefined);
        expect(NetworkManager.invalidateClient).not.toHaveBeenCalled();
    });

    it('should create no client and not touch the Global key when getClient throws and nothing queued is a sessionWipe', async () => {
        await seed({kind: EphemeralModeAuditEventKind.Cleanup, postsDeleted: 1, playbookRunsDeleted: 0, occurredAt: 1000});

        jest.mocked(NetworkManager.getClient).mockImplementation(() => {
            throw new Error(`${serverUrl} client not found`);
        });

        await flushAuditQueue(serverUrl);

        expect(NetworkManager.createClient).not.toHaveBeenCalled();
        const events = await getEphemeralModeAuditEvents(serverUrl);
        expect(events).toHaveLength(1);
        expect(events[0].attempts).toBe(0);
    });
});

describe('flushOrphanedAuditQueues', () => {
    const credentialedUrl = 'flush-credentialed.test.com';
    const orphanedUrl = 'flush-orphaned.test.com';

    beforeEach(async () => {
        await DatabaseManager.init([credentialedUrl, orphanedUrl]);
        jest.mocked(NetInfo.fetch).mockResolvedValue({isConnected: true} as NetInfoState);

        await enqueueAuditEvent(credentialedUrl, {
            kind: EphemeralModeAuditEventKind.Cleanup,
            postsDeleted: 1,
            playbookRunsDeleted: 0,
            occurredAt: 1000,
        });
        await enqueueAuditEvent(orphanedUrl, {
            kind: EphemeralModeAuditEventKind.Cleanup,
            postsDeleted: 1,
            playbookRunsDeleted: 0,
            occurredAt: 1000,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(credentialedUrl);
        await DatabaseManager.destroyServerDatabase(orphanedUrl);
        jest.clearAllMocks();
    });

    it('should flush only the servers absent from the supplied credentials', async () => {
        const client = makeClient();
        jest.mocked(NetworkManager.getClient).mockReturnValue(client as any);

        await flushOrphanedAuditQueues([{serverUrl: credentialedUrl, userId: 'user1', token: 'token'}]);
        await flushPromises();

        expect(await getEphemeralModeAuditEvents(orphanedUrl)).toHaveLength(0);
        expect(await getEphemeralModeAuditEvents(credentialedUrl)).toHaveLength(1);
    });
});
