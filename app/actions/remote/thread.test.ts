// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {ActionType} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import TestHelper from '@test/test_helper';

import {
    fetchThread,
    updateTeamThreadsAsRead,
    markThreadAsRead,
    markThreadAsUnread,
    updateThreadFollowing,
    fetchThreads,
    syncTeamThreads,
    loadEarlierThreads,
    fetchAndSwitchToThread,
    syncThreadsIfNeeded,
} from './thread';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const channelId = 'channelid1';
const teamId = 'teamid1';

const team: Team = {
    id: teamId,
    name: 'team1',
} as Team;

const user1 = {id: 'userid1', username: 'user1', email: 'user1@mattermost.com', roles: ''} as UserProfile;

const post1 = TestHelper.fakePost({channel_id: channelId, id: 'postid1'});

const thread1: Thread = {id: 'postid1',
    reply_count: 1,
    last_reply_at: 1,
    last_viewed_at: 1,
    participants: [user1],
    post: {id: 'postid1',
        channel_id: channelId,
        create_at: 1,
        message: 'post1',
        user_id: user1.id} as Post,
    unread_replies: 0,
    unread_mentions: 0,
    delete_at: 0,
};

const threads = [
    thread1,
] as ThreadWithLastFetchedAt[];

const throwFunc = () => {
    throw Error('error');
};

const mockClient = {
    getThread: jest.fn((userId: string, _teamId: string, threadId: string) => ({...thread1, id: threadId})),
    updateTeamThreadsAsRead: jest.fn(),
    markThreadAsRead: jest.fn(),
    markThreadAsUnread: jest.fn(),
    updateThreadFollow: jest.fn(),
    getThreads: jest.fn(() => ({threads})),
};

let mockGetIsCRTEnabled: jest.Mock;
jest.mock('@queries/servers/thread', () => {
    const original = jest.requireActual('@queries/servers/thread');
    mockGetIsCRTEnabled = jest.fn(() => true);
    return {
        ...original,
        getIsCRTEnabled: mockGetIsCRTEnabled,
    };
});

beforeAll(() => {
    // eslint-disable-next-line
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('get threads', () => {
    it('fetchThread - handle error', async () => {
        mockClient.getThread.mockImplementationOnce(jest.fn(throwFunc));
        const result = await fetchThread(serverUrl, teamId, thread1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchThread - base case', async () => {
        const result = await fetchThread(serverUrl, teamId, thread1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBeDefined();
    });

    it('fetchThreads - handle error', async () => {
        const result = await fetchThreads('foo', '', {});
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('fetchThreads - no current user', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await fetchThreads(serverUrl, team.id, {});
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.error).toBe('currentUser not found');
    });

    it('fetchThreads - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});

        const result = await fetchThreads(serverUrl, team.id, {});
        expect(result).toBeDefined();
        expect(result.error).toBeFalsy();
        expect(result.threads).toBeDefined();
        expect(result.threads?.[0].id).toBe(thread1.id);
    });

    it('syncTeamThreads - handle error', async () => {
        const result = await syncTeamThreads('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('syncTeamThreads - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});

        const result = await syncTeamThreads(serverUrl, team.id);
        expect(result).toBeDefined();
        expect(result.error).toBeFalsy();
        expect(result.models).toBeDefined();
        expect(result.models?.length).toBe(4); // 1 thread, 1 thread participant, 1 latest thread in team, 1 team thread sync (the unread thread is actually the latest so it the duplicate is removed)

        // Sync again after first sync
        const result2 = await syncTeamThreads(serverUrl, team.id);
        expect(result2).toBeDefined();
        expect(result2.error).toBeFalsy();
        expect(result2.models).toBeDefined();
        expect(result2.models?.length).toBe(1); // 1 team thread sync
    });

    it('syncThreadsIfNeeded - handle error', async () => {
        const result = await syncThreadsIfNeeded('foo', true, []);
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('syncThreadsIfNeeded - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});

        const result = await syncThreadsIfNeeded(serverUrl, true, [team]);
        expect(result).toBeDefined();
        expect(result.error).toBeFalsy();
        expect(result.models).toBeDefined();
        expect(result.models?.length).toBe(4); // 1 thread, 1 thread participant, 1 latest thread in team, 1 team thread sync (the unread thread is actually the latest so it the duplicate is removed)
    });

    it('loadEarlierThreads - handle error', async () => {
        const result = await loadEarlierThreads('foo', '', '');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('loadEarlierThreads - no current user', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await loadEarlierThreads(serverUrl, team.id, thread1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.error).toBe('currentUser not found');
    });

    it('loadEarlierThreads - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});

        const result = await loadEarlierThreads(serverUrl, team.id, thread1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.threads).toBeDefined();
        expect(result.threads?.[0].id).toBe(thread1.id);
        expect(result.models).toBeDefined();
        expect(result.models?.length).toBe(4); // 1 thread, 1 thread participant, 1 thread in team, 1 team thread sync
    });

    it('fetchAndSwitchToThread - handle error', async () => {
        const result = await fetchAndSwitchToThread('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('fetchAndSwitchToThread - base case', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });
        await operator.handleThreads({threads, prepareRecordsOnly: false, teamId: team.id});

        const result = await fetchAndSwitchToThread(serverUrl, thread1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });
});

describe('update threads', () => {
    it('updateTeamThreadsAsRead - handle error', async () => {
        mockClient.updateTeamThreadsAsRead.mockImplementationOnce(jest.fn(throwFunc));
        const result = await updateTeamThreadsAsRead(serverUrl, teamId);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('updateTeamThreadsAsRead - base case', async () => {
        const result = await updateTeamThreadsAsRead(serverUrl, teamId);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('markThreadAsRead - handle error', async () => {
        const result = await markThreadAsRead('foo', '', '');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('markThreadAsRead - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        const result = await markThreadAsRead(serverUrl, undefined, thread1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('markThreadAsUnread - handle error', async () => {
        const result = await markThreadAsUnread('foo', '', '', '');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('markThreadAsUnread - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        const result = await markThreadAsUnread(serverUrl, '', thread1.id, post1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('updateThreadFollowing - handle error', async () => {
        const result = await updateThreadFollowing('foo', '', '', false, false);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('updateThreadFollowing - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });
        await operator.handleThreads({threads, prepareRecordsOnly: false, teamId: team.id});

        const result = await updateThreadFollowing(serverUrl, '', thread1.id, true, true);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });
});
