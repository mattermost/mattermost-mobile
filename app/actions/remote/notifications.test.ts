// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {Platform} from 'react-native';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import TestHelper from '@test/test_helper';

import {
    fetchNotificationData,
    backgroundNotification,
    openNotification,
    sendTestNotification,
} from './notifications';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const teamId = 'teamid1';
const team: Team = {
    id: teamId,
    name: 'team1',
} as Team;

const channelId = 'channelid1';
const channel: Channel = {
    id: channelId,
    display_name: 'channelname',
    team_id: '',
    total_msg_count: 0,
    delete_at: 0,
} as Channel;

const user1 = {id: 'userid1', username: 'user1', email: 'user1@mattermost.com', roles: ''} as UserProfile;

const post1 = {...TestHelper.fakePost(channelId), id: 'postid1'};

const notificationExtraData = {
    channel,
    myChannel: {channel_id: channelId, user_id: user1.id, roles: ''} as ChannelMembership,
    team,
    myTeam: {team_id: teamId, user_id: user1.id, roles: ''} as TeamMembership,
    posts: {posts: {[post1.id]: post1}, order: [post1.id], next: 0, prev: 0},
    categoryChannels: [{channel_id: channelId, category_id: 'categoryid1', sort_order: 0} as CategoryChannel],
    categories: {categories: [{id: 'categoryid1', team_id: teamId, display_name: 'category1', sort_order: 0, sorting: 'alpha', type: 'custom', muted: false, collapsed: false, channel_ids: [channelId]}], order: ['categoryid1']},
} as NotificationExtraData;

const notificationData = {
    channel_id: channelId,
    team_id: teamId,
    post_id: post1.id,
    type: 'type',
    version: 'version',
    isCRTEnabled: false,
    data: notificationExtraData,
} as NotificationData;

const notificationWithData = {
    payload: notificationData,
} as NotificationWithData;

const throwFunc = (e?: string) => {
    throw Error(e == null ? 'error' : e);
};

let mockEmitNotificationError: jest.Mock;
jest.mock('@utils/notification', () => {
    const original = jest.requireActual('@utils/notification');
    mockEmitNotificationError = jest.fn();
    return {
        ...original,
        emitNotificationError: mockEmitNotificationError,
    };
});

const mockClient = {
    getTeam: jest.fn((id: string) => ({id, name: 'team1'})),
    getTeamMember: jest.fn((id: string, userId: string) => ({id: userId + '-' + id, user_id: userId === 'me' ? user1.id : userId, team_id: id, roles: ''})),
    getChannel: jest.fn((_channelId: string) => ({...channel, id: _channelId})),
    getChannelMember: jest.fn((_channelId: string, userId: string) => ({id: userId + '-' + _channelId, user_id: userId === 'me' ? user1.id : userId, channel_id: _channelId, roles: ''})),
    sendTestNotification: jest.fn(),
};

beforeAll(() => {
    // eslint-disable-next-line
    // @ts-ignore
    NetworkManager.getClient = (url) => {
        if (serverUrl === url) {
            return mockClient;
        }
        throw new Error('invalid url');
    };
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

afterAll(() => {
    // This removes the timer set to log the results of the network metrics
    jest.clearAllTimers();
});

describe('notifications', () => {
    it('fetchNotificationData - handle no channel id', async () => {
        const result = await fetchNotificationData(serverUrl, {} as NotificationWithData);
        expect(result).toBeDefined();
        expect(result.error).toBe('No channel Id was specified');
    });

    it('fetchNotificationData - handle not found database', async () => {
        const result = await fetchNotificationData('foo', {payload: {channel_id: channelId}} as NotificationWithData);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchNotificationData - no team', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        mockClient.getTeam.mockImplementationOnce(jest.fn(throwFunc));

        const result = await fetchNotificationData(serverUrl, notificationWithData);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchNotificationData - no channel', async () => {
        const myTeams = [
            {
                id: team.id,
                roles: '',
            },
        ];

        await operator.handleMyTeam({
            myTeams,
            prepareRecordsOnly: false,
        });
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        mockClient.getChannel.mockImplementationOnce(jest.fn(() => ({...channel, delete_at: 1})));

        const result = await fetchNotificationData(serverUrl, notificationWithData);
        expect(result).toBeDefined();
        expect(result.error).toBe('Channel');
    });

    it('fetchNotificationData - base case', async () => {
        Platform.OS = 'android';
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

        const result = await fetchNotificationData(serverUrl, {payload: {...notificationData, team_id: ''}} as NotificationWithData);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('backgroundNotification - handle not found database', async () => {
        const result = await backgroundNotification('foo', {payload: {channel_id: channelId}} as NotificationWithData);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('backgroundNotification - handle no channel id', async () => {
        const result = await backgroundNotification(serverUrl, {} as NotificationWithData);
        expect(result).toBeDefined();
        expect(result.error).toMatchObject(new Error('No channel Id was specified'));
    });

    it('backgroundNotification - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

        const result = await backgroundNotification(serverUrl, {payload: {...notificationData, team_id: ''}} as NotificationWithData);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.models).toBeDefined();
        expect(result.models?.length).toBe(1); // team model
    });

    it('openNotification - handle not found database', async () => {
        const result = await openNotification('foo', {payload: {channel_id: channelId}} as NotificationWithData) as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('openNotification - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

        const result = await openNotification(serverUrl, {payload: {...notificationData, team_id: ''}} as NotificationWithData) as {error?: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });
});

describe('sendTestNotification', () => {
    it('calls client function and returns correctly', async () => {
        mockClient.sendTestNotification.mockResolvedValueOnce({status: 'OK'});
        const result = await sendTestNotification(serverUrl);
        expect(result.status).toBe('OK');
        expect(result.error).toBeUndefined();
        expect(mockClient.sendTestNotification).toHaveBeenCalled();
    });

    it('calls client function and returns correctly when error value', async () => {
        mockClient.sendTestNotification.mockRejectedValueOnce(new Error('some error'));
        const result = await sendTestNotification(serverUrl);
        expect(result.error).toBeTruthy();
        expect(mockClient.sendTestNotification).toHaveBeenCalled();
    });

    it('calls client function and returns error on throw', async () => {
        mockClient.sendTestNotification.mockImplementationOnce(() => {
            throw new Error('error');
        });
        const result = await sendTestNotification(serverUrl);
        expect(result.error).toBeTruthy();
        expect(mockClient.sendTestNotification).toHaveBeenCalled();
    });

    it('show error when wrong server url is used', async () => {
        const result = await sendTestNotification('bad server url');
        expect(result.error).toBeTruthy();
        expect(mockClient.sendTestNotification).not.toHaveBeenCalled();
    });
});
