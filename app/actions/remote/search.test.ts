// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import TestHelper from '@test/test_helper';

import {
    fetchRecentMentions,
    searchPosts,
    searchFiles,
} from './search';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const teamId = 'teamid1';
const channelId = 'channelid1';
const channel: Channel = {
    id: channelId,
    display_name: 'channelname',
    team_id: teamId,
    total_msg_count: 0,
    type: 'D',
} as Channel;

const user1 = {id: 'userid1', username: 'user1', email: 'user1@mattermost.com', roles: ''} as UserProfile;
const post1 = TestHelper.fakePost({channel_id: channelId, id: 'postid1'});

const fileInfo1: FileInfo = {
    id: 'fileid1',
    clientId: 'clientid',
    localPath: 'path1',
    channel_id: channelId,
    post_id: post1.id,
} as FileInfo;

const throwFunc = () => {
    throw Error('error');
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

const mockClient = {
    searchPostsWithParams: jest.fn(() => ({posts: {[post1.id]: post1}, order: [post1.id], matches: {[post1.id]: post1.message}})),
    getProfilesByIds: jest.fn((ids: string[]) => (ids.map((id) => ({...user1, id})))),
    getChannel: jest.fn((_channelId: string) => ({id: _channelId, name: 'channel1', creatorId: user1.id, total_msg_count: 100})),
    getMyChannelMember: jest.fn((_channelId: string) => ({id: user1.id + '-' + _channelId, user_id: user1.id, channel_id: _channelId, roles: '', msg_count: 100, mention_count: 0})),
    searchFiles: jest.fn(() => ({file_infos: {[fileInfo1.id as string]: fileInfo1}, order: [fileInfo1.id]})),
};

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

describe('search', () => {
    it('fetchRecentMentions - handle not found database', async () => {
        const result = await fetchRecentMentions('foo');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchRecentMentions - base case', async () => {
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await fetchRecentMentions(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeDefined();
        expect(result.posts?.length).toBe(1);
        expect(result.order).toBeDefined();
        expect(result.order?.length).toBe(1);
    });

    it('fetchRecentMentions - no current user', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await fetchRecentMentions(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeDefined();
        expect(result.posts?.length).toBe(0);
        expect(result.order).toBeDefined();
        expect(result.order?.length).toBe(0);
    });

    it('fetchRecentMentions - search error', async () => {
        mockClient.searchPostsWithParams.mockImplementationOnce(jest.fn(throwFunc));
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await fetchRecentMentions(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('searchPosts - handle not found database', async () => {
        const result = await searchPosts('foo', '', {terms: 'test', is_or_search: true});
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('searchPosts - base case', async () => {
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await searchPosts(serverUrl, '', {terms: 'test', is_or_search: true});
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeDefined();
        expect(result.posts?.length).toBe(1);
        expect(result.order).toBeDefined();
        expect(result.order?.length).toBe(1);
    });

    it('searchFiles - handle request error', async () => {
        mockClient.searchFiles.mockImplementationOnce(jest.fn(throwFunc));
        const result = await searchFiles(serverUrl, '', {terms: 'test', is_or_search: true});
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('searchFiles - base case', async () => {
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}, {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        const channelModels = await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

        const result = await searchFiles(serverUrl, '', {terms: 'test', is_or_search: true}, channelModels[0]);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.files).toBeDefined();
        expect(result.files?.length).toBe(1);
        expect(result.channels).toBeDefined();
        expect(result.channels?.length).toBe(1);
    });
});
