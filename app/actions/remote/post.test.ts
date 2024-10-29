// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {ActionType, Post} from '@app/constants';
import PostModel from '@app/database/models/server/post';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import TestHelper from '@test/test_helper';

import {
    createPost,
    retryFailedPost,
    togglePinPost,
    deletePost,
    markPostAsUnread,
    editPost,
    acknowledgePost,
    unacknowledgePost,
} from './post';

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

const post1 = {...TestHelper.fakePost(channelId), id: 'postid1'};
const reply1 = {...TestHelper.fakePost(channelId), id: 'replyid1', root_id: post1.id};

const fileInfo1: FileInfo = {
    id: 'fileid',
    clientId: 'clientid',
    localPath: 'path1',
} as FileInfo;

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

const mockPostModel = (overrides: Partial<PostModel> = {}): PostModel => ({
    id: 'post-id',
    channelId: 'channel-id',
    createAt: Date.now(),
    deleteAt: 0,
    type: 'custom_post_type',
    userId: 'user-id',
    ...overrides,
} as PostModel);

const threads = [
    thread1,
] as ThreadWithLastFetchedAt[];

const throwFunc = () => {
    throw Error('error');
};

const acknowledgedTime = Date.now();

const mockClient = {
    createPost: jest.fn((post: Post) => ({...post, id: 'newid'})),
    pinPost: jest.fn(),
    unpinPost: jest.fn(),
    deletePost: jest.fn(),
    getChannel: jest.fn((_channelId: string) => ({id: _channelId, name: 'channel1', creatorId: user1.id, total_msg_count: 100})),
    getChannelMember: jest.fn((_channelId: string, userId: string) => ({id: userId + '-' + _channelId, user_id: userId, channel_id: _channelId, roles: '', msg_count: 100, mention_count: 0})),
    markPostAsUnread: jest.fn(),
    patchPost: jest.fn((message: string, postId: string) => ({...post1, id: postId, message})),
    acknowledgePost: jest.fn(() => ({acknowledged_at: acknowledgedTime})),
    unacknowledgePost: jest.fn(),
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

describe('create, update & delete posts', () => {
    it('createPost - handle database not found', async () => {
        const result = await createPost('foo', post1);
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('createPost - fail create', async () => {
        mockClient.createPost.mockImplementationOnce(jest.fn(throwFunc));
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await createPost(serverUrl, post1);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBeTruthy();
    });

    it('createPost - root', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await createPost(serverUrl, post1);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBeTruthy();
    });

    it('createPost - reply', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await createPost(serverUrl, reply1, [fileInfo1]);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBeTruthy();
    });

    it('retryFailedPost - handle database not found', async () => {
        const result = await retryFailedPost('foo', mockPostModel());
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('retryFailedPost - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await retryFailedPost(serverUrl, mockPostModel({id: post1.id, prepareUpdate: jest.fn(), toApi: async () => post1}));
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('retryFailedPost - handle error', async () => {
        mockClient.createPost.mockImplementationOnce(jest.fn(throwFunc));
        const result = await retryFailedPost(serverUrl, mockPostModel({id: post1.id, prepareUpdate: jest.fn(), toApi: async () => post1}));
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('togglePinPost - handle database not found', async () => {
        const result = await togglePinPost('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('togglePinPost - base case', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        const result = await togglePinPost(serverUrl, post1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.post).toBeDefined();
        expect(result.post?.isPinned).toBe(true);
    });

    it('deletePost - handle error', async () => {
        mockClient.deletePost.mockImplementationOnce(jest.fn(throwFunc));
        const result = await deletePost('foo', {} as PostModel);
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('deletePost - base case', async () => {
        const postModels = await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        const result = await deletePost(serverUrl, postModels[0] as PostModel);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.post).toBeDefined();
    });

    it('deletePost - system post', async () => {
        const postModels = await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [{...post1, id: `user-activity-${post1.id}`, type: Post.POST_TYPES.COMBINED_USER_ACTIVITY as PostType, props: {system_post_ids: [post1.id]}}],
            prepareRecordsOnly: false,
        });

        const result = await deletePost(serverUrl, postModels[0] as PostModel);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.post).toBeDefined();
    });

    it('markPostAsUnread - handle error', async () => {
        mockClient.deletePost.mockImplementationOnce(jest.fn(throwFunc));
        const result = await markPostAsUnread('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('markPostAsUnread - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        const result = await markPostAsUnread(serverUrl, post1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.post).toBeDefined();
    });

    it('markPostAsUnread - no current user', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        const result = await markPostAsUnread(serverUrl, post1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.post).toBeDefined();
    });

    it('editPost - handle error', async () => {
        mockClient.deletePost.mockImplementationOnce(jest.fn(throwFunc));
        const result = await editPost('foo', '', '');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('editPost - base case', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        const result = await editPost(serverUrl, post1.id, 'new message');
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.post).toBeDefined();
    });

    it('acknowledgePost - handle error', async () => {
        mockClient.deletePost.mockImplementationOnce(jest.fn(throwFunc));
        const result = await acknowledgePost('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('acknowledgePost - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        const result = await acknowledgePost(serverUrl, post1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.model).toBeDefined();
        expect(result.model?.metadata?.acknowledgements?.[0].acknowledged_at).toBe(acknowledgedTime);
    });

    it('unacknowledgePost - handle error', async () => {
        mockClient.deletePost.mockImplementationOnce(jest.fn(throwFunc));
        const result = await unacknowledgePost('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('unacknowledgePost - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        const result = await unacknowledgePost(serverUrl, post1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.model).toBeDefined();
        expect(result.model?.metadata?.acknowledgements?.length).toBe(0);
    });
});
