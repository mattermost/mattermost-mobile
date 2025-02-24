// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionType} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import Preferences from '@constants/preferences';
import DatabaseManager from '@database/manager';
import EphemeralStore from '@store/ephemeral_store';
import TestHelper from '@test/test_helper';

import {
    switchToGlobalThreads,
    switchToThread,
    createThreadFromNewPost,
    processReceivedThreads,
    markTeamThreadsAsRead,
    markThreadAsViewed,
    updateThread,
    updateTeamThreadsSync,
} from './thread';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

jest.mock('@store/navigation_store', () => {
    const original = jest.requireActual('@store/navigation_store');
    return {
        ...original,
        waitUntilScreenIsTop: jest.fn(() => Promise.resolve()),
        getScreensInStack: jest.fn(() => []),
    };
});

const teamId = 'tId1';
const team: Team = {
    id: teamId,
} as Team;
const channelId = 'channelid1';
const channel: Channel = {
    id: channelId,
    team_id: teamId,
    total_msg_count: 0,
} as Channel;
const user: UserProfile = {
    id: 'userid',
    username: 'username',
    roles: '',
} as UserProfile;
const user2: UserProfile = {
    id: 'userid2',
    username: 'username2',
    first_name: 'first',
    last_name: 'last',
    roles: '',
} as UserProfile;

const rootPost = TestHelper.fakePost({channel_id: channelId, user_id: user.id, id: 'rootpostid', create_at: 1});
const threads = [
    {
        id: rootPost.id,
        reply_count: 0,
        last_reply_at: 123,
        last_viewed_at: 123,
        participants: [{
            id: user.id,
        }],
        is_following: true,
        unread_replies: 0,
        unread_mentions: 0,
        lastFetchedAt: 0,
    },
] as ThreadWithLastFetchedAt[];

describe('switchToGlobalThreads', () => {
    it('handle not found database', async () => {
        const {models, error} = await switchToGlobalThreads('foo', undefined, false);
        expect(models).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('handle no team', async () => {
        const {models, error} = await switchToGlobalThreads(serverUrl, undefined, false);
        expect(models).toBeUndefined();
        expect(error).toBeDefined();
        expect((error as Error).message).toBe('no team to switch to');
    });

    it('base case', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

        const {models, error} = await switchToGlobalThreads(serverUrl, undefined);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models?.length).toBe(1); // history
    });

    it('base case - provided team id', async () => {
        let mockIsTablet: jest.Mock;
        jest.mock('@utils/helpers', () => {
            const original = jest.requireActual('@utils/helpers');
            mockIsTablet = jest.fn(() => true);
            return {
                ...original,
                isTablet: mockIsTablet,
            };
        });
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});

        const {models, error} = await switchToGlobalThreads(serverUrl, team.id);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models?.length).toBe(1); // history
    });
});

describe('switchToThread', () => {
    it('handle not found database', async () => {
        const {error} = await switchToThread('foo', '', false);
        expect(error).toBeDefined();
    });

    it('handle no user', async () => {
        const {error} = await switchToThread(serverUrl, '', false);
        expect((error as Error).message).toBe('User not found');
    });

    it('handle no post', async () => {
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});

        const {error} = await switchToThread(serverUrl, '');
        expect((error as Error).message).toBe('Post not found');
    });

    it('handle no channel', async () => {
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        const post = TestHelper.fakePost({channel_id: channelId, user_id: user2.id, id: 'postid', create_at: 1});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });

        const {error} = await switchToThread(serverUrl, post.id);
        expect((error as Error).message).toBe('Channel not found');
    });

    it('base case', async () => {
        EphemeralStore.theme = Preferences.THEMES.denim;
        await operator.handleUsers({users: [user, user2], prepareRecordsOnly: false});
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'teamid2'}, {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        const post = TestHelper.fakePost({channel_id: channelId, user_id: user2.id, id: 'postid', create_at: 1});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });

        const {error} = await switchToThread(serverUrl, post.id, true);
        expect(error).toBeUndefined();
    });

    it('base case not from notification', async () => {
        EphemeralStore.theme = Preferences.THEMES.denim;
        await operator.handleUsers({users: [user, user2], prepareRecordsOnly: false});
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'teamid2'}, {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        const post = TestHelper.fakePost({channel_id: channelId, user_id: user2.id, id: 'postid', create_at: 1});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });

        const {error} = await switchToThread(serverUrl, post.id, false);
        expect(error).toBeUndefined();
    });

    it('base case for DM', async () => {
        EphemeralStore.theme = Preferences.THEMES.denim;
        await operator.handleUsers({users: [user, user2], prepareRecordsOnly: false});
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'teamid2'}, {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [{...channel, team_id: '', type: 'D', display_name: 'user1-user2'}], prepareRecordsOnly: false});
        const post = TestHelper.fakePost({channel_id: channelId, user_id: user2.id, id: 'postid', create_at: 1});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });

        const {error} = await switchToThread(serverUrl, post.id, true);
        expect(error).toBeUndefined();
    });
});

