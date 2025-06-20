// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {Platform} from 'react-native';

import * as PostActions from '@actions/local/post';
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

const post1 = TestHelper.fakePost({channel_id: channelId, id: 'postid1'});

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

describe('backgroundNotification boolean conversion', () => {
    const postId = 'postWithBooleans';
    const samplePostData = {
        posts: [
            {
                id: postId,
                props: {
                    attachments: [
                        {
                            id: 1,
                            fields: [
                                {title: 'Field1', short: 1},
                                {title: 'Field2', short: 0},
                                {title: 'Field3', short: true},
                                {title: 'Field4', short: false},
                                {title: 'Field5', short: undefined},
                                {title: 'Field6'},
                            ],
                            actions: [
                                {id: 'action1', disabled: 1},
                                {id: 'action2', disabled: 0},
                                {id: 'action3', disabled: true},
                                {id: 'action4', disabled: false},
                                {id: 'action5', disabled: undefined},
                                {id: 'action6'},
                            ],
                        },
                        {
                            id: 2,
                        },
                    ],
                },

                // Other necessary post props
                channel_id: channelId,
                create_at: 12345,
                update_at: 12345,
                delete_at: 0,
                message: 'Test message',
                user_id: user1.id,
                type: '',
                metadata: {},
                is_pinned: false, // Add other base post props as needed
                reply_count: 0,

                // Add potentially missing required props for type check, even if empty
                edit_at: 0,
                root_id: '',
                original_id: '',
                hashtags: '',
                pending_post_id: '',
            } as any, // Use 'as any' to bypass strict type checking for test data
        ],
        order: [postId],
        previousPostId: '',
    } as ProcessedPosts;

    let storePostsSpy: jest.SpyInstance;
    let freshNotificationWithBooleanPost: NotificationWithData;

    beforeEach(async () => {
        // Reset mocks and setup basic DB state for each test
        jest.clearAllMocks();

        // Reconstruct the notification object with deep-copied post data for each test
        const currentSamplePostData = JSON.parse(JSON.stringify(samplePostData)); // Deep copy
        freshNotificationWithBooleanPost = {
            payload: {
                ...notificationData,
                post_id: postId,
                data: {
                    ...notificationExtraData,
                    posts: {
                        posts: {[postId]: currentSamplePostData.posts[0]},
                        order: currentSamplePostData.order,

                        // Ensure previousPostId is handled if needed by processPostsFetched
                        prev_post_id: currentSamplePostData.previousPostId,
                    },
                },
            },

            // Add other required NotificationWithData properties
            identifier: 'test-identifier',
            foreground: false,
            userInteraction: false,
        } as any; // Use 'as any' to bypass strict type checking for test data

        // Spy on the actual function and provide a mock implementation that matches the return type
        storePostsSpy = jest.spyOn(PostActions, 'storePostsForChannel').mockImplementation(async () => ({models: []}));

        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
    });

    afterEach(() => {
        // Restore the original implementation after each test
        storePostsSpy.mockRestore();
    });

    it('should convert numeric booleans to true/false on iOS', async () => {
        Platform.OS = 'ios';

        await backgroundNotification(serverUrl, freshNotificationWithBooleanPost);

        // Check the arguments passed to the spy
        expect(storePostsSpy).toHaveBeenCalledTimes(1);
        const storedPosts = storePostsSpy.mock.calls[0][2] as Post[]; // 3rd argument is posts
        expect(storedPosts).toHaveLength(1);

        const attachments = storedPosts[0].props!.attachments as MessageAttachment[];
        expect(attachments).toHaveLength(2);

        // Check fields conversion
        const fields = attachments[0].fields!;
        expect(fields[0].short).toBe(true); // 1 -> true
        expect(fields[1].short).toBe(false); // 0 -> false
        expect(fields[2].short).toBe(true); // true -> true
        expect(fields[3].short).toBe(false); // false -> false
        expect(fields[4].short).toBe(undefined);
        expect(fields[5].short).toBe(undefined);

        // Check actions conversion
        const actions = attachments[0].actions!;
        expect(actions[0].disabled).toBe(true); // 1 -> true
        expect(actions[1].disabled).toBe(false); // 0 -> false
        expect(actions[2].disabled).toBe(true); // true -> true
        expect(actions[3].disabled).toBe(false); // false -> false
        expect(actions[4].disabled).toBe(undefined);
        expect(actions[5].disabled).toBe(undefined);
    });

    it('should NOT convert numeric booleans on Android (it wouldnt be needed)', async () => {
        Platform.OS = 'android';

        await backgroundNotification(serverUrl, freshNotificationWithBooleanPost);

        // Check the arguments passed to the spy
        expect(storePostsSpy).toHaveBeenCalledTimes(1);
        const storedPosts = storePostsSpy.mock.calls[0][2] as Post[]; // 3rd argument is posts
        expect(storedPosts).toHaveLength(1);

        const attachments = storedPosts[0].props!.attachments as MessageAttachment[];
        expect(attachments).toHaveLength(2);

        // Check fields remain unchanged
        const fields = attachments[0].fields!;
        expect(fields[0].short).toBe(1); // 1 -> 1
        expect(fields[1].short).toBe(0); // 0 -> 0
        expect(fields[2].short).toBe(true);
        expect(fields[3].short).toBe(false);
        expect(fields[4].short).toBe(undefined);
        expect(fields[5].short).toBe(undefined);

        // Check actions remain unchanged
        const actions = attachments[0].actions!;
        expect(actions[0].disabled).toBe(1); // 1 -> 1
        expect(actions[1].disabled).toBe(0); // 0 -> 0
        expect(actions[2].disabled).toBe(true);
        expect(actions[3].disabled).toBe(false);
        expect(actions[4].disabled).toBe(undefined);
        expect(actions[5].disabled).toBe(undefined);
    });
});
