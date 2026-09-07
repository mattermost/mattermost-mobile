// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientEphemeralModeMix} from './ephemeral_mode';

describe('ClientEphemeralMode', () => {
    let client: ClientEphemeralModeMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    it('should POST offline_time_minutes and purge_at to the purge route', async () => {
        const expectedUrl = `${client.urlVersion}/ephemeral_mode/purge`;
        const expectedOptions = {
            method: 'post',
            body: {offline_time_minutes: 42, purge_at: 1000},
        };

        await client.logOfflinePurge(42, 1000);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    it('should include error_reason in the purge body when a reason is passed', async () => {
        const expectedUrl = `${client.urlVersion}/ephemeral_mode/purge`;
        const expectedOptions = {
            method: 'post',
            body: {offline_time_minutes: 42, purge_at: 1000, error_reason: 'database wipe failed after retries'},
        };

        await client.logOfflinePurge(42, 1000, 'database wipe failed after retries');

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    it('should POST posts_deleted, playbook_runs_deleted, and cleanup_at to the cleanup route', async () => {
        const expectedUrl = `${client.urlVersion}/ephemeral_mode/cleanup`;
        const expectedOptions = {
            method: 'post',
            body: {posts_deleted: 3, playbook_runs_deleted: 1, cleanup_at: 2000},
        };

        await client.logCleanup(3, 1, 2000);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    it('should include error_reason in the cleanup body when a reason is passed', async () => {
        const expectedUrl = `${client.urlVersion}/ephemeral_mode/cleanup`;
        const expectedOptions = {
            method: 'post',
            body: {posts_deleted: 3, playbook_runs_deleted: 1, cleanup_at: 2000, error_reason: 'cleanup failed before completion'},
        };

        await client.logCleanup(3, 1, 2000, 'cleanup failed before completion');

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    it('should POST user_id and wipe_at to the wipe route', async () => {
        const expectedUrl = `${client.urlVersion}/ephemeral_mode/wipe`;
        const expectedOptions = {
            method: 'post',
            body: {user_id: 'user123', wipe_at: 3000},
        };

        await client.logSessionWipe('user123', 3000);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    it('should include error_reason in the wipe body when a reason is passed', async () => {
        const expectedUrl = `${client.urlVersion}/ephemeral_mode/wipe`;
        const expectedOptions = {
            method: 'post',
            body: {user_id: 'user123', wipe_at: 3000, error_reason: 'terminateSession failed: databaseOperation'},
        };

        await client.logSessionWipe('user123', 3000, 'terminateSession failed: databaseOperation');

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});
