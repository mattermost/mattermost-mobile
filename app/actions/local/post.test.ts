// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionType, Post} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';
import {COMBINED_USER_ACTIVITY} from '@utils/post_list';

import {
    sendAddToChannelEphemeralPost,
    sendEphemeralPost,
    removePost,
    markPostAsDeleted,
    storePostsForChannel,
    getPosts,
    addPostAcknowledgement,
    removePostAcknowledgement,
    deletePosts,
    getUsersCountFromMentions,
} from './post';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

let mockGenerateId: jest.Mock;
jest.mock('@utils/general', () => {
    const original = jest.requireActual('@utils/general');
    mockGenerateId = jest.fn(() => 'testpostid');
    return {
        ...original,
        generateId: mockGenerateId,
    };
});

let mockGetIsCRTEnabled: jest.Mock;
jest.mock('@queries/servers/thread', () => {
    const original = jest.requireActual('@queries/servers/thread');
    mockGetIsCRTEnabled = jest.fn(() => true);
    return {
        ...original,
        getIsCRTEnabled: mockGetIsCRTEnabled,
    };
});

const channelId = 'channelid1';
const user: UserProfile = TestHelper.fakeUser({
    id: 'userid',
    username: 'username',
    roles: '',
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('sendAddToChannelEphemeralPost', () => {
    it('handle not found database', async () => {
        const {posts, error} = await sendAddToChannelEphemeralPost('foo', TestHelper.fakeUserModel(), ['username2'], ['added username2'], channelId, '');
        expect(posts).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('base case', async () => {
        const users = await operator.handleUsers({users: [user], prepareRecordsOnly: false});

        const {posts, error} = await sendAddToChannelEphemeralPost(serverUrl, users[0], ['username2'], ['added username2'], channelId);
        expect(error).toBeUndefined();
        expect(posts).toBeDefined();
        expect(posts?.length).toBe(1);
        expect(posts![0].message).toBe('added username2');
    });
});

describe('sendEphemeralPost', () => {
    it('handle not found database', async () => {
        const {post, error} = await sendEphemeralPost('foo', 'message', channelId, '', user.id);
        expect(post).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('handle no channel', async () => {
        const {post, error} = await sendEphemeralPost(serverUrl, 'newmessage', '', '', user.id);
        expect(post).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('handle no user', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'useridcurrent'}], prepareRecordsOnly: false});

        const {post, error} = await sendEphemeralPost(serverUrl, 'newmessage', channelId);
        expect(error).toBeUndefined();
        expect(post).toBeDefined();
        expect(post?.user_id).toBe('useridcurrent');
    });

    it('base case', async () => {
        const {post, error} = await sendEphemeralPost(serverUrl, 'newmessage', channelId, '', user.id);
        expect(error).toBeUndefined();
        expect(post).toBeDefined();
        expect(post?.message).toBe('newmessage');
    });
});

describe('removePost', () => {
    const post = TestHelper.fakePost({id: 'postid', channel_id: channelId});

    it('handle not found database', async () => {
        const {post: rPost, error} = await removePost('foo', post);
        expect(rPost).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('base case', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });

        const {post: rPost, error} = await removePost(serverUrl, post);
        expect(error).toBeUndefined();
        expect(rPost).toBeDefined();
    });

    it('base case - missing post', async () => {
        const {post: rPost, error} = await removePost(serverUrl, post);
        expect(error).toBeUndefined();
        expect(rPost).toBeDefined();
    });

    it('base case - system message', async () => {
        const systemPost = TestHelper.fakePost({channel_id: channelId, id: `${COMBINED_USER_ACTIVITY}id1_id2`, type: Post.POST_TYPES.COMBINED_USER_ACTIVITY, props: {system_post_ids: ['id1']}});

        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id, 'id1'],
            posts: [systemPost, TestHelper.fakePost({id: 'id1', channel_id: channelId})],
            prepareRecordsOnly: false,
        });

        const {post: rPost, error} = await removePost(serverUrl, systemPost);
        expect(error).toBeUndefined();
        expect(rPost).toBeDefined();
    });
});

