// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {ActionType, Post, ServerErrors} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import PostModel from '@database/models/server/post';
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
    fetchPostsForChannel,
    fetchPostsForUnreadChannels,
    fetchPosts,
    fetchPostsBefore,
    fetchPostsSince,
    fetchPostAuthors,
    fetchPostThread,
    fetchPostsAround,
    fetchMissingChannelsFromPosts,
    fetchPostById,
    fetchSavedPosts,
    fetchPinnedPosts,
} from './post';
import * as PostAuxilaryFunctions from './post.auxiliary';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const channelId = 'channelid1';
const teamId = 'teamid1';

const user1 = {id: 'userid1', username: 'user1', email: 'user1@mattermost.com', roles: ''} as UserProfile;
const user2 = {id: 'userid2', username: 'user2', email: 'user2@mattermost.com', roles: ''} as UserProfile;

const post1 = TestHelper.fakePost({channel_id: channelId, id: 'postid1', user_id: user1.id});
const post2 = TestHelper.fakePost({channel_id: channelId, id: 'postid2', user_id: user2.id});
const reply1 = TestHelper.fakePost({channel_id: channelId, id: 'replyid1', root_id: post1.id, user_id: user2.id});

const channel1 = {
    id: channelId,
    team_id: teamId,
    total_msg_count: 12,
    creator_id: user1.id,
    delete_at: 0,
} as Channel;

const channelMember1 = {
    id: 'memberid1',
    channel_id: channelId,
    user_id: user1.id,
    msg_count: 10,
} as ChannelMembership;

const fileInfo1: FileInfo = {
    id: 'fileid',
    clientId: 'clientid',
    localPath: 'path1',
} as FileInfo;

const mockPostModel = (overrides: Partial<PostModel> = {}): PostModel => ({
    id: 'post-id',
    channelId: 'channel-id',
    createAt: Date.now(),
    deleteAt: 0,
    type: 'custom_post_type',
    userId: 'user-id',
    ...overrides,
} as PostModel);

const throwFunc = () => {
    throw Error('error');
};

const acknowledgedTime = Date.now();

const genericGetPostsMock = jest.fn((_channelId: string) => ({posts: {[post1.id]: {...post1, channel_id: _channelId}, [post2.id]: {...post2, channel_id: _channelId}}, order: [post1.id, post2.id]}));

