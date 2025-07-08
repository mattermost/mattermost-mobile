// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getMyChannel} from '@queries/servers/channel';
import TestHelper from '@test/test_helper';

import {updateLastPlaybookRunsFetchAt} from './channel';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const channelId = 'channelid1';

const channel: Channel = TestHelper.fakeChannel({
    id: channelId,
    team_id: 'teamid1',
    total_msg_count: 0,
});

const channelMember: ChannelMembership = TestHelper.fakeChannelMember({
    id: 'id',
    channel_id: channelId,
    msg_count: 0,
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('updateLastPlaybookRunsFetchAt', () => {
    it('should handle not found database', async () => {
        const {data, error} = await updateLastPlaybookRunsFetchAt('foo', channelId, Date.now());
        expect(data).toBeFalsy();
        expect(error).toBeTruthy();
    });

    it('should handle channel not found', async () => {
        const {data, error} = await updateLastPlaybookRunsFetchAt(serverUrl, 'nonexistent', Date.now());
        expect(data).toBe(false);
        expect(error).toBeUndefined();
    });

    it('should update lastPlaybookRunsFetchAt successfully', async () => {
        // Setup channel and member
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});

        const lastPlaybookRunsFetchAt = Date.now();
        const {data, error} = await updateLastPlaybookRunsFetchAt(serverUrl, channelId, lastPlaybookRunsFetchAt);

        expect(error).toBeUndefined();
        expect(data).toBe(true);

        // Verify the update was persisted
        const myChannel = await getMyChannel(operator.database, channelId);
        expect(myChannel).toBeDefined();
        expect(myChannel!.lastPlaybookRunsFetchAt).toBe(lastPlaybookRunsFetchAt);
    });

    it('should handle database write errors', async () => {
        // Setup channel and member
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});

        // Mock database.write to throw an error
        const originalWrite = operator.database.write;
        operator.database.write = jest.fn().mockRejectedValue(new Error('Database write failed'));

        const {data, error} = await updateLastPlaybookRunsFetchAt(serverUrl, channelId, Date.now());

        expect(data).toBeUndefined();
        expect(error).toBeTruthy();

        // Restore original method
        operator.database.write = originalWrite;
    });
});
