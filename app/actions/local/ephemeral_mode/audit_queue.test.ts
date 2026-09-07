// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {replaceEphemeralModeAuditEvents} from '@actions/app/global';
import {EphemeralModeAuditEventKind} from '@constants/ephemeral_mode';
import DatabaseManager from '@database/manager';
import {getEphemeralModeAuditEvents} from '@queries/app/global';

import {attachAuditEventErrorReason, enqueueAuditEvent, pruneAuditQueueOnSessionEnd} from './audit_queue';

const serverUrl = 'audit-queue.test.com';

describe('enqueueAuditEvent', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
    });

    afterEach(async () => {
        await replaceEphemeralModeAuditEvents(serverUrl, []);
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should append to an existing queue rather than overwriting it', async () => {
        await enqueueAuditEvent(serverUrl, {
            kind: EphemeralModeAuditEventKind.Cleanup,
            postsDeleted: 1,
            playbookRunsDeleted: 0,
            occurredAt: 1000,
        });
        await enqueueAuditEvent(serverUrl, {
            kind: EphemeralModeAuditEventKind.Cleanup,
            postsDeleted: 2,
            playbookRunsDeleted: 0,
            occurredAt: 2000,
        });

        const events = await getEphemeralModeAuditEvents(serverUrl);

        expect(events).toHaveLength(2);
        expect(events.map((e) => e.occurredAt)).toEqual([1000, 2000]);
    });

    it('should land both events when two enqueues for the same server race', async () => {
        const first = enqueueAuditEvent(serverUrl, {
            kind: EphemeralModeAuditEventKind.Cleanup,
            postsDeleted: 1,
            playbookRunsDeleted: 0,
            occurredAt: 1000,
        });
        const second = enqueueAuditEvent(serverUrl, {
            kind: EphemeralModeAuditEventKind.Cleanup,
            postsDeleted: 2,
            playbookRunsDeleted: 0,
            occurredAt: 2000,
        });

        await Promise.all([first, second]);

        const events = await getEphemeralModeAuditEvents(serverUrl);

        expect(events).toHaveLength(2);
    });

    it('should resolve with the id assigned to the enqueued event', async () => {
        const id = await enqueueAuditEvent(serverUrl, {
            kind: EphemeralModeAuditEventKind.Cleanup,
            postsDeleted: 1,
            playbookRunsDeleted: 0,
            occurredAt: 1000,
        });

        const events = await getEphemeralModeAuditEvents(serverUrl);

        expect(events[0].id).toBe(id);
    });
});

describe('attachAuditEventErrorReason', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
    });

    afterEach(async () => {
        await replaceEphemeralModeAuditEvents(serverUrl, []);
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should set errorReason on the event matching the given id, leaving every other queued event untouched', async () => {
        const targetId = await enqueueAuditEvent(serverUrl, {
            kind: EphemeralModeAuditEventKind.OfflinePurge,
            offlineTimeMinutes: 30,
            occurredAt: 1000,
        });
        await enqueueAuditEvent(serverUrl, {
            kind: EphemeralModeAuditEventKind.Cleanup,
            postsDeleted: 1,
            playbookRunsDeleted: 0,
            occurredAt: 2000,
        });

        await attachAuditEventErrorReason(serverUrl, targetId, 'database wipe failed after retries');

        const events = await getEphemeralModeAuditEvents(serverUrl);
        const target = events.find((event) => event.id === targetId);
        const other = events.find((event) => event.id !== targetId);

        expect(target?.errorReason).toBe('database wipe failed after retries');
        expect(other?.errorReason).toBeUndefined();
    });

    it('should leave the queue unchanged when the id no longer matches any queued event', async () => {
        await enqueueAuditEvent(serverUrl, {
            kind: EphemeralModeAuditEventKind.Cleanup,
            postsDeleted: 1,
            playbookRunsDeleted: 0,
            occurredAt: 1000,
        });

        await attachAuditEventErrorReason(serverUrl, 'already-flushed-id', 'database wipe failed after retries');

        const events = await getEphemeralModeAuditEvents(serverUrl);

        expect(events[0].errorReason).toBeUndefined();
    });
});

describe('pruneAuditQueueOnSessionEnd', () => {
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        await enqueueAuditEvent(serverUrl, {
            kind: EphemeralModeAuditEventKind.OfflinePurge,
            offlineTimeMinutes: 30,
            occurredAt: 1000,
        });
        await enqueueAuditEvent(serverUrl, {
            kind: EphemeralModeAuditEventKind.Cleanup,
            postsDeleted: 1,
            playbookRunsDeleted: 0,
            occurredAt: 2000,
        });
        await enqueueAuditEvent(serverUrl, {
            kind: EphemeralModeAuditEventKind.SessionWipe,
            userId: 'user1',
            occurredAt: 3000,
        });
    });

    afterEach(async () => {
        await replaceEphemeralModeAuditEvents(serverUrl, []);
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should remove offlinePurge and cleanup events while keeping sessionWipe', async () => {
        await pruneAuditQueueOnSessionEnd(serverUrl, false);

        const events = await getEphemeralModeAuditEvents(serverUrl);

        expect(events).toHaveLength(1);
        expect(events[0].kind).toBe(EphemeralModeAuditEventKind.SessionWipe);
    });

    it('should remove every event including sessionWipe when the server was removed', async () => {
        await pruneAuditQueueOnSessionEnd(serverUrl, true);

        const events = await getEphemeralModeAuditEvents(serverUrl);

        expect(events).toHaveLength(0);
    });
});