const mockClient = {
    createPost: jest.fn((post: Post) => ({...post, id: 'newid'})),
    pinPost: jest.fn(),
    unpinPost: jest.fn(),
    deletePost: jest.fn(),
    getChannel: jest.fn((_channelId: string) => ({id: _channelId, name: 'channel1', creatorId: user1.id, total_msg_count: 100})),
    getChannelMember: jest.fn((_channelId: string, userId: string) => ({id: userId + '-' + _channelId, user_id: userId, channel_id: _channelId, roles: '', msg_count: 100, mention_count: 0})),
    getMyChannelMember: jest.fn((_channelId: string) => ({id: user1.id + '-' + _channelId, user_id: user1.id, channel_id: _channelId, roles: '', msg_count: 100, mention_count: 0})),
    markPostAsUnread: jest.fn(),
    patchPost: jest.fn((message: string, postId: string) => ({...post1, id: postId, message})),
    acknowledgePost: jest.fn(() => ({acknowledged_at: acknowledgedTime})),
    unacknowledgePost: jest.fn(),
    getPosts: genericGetPostsMock,
    getPostsBefore: genericGetPostsMock,
    getPostsSince: jest.fn((_channelId: string, since: number) => ({posts: {[post1.id]: {...post1, channel_id: _channelId, create_at: since + 1}, [post2.id]: {...post2, channel_id: _channelId, create_at: since + 2}}, order: [post1.id, post2.id]})),
    getProfilesByIds: jest.fn((ids: string[]) => (ids.map((id) => ({...user1, id})))),
    getProfilesByUsernames: jest.fn((names: string[]) => (names.map((name) => ({...user1, username: name, id: 'id' + name})))),
    getPostThread: jest.fn((_postId: string) => ({posts: {[_postId]: {...post1, id: _postId}, [reply1.id]: {...reply1, root_id: _postId}}, order: [_postId, reply1.id]})),
    getPostsAfter: genericGetPostsMock,
    getPost: jest.fn((_postId: string) => ({...post2, id: _postId})),
    getSavedPosts: genericGetPostsMock,
    getPinnedPosts: genericGetPostsMock,
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

let mockAddRecentReaction: jest.Mock;
jest.mock('@actions/local/reactions', () => {
    const original = jest.requireActual('@actions/local/reactions');
    mockAddRecentReaction = jest.fn(() => [{user_id: 'userid1', emoji_name: 'smile'}]);
    return {
        ...original,
        addRecentReaction: mockAddRecentReaction,
    };
});

let mockFetchChannelStats: jest.Mock;
jest.mock('@actions/remote/channel', () => {
    const original = jest.requireActual('@actions/remote/channel');
    mockFetchChannelStats = jest.fn(() => Promise.resolve({}));
    return {
        ...original,
        fetchChannelStats: mockFetchChannelStats,
    };
});

beforeAll(() => {
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    mockFetchChannelStats.mockClear();
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

    it('createPost - handle client error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await createPost(serverUrl, post1);
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('createPost - handle existing failed post', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [{...post1, props: {failed: false}}],
            prepareRecordsOnly: false,
        });

        const result = await createPost(serverUrl, {...post1, pending_post_id: post1.id});
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBe(false);
    });

    it('createPost - fail create', async () => {
        mockClient.createPost.mockImplementationOnce(jest.fn(throwFunc));
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await createPost(serverUrl, post1);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBeTruthy();
    });

    it('createPost - fail on deleted root post server error', async () => {
        mockClient.createPost.mockImplementationOnce(jest.fn(() => {
            // eslint-disable-next-line no-throw-literal
            throw {message: 'error', server_error_id: ServerErrors.DELETED_ROOT_POST_ERROR};
        }));
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await createPost(serverUrl, post1);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBeTruthy();
    });

    it('createPost - fail on town square read only server error', async () => {
        mockClient.createPost.mockImplementationOnce(jest.fn(() => {
            // eslint-disable-next-line no-throw-literal
            throw {message: 'error', server_error_id: ServerErrors.TOWN_SQUARE_READ_ONLY_ERROR};
        }));
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await createPost(serverUrl, post1);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBeTruthy();
    });

    it('createPost - fail on plugin dismissed post server error', async () => {
        mockClient.createPost.mockImplementationOnce(jest.fn(() => {
            // eslint-disable-next-line no-throw-literal
            throw {message: 'error', server_error_id: ServerErrors.PLUGIN_DISMISSED_POST_ERROR};
        }));
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

    it('createPost - without reactions', async () => {
        mockAddRecentReaction.mockImplementationOnce(() => []);
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

    it('retryFailedPost - handle client error', async () => {
        jest.spyOn(NetworkManager, 'getClient').mockImplementationOnce(throwFunc);

        const result = await retryFailedPost(serverUrl, mockPostModel({id: post1.id, prepareUpdate: jest.fn(), toApi: async () => post1}));
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

    it('retryFailedPost - fail on deleted root post server error', async () => {
        mockClient.createPost.mockImplementationOnce(jest.fn(() => {
            // eslint-disable-next-line no-throw-literal
            throw {message: 'error', server_error_id: ServerErrors.DELETED_ROOT_POST_ERROR};
        }));
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await retryFailedPost(serverUrl, mockPostModel({id: post1.id, prepareUpdate: jest.fn(), toApi: async () => post1}));
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('retryFailedPost - fail on town square read only server error', async () => {
        mockClient.createPost.mockImplementationOnce(jest.fn(() => {
            // eslint-disable-next-line no-throw-literal
            throw {message: 'error', server_error_id: ServerErrors.TOWN_SQUARE_READ_ONLY_ERROR};
        }));
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await retryFailedPost(serverUrl, mockPostModel({id: post1.id, prepareUpdate: jest.fn(), toApi: async () => post1}));
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('retryFailedPost - fail on plugin dismissed post server error', async () => {
        mockClient.createPost.mockImplementationOnce(jest.fn(() => {
            // eslint-disable-next-line no-throw-literal
            throw {message: 'error', server_error_id: ServerErrors.PLUGIN_DISMISSED_POST_ERROR};
        }));
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await retryFailedPost(serverUrl, mockPostModel({id: post1.id, prepareUpdate: jest.fn(), toApi: async () => post1}));
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
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
        const result = await editPost('foo', '', '', [], []);
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

        const result = await editPost(serverUrl, post1.id, 'new message', [], []);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.post).toBeDefined();
    });

    it('editPost - delete files', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        const testFiles: FileInfo[] = [
            TestHelper.fakeFileInfo({
                id: 'file-1',
                post_id: post1.id,
                name: 'test-file-1.jpg',
                extension: 'jpg',
                size: 1024,
                mime_type: 'image/jpeg',
                user_id: user1.id,
            }),
            TestHelper.fakeFileInfo({
                id: 'file-2',
                post_id: post1.id,
                name: 'test-file-2.png',
                extension: 'png',
                size: 2048,
                mime_type: 'image/png',
                user_id: user1.id,
            }),
            TestHelper.fakeFileInfo({
                id: 'file-3',
                post_id: post1.id,
                name: 'test-file-3.pdf',
                extension: 'pdf',
                size: 4096,
                mime_type: 'application/pdf',
                user_id: user1.id,
            }),
        ];

        await operator.handleFiles({
            files: testFiles,
            prepareRecordsOnly: false,
        });

        const {database} = operator;
        const filesBefore = await database.get('File').query().fetch();
        expect(filesBefore).toHaveLength(3);

        const file1Before = filesBefore.find((f) => f.id === 'file-1');
        const file2Before = filesBefore.find((f) => f.id === 'file-2');
        const file3Before = filesBefore.find((f) => f.id === 'file-3');
        expect(file1Before).toBeDefined();
        expect(file2Before).toBeDefined();
        expect(file3Before).toBeDefined();

        const result = await editPost(serverUrl, post1.id, 'new message', [], ['file-1', 'file-2']);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.post).toBeDefined();

        const filesAfter = await database.get('File').query().fetch();
        expect(filesAfter).toHaveLength(1);

        const remainingFile = filesAfter[0];
        expect(remainingFile.id).toBe('file-3');

        const deletedFiles = await database.get('File').query().fetch();
        const file1After = deletedFiles.find((f) => f.id === 'file-1');
        const file2After = deletedFiles.find((f) => f.id === 'file-2');
        expect(file1After).toBeUndefined();
        expect(file2After).toBeUndefined();
    });

    it('editPost - should call fetchChannelStats when files are removed', async () => {
        // Setup post with files
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        const testFiles: FileInfo[] = [
            TestHelper.fakeFileInfo({
                id: 'file-1',
                post_id: post1.id,
                name: 'test-file-1.jpg',
                extension: 'jpg',
                size: 1024,
                mime_type: 'image/jpeg',
                user_id: user1.id,
            }),
        ];

        await operator.handleFiles({
            files: testFiles,
            prepareRecordsOnly: false,
        });

        mockFetchChannelStats.mockClear();

        // Edit post to remove files
        const result = await editPost(serverUrl, post1.id, 'new message', [], ['file-1']);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(mockFetchChannelStats).toHaveBeenCalledWith(serverUrl, post1.channel_id);
        expect(mockFetchChannelStats).toHaveBeenCalledTimes(1);
    });

    it('editPost - should call fetchChannelStats when files are added', async () => {
        // Setup post without files
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        mockFetchChannelStats.mockClear();

        // Edit post to add files
        const result = await editPost(serverUrl, post1.id, 'new message', ['new-file-1'], []);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(mockFetchChannelStats).toHaveBeenCalledWith(serverUrl, post1.channel_id);
        expect(mockFetchChannelStats).toHaveBeenCalledTimes(1);
    });

    it('editPost - should NOT call fetchChannelStats when no files change', async () => {
        // Setup post without files
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        mockFetchChannelStats.mockClear();

        // Edit post without changing files
        const result = await editPost(serverUrl, post1.id, 'new message', [], []);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(mockFetchChannelStats).not.toHaveBeenCalled();
    });

    it('editPost - should call fetchChannelStats when file IDs change', async () => {
        // Setup post with files
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        const testFiles: FileInfo[] = [
            TestHelper.fakeFileInfo({
                id: 'file-1',
                post_id: post1.id,
                name: 'test-file-1.jpg',
                extension: 'jpg',
                size: 1024,
                mime_type: 'image/jpeg',
                user_id: user1.id,
            }),
        ];

        await operator.handleFiles({
            files: testFiles,
            prepareRecordsOnly: false,
        });

        mockFetchChannelStats.mockClear();

        // Edit post to replace files (remove one, add another)
        const result = await editPost(serverUrl, post1.id, 'new message', ['new-file-2'], ['file-1']);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(mockFetchChannelStats).toHaveBeenCalledWith(serverUrl, post1.channel_id);
        expect(mockFetchChannelStats).toHaveBeenCalledTimes(1);
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

describe('get posts', () => {
    it('fetchPostsForChannel - handle database not found', async () => {
        const result = await fetchPostsForChannel('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('fetchPostsForChannel - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [{
            id: channelId,
            team_id: teamId,
            total_msg_count: 0,
            creator_id: user1.id,
        } as Channel],
        myChannels: [{
            id: 'id',
            channel_id: channelId,
            user_id: user1.id,
            msg_count: 0,
        } as ChannelMembership],
        prepareRecordsOnly: false});

        const result = await fetchPostsForChannel(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
    });

    it('fetchPostsForChannel - base case with since', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [{
            id: channelId,
            team_id: teamId,
            total_msg_count: 0,
            creator_id: user1.id,
        } as Channel],
        myChannels: [{
            id: 'id',
            channel_id: channelId,
            user_id: user1.id,
            msg_count: 0,
        } as ChannelMembership],
        prepareRecordsOnly: false});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        const result = await fetchPostsForChannel(serverUrl, channelId, true);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
    });

    it('fetchPostsForChannel - no posts with since', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [{
            id: channelId,
            team_id: teamId,
            total_msg_count: 0,
            creator_id: user1.id,
        } as Channel],
        myChannels: [{
            id: 'id',
            channel_id: channelId,
            user_id: user1.id,
            msg_count: 0,
        } as ChannelMembership],
        prepareRecordsOnly: false});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        mockClient.getPostsSince.mockImplementationOnce(jest.fn(() => ({posts: {}, order: []})));
        const result = await fetchPostsForChannel(serverUrl, channelId, true);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(0);
    });

    it('fetchPostsForChannel - request error', async () => {
        mockClient.getPosts.mockImplementationOnce(jest.fn(throwFunc));

        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel1], myChannels: [channelMember1], prepareRecordsOnly: false});

        const result = await fetchPostsForChannel(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchPostsForUnreadChannels - base case', async () => {
        const spyOnProcessChannelPostsByTeam = jest.spyOn(PostAuxilaryFunctions, 'processChannelPostsByTeam');
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel1], myChannels: [channelMember1], prepareRecordsOnly: false});

        await fetchPostsForUnreadChannels(serverUrl, [{id: teamId}] as Team[], [channel1, {...channel1, id: 'channelid2', total_msg_count: 10}], [{...channelMember1, msg_count: 5}, {...channelMember1, channel_id: 'channelid2', msg_count: 10}], 'testid');

        expect(spyOnProcessChannelPostsByTeam).toHaveBeenCalledWith(serverUrl, ['channelid1'], false, undefined, undefined);
    });

    it('fetchPosts - handle database not found', async () => {
        const result = await fetchPosts('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('fetchPosts - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await fetchPosts(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
    });

    it('fetchPosts - no CRT', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        mockGetIsCRTEnabled.mockImplementationOnce(() => false);

        const result = await fetchPosts(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
    });

    it('fetchPosts - no authors needed', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        mockClient.getProfilesByIds.mockImplementationOnce(jest.fn(() => []));

        const result = await fetchPosts(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
    });

    it('fetchPostsBefore - handle database not found', async () => {
        const result = await fetchPostsBefore('foo', '', '', 50, true) as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('fetchPostsBefore - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await fetchPostsBefore(serverUrl, channelId, post1.id) as {
            posts: Post[];
            order: string[];
            previousPostId: string | undefined;
        };
        expect(result).toBeDefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
    });

    it('fetchPostsBefore - no CRT', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        mockGetIsCRTEnabled.mockImplementationOnce(() => false);

        const result = await fetchPostsBefore(serverUrl, channelId, post1.id) as {
            posts: Post[];
            order: string[];
            previousPostId: string | undefined;
        };
        expect(result).toBeDefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
    });

    it('fetchPostsBefore - no authors needed', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        mockClient.getProfilesByIds.mockImplementationOnce(jest.fn(() => []));

        const result = await fetchPostsBefore(serverUrl, channelId, post1.id) as {
            posts: Post[];
            order: string[];
            previousPostId: string | undefined;
        };
        expect(result).toBeDefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
    });

    it('fetchPostsBefore - no posts', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        mockClient.getPostsBefore.mockImplementationOnce(jest.fn(() => ({posts: {}, order: []})));

        const result = await fetchPostsBefore(serverUrl, channelId, post1.id) as {
            posts: Post[];
            order: string[];
            previousPostId: string | undefined;
        };
        expect(result).toBeDefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(0);
    });

    it('fetchPostsSince - handle database not found', async () => {
        const result = await fetchPostsSince('foo', '', 0);
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('fetchPostsSince - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await fetchPostsSince(serverUrl, channelId, 123);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
    });

    it('fetchPostAuthors - handle database not found', async () => {
        const result = await fetchPostAuthors('foo', []);
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('fetchPostAuthors - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});

        const result = await fetchPostAuthors(serverUrl, [{...post1, message: 'hi @user3'}, post2]);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.authors).toBeDefined();
        expect(result.authors?.length).toBe(2); // 1 by id for user2, 1 by username for user3
    });

    it('fetchPostAuthors - no users to fetch', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});

        const result = await fetchPostAuthors(serverUrl, [post1]);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.authors).toBeDefined();
        expect(result.authors?.length).toBe(0);
    });

    it('fetchPostThread - handle database not found', async () => {
        const result = await fetchPostThread('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('fetchPostThread - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await fetchPostThread(serverUrl, post1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
        expect(result.posts?.[0].id).toBe(post1.id);
        expect(result.posts?.[1].id).toBe(reply1.id);
    });

    it('fetchPostThread - no CRT', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        mockGetIsCRTEnabled.mockImplementationOnce(() => false);

        const result = await fetchPostThread(serverUrl, post1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
        expect(result.posts?.[0].id).toBe(post1.id);
        expect(result.posts?.[1].id).toBe(reply1.id);
    });

    it('fetchPostThread - no authors needed', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        mockClient.getProfilesByIds.mockImplementationOnce(jest.fn(() => []));

        const result = await fetchPostThread(serverUrl, post1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
    });

    it('fetchPostThread - no posts', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        mockClient.getPostThread.mockImplementationOnce(jest.fn(() => ({posts: {}, order: []})));

        const result = await fetchPostThread(serverUrl, post1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(0);
    });

    it('fetchPostsAround - handle database not found', async () => {
        const result = await fetchPostsAround('foo', '', '');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('fetchPostsAround - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await fetchPostsAround(serverUrl, channelId, post2.id, 100, true);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
    });

    it('fetchPostsAround - no CRT', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        mockGetIsCRTEnabled.mockImplementationOnce(() => false);

        const result = await fetchPostsAround(serverUrl, channelId, post2.id, 100, true);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
    });

    it('fetchPostsAround - no authors needed', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        mockClient.getProfilesByIds.mockImplementationOnce(jest.fn(() => []));

        const result = await fetchPostsAround(serverUrl, channelId, post2.id, 100, true);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
    });

    it('fetchMissingChannelsFromPosts - handle database not found', async () => {
        const result = await fetchMissingChannelsFromPosts('foo', []);
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('fetchMissingChannelsFromPosts - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await fetchMissingChannelsFromPosts(serverUrl, [post1]);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.channels).toBeDefined();
        expect(result.channels?.[0].id).toBe(post1.channel_id);
    });

    it('fetchPostById - handle database not found', async () => {
        const result = await fetchPostById('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('fetchPostById - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await fetchPostById(serverUrl, post2.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.post).toBeDefined();
        expect(result.post?.id).toBe(post2.id);
    });

    it('fetchPostById - no CRT', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        mockGetIsCRTEnabled.mockImplementationOnce(() => false);

        const result = await fetchPostById(serverUrl, post2.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.post).toBeDefined();
        expect(result.post?.id).toBe(post2.id);
    });

    it('fetchPostById - no authors needed', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        mockClient.getProfilesByIds.mockImplementationOnce(jest.fn(() => []));

        const result = await fetchPostById(serverUrl, post2.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.post).toBeDefined();
        expect(result.post?.id).toBe(post2.id);
    });

    it('fetchPostById - fetch only', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await fetchPostById(serverUrl, post2.id, true);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.post).toBeDefined();
        expect(result.post?.id).toBe(post2.id);
    });

    it('fetchSavedPosts - handle database not found', async () => {
        const result = await fetchSavedPosts('foo');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('fetchSavedPosts - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await fetchSavedPosts(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
    });

    it('fetchPinnedPosts - handle database not found', async () => {
        const result = await fetchPinnedPosts('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeTruthy();
    });

    it('fetchPinnedPosts - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await fetchPinnedPosts(serverUrl, channel1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.posts).toBeTruthy();
        expect(result.posts?.length).toBe(2);
    });
});