describe('markPostAsDeleted', () => {
    const post = TestHelper.fakePost({channel_id: channelId});

    it('handle not found database', async () => {
        const {model, error} = await markPostAsDeleted('foo', post);
        expect(model).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('handle no post', async () => {
        const {model, error} = await markPostAsDeleted(serverUrl, post, false);
        expect(model).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('base case', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });

        const {model, error} = await markPostAsDeleted(serverUrl, post, false);
        expect(error).toBeUndefined();
        expect(model).toBeDefined();
        expect(model?.deleteAt).toBeGreaterThan(0);
    });
});

describe('storePostsForChannel', () => {
    const post = TestHelper.fakePost({channel_id: channelId, user_id: user.id});
    const teamId = 'tId1';
    const channel: Channel = TestHelper.fakeChannel({
        id: channelId,
        team_id: teamId,
        total_msg_count: 0,
    });
    const channelMember: ChannelMembership = TestHelper.fakeChannelMember({
        id: 'id',
        channel_id: channelId,
        msg_count: 0,
    });

    it('handle not found database', async () => {
        const {models, error} = await storePostsForChannel('foo', channelId, [post], [post.id], '', ActionType.POSTS.RECEIVED_IN_CHANNEL, [user], false);
        expect(models).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('base case - CRT on', async () => {
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});

        const {models, error} = await storePostsForChannel(serverUrl, channelId, [post], [post.id], '', ActionType.POSTS.RECEIVED_IN_CHANNEL, [user], false);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models?.length).toBe(5); // Post, PostsInChannel, User, MyChannel, Thread
    });

    it('base case - CRT off', async () => {
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        mockGetIsCRTEnabled.mockImplementationOnce(() => false);

        const {models, error} = await storePostsForChannel(serverUrl, channelId, [post], [post.id], '', ActionType.POSTS.RECEIVED_IN_CHANNEL, [user]);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models?.length).toBe(4); // Post, PostsInChannel, User, MyChannel
    });
});

describe('getPosts', () => {
    const post = TestHelper.fakePost({channel_id: channelId});

    it('handle not found database', async () => {
        const posts = await getPosts('foo', [post.id]);
        expect(posts).toBeDefined();
        expect(posts?.length).toBe(0);
    });

    it('base case', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });

        const posts = await getPosts(serverUrl, [post.id]);
        expect(posts).toBeDefined();
        expect(posts.length).toBe(1);
    });
});

describe('addPostAcknowledgement', () => {
    const post = TestHelper.fakePost({channel_id: channelId});

    it('handle not found database', async () => {
        const {model, error} = await addPostAcknowledgement('foo', post.id, user.id, 123, false);
        expect(model).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('handle no post', async () => {
        const {model, error} = await addPostAcknowledgement(serverUrl, post.id, user.id, 123, false);
        expect(error).toBeDefined();
        expect(model).toBeUndefined();
    });

    it('handle already acked', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [{...post, metadata: {acknowledgements: [{user_id: user.id, post_id: post.id, acknowledged_at: 1}]}}],
            prepareRecordsOnly: false,
        });

        const {model, error} = await addPostAcknowledgement(serverUrl, post.id, user.id, 123, false);
        expect(error).toBeDefined();
        expect(error).toBe(false);
        expect(model).toBeUndefined();
    });

    it('base case', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });

        const {model, error} = await addPostAcknowledgement(serverUrl, post.id, user.id, 123);
        expect(error).toBeUndefined();
        expect(model).toBeDefined();
    });
});

describe('removePostAcknowledgement', () => {
    const post = TestHelper.fakePost({channel_id: channelId});

    it('handle not found database', async () => {
        const {model, error} = await removePostAcknowledgement('foo', post.id, user.id, false);
        expect(model).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('handle no post', async () => {
        const {model, error} = await removePostAcknowledgement(serverUrl, post.id, user.id, false);
        expect(error).toBeDefined();
        expect(model).toBeUndefined();
    });

    it('base case', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [{...post, metadata: {acknowledgements: [{user_id: user.id, post_id: post.id, acknowledged_at: 1}]}}],
            prepareRecordsOnly: false,
        });

        const {model, error} = await removePostAcknowledgement(serverUrl, post.id, user.id);
        expect(error).toBeUndefined();
        expect(model).toBeDefined();
    });
});

describe('deletePosts', () => {
    const post = TestHelper.fakePost({channel_id: channelId});

    it('handle not found database', async () => {
        const {error} = await deletePosts('foo', [post.id]);
        expect(error).toBeTruthy();
    });

    it('base case', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });

        const {error} = await deletePosts(serverUrl, [post.id, 'id2']);
        expect(error).toBeDefined();
    });
});

describe('getUsersCountFromMentions', () => {
    it('handle not found database', async () => {
        const num = await getUsersCountFromMentions('foo', []);
        expect(num).toBe(0);
    });

    it('base case', async () => {
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});

        const num = await getUsersCountFromMentions(serverUrl, [user.username]);
        expect(num).toBe(1);
    });
});