describe('createThreadFromNewPost', () => {
    it('handle not found database', async () => {
        const {models, error} = await createThreadFromNewPost('foo', {} as Post, false);
        expect(models).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('base case', async () => {
        await operator.handleUsers({users: [user, user2], prepareRecordsOnly: false});
        await operator.handleThreads({threads, prepareRecordsOnly: false, teamId: team.id});
        const post = TestHelper.fakePost({channel_id: channelId, user_id: user2.id, id: 'postid', create_at: 1, root_id: rootPost.id});

        const {models, error} = await createThreadFromNewPost(serverUrl, post, false);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models?.length).toBe(2); // thread, thread participant
    });

    it('base case - no root post', async () => {
        await operator.handleUsers({users: [user2], prepareRecordsOnly: false});
        const post = TestHelper.fakePost({channel_id: channelId, user_id: user2.id, id: 'postid', create_at: 1});

        const {models, error} = await createThreadFromNewPost(serverUrl, post);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models?.length).toBe(1); // thread
    });
});

describe('processReceivedThreads', () => {
    it('handle not found database', async () => {
        const {models, error} = await processReceivedThreads('foo', [], '', false);
        expect(models).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('base case', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});
        const thread = [
            {
                id: rootPost.id,
                reply_count: 0,
                last_reply_at: 123,
                last_viewed_at: 123,
                participants: [{
                    id: user.id,
                }],
                is_following: true,
                unread_replies: 0,
                unread_mentions: 0,
                post: rootPost,
            },
        ] as Thread[];

        const {models, error} = await processReceivedThreads(serverUrl, thread, team.id);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models?.length).toBe(4); // post, thread, thread participant, thread in team
    });
});

describe('markTeamThreadsAsRead', () => {
    it('handle not found database', async () => {
        const {models, error} = await markTeamThreadsAsRead('foo', '', false);
        expect(models).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('base case', async () => {
        const {models, error} = await markTeamThreadsAsRead(serverUrl, team.id, false);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models?.length).toBe(0);
    });
});

describe('markThreadAsViewed', () => {
    it('handle not found database', async () => {
        const {model, error} = await markThreadAsViewed('foo', '', false);
        expect(model).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('handle no thread', async () => {
        const {model, error} = await markThreadAsViewed(serverUrl, '', false);
        expect(model).toBeUndefined();
        expect(error).toBeDefined();
        expect(error).toBe('Thread not found');
    });

    it('base case', async () => {
        await operator.handleThreads({threads, prepareRecordsOnly: false, teamId: team.id});
        const {model, error} = await markThreadAsViewed(serverUrl, rootPost.id, false);
        expect(error).toBeUndefined();
        expect(model).toBeDefined();
    });
});

describe('updateThread', () => {
    it('handle not found database', async () => {
        const {model, error} = await updateThread('foo', '', {}, false);
        expect(model).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('handle no thread', async () => {
        const {model, error} = await updateThread(serverUrl, '', {}, false);
        expect(model).toBeUndefined();
        expect(error).toBeDefined();
        expect((error as Error).message).toBe('Thread not found');
    });

    it('base case', async () => {
        await operator.handleThreads({threads, prepareRecordsOnly: false, teamId: team.id});
        const {model, error} = await updateThread(serverUrl, rootPost.id, threads[0], false);
        expect(error).toBeUndefined();
        expect(model).toBeDefined();
    });
});

describe('updateTeamThreadsSync', () => {
    it('handle not found database', async () => {
        const {models, error} = await updateTeamThreadsSync('foo', {} as TeamThreadsSync, false);
        expect(models).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('base case', async () => {
        const {models, error} = await updateTeamThreadsSync(serverUrl, {id: 'id1', earliest: 1, latest: 2});
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
    });
});
