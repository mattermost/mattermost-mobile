// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ActionType, Post} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';
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
    deletePostsInChannelsByCutoff,
    getUsersCountFromMentions,
    updatePostTranslation,
} from './post';

import type ServerDataOperator from '@database/operator/server_data_operator';

const {SERVER: {FILE, MY_CHANNEL, POST, POSTS_IN_CHANNEL, POSTS_IN_THREAD, REACTION, THREAD, THREAD_PARTICIPANT, THREADS_IN_TEAM}} = MM_TABLES;

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

describe('updatePostTranslation', () => {
    const post = TestHelper.fakePost({id: 'postid4', channel_id: channelId});

    it('post not found', async () => {
        const translation: PostTranslation = {object: {message: 'Hola'}, state: 'ready', source_lang: 'en'};
        const result = await updatePostTranslation(serverUrl, 'nonexistent', 'es', translation);
        expect(result.error).toBe('Post not found');
    });

    it('updates post metadata with translation', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });

        const translation: PostTranslation = {object: {message: 'Hola'}, state: 'ready', source_lang: 'en'};
        const result = await updatePostTranslation(serverUrl, post.id, 'es', translation);
        expect(result.error).toBeUndefined();

        const updatedPost = await getPostById(operator.database, post.id);
        expect(updatedPost).toBeDefined();
        expect(updatedPost?.metadata?.translations?.es).toEqual(translation);
    });

    it('handle database write error', async () => {
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });

        const originalWrite = operator.database.write;
        operator.database.write = jest.fn().mockRejectedValue(new Error('Write failed'));

        const translation: PostTranslation = {object: {message: 'Hola'}, state: 'ready', source_lang: 'en'};
        const result = await updatePostTranslation(serverUrl, post.id, 'es', translation);

        operator.database.write = originalWrite;

        expect(result.error).toBeTruthy();
    });
});

describe('deletePostsInChannelsByCutoff', () => {
    const CUTOFF = 50_000_000;

    it('handle not found database', async () => {
        const {error} = await deletePostsInChannelsByCutoff('foo', [channelId], CUTOFF);
        expect(error).toBeTruthy();
    });

    it('includes the PostsInChannel destroy/update and MyChannel reset, in that order, in the same unsafeExecute call as the post delete', async () => {
        const database = operator.database;
        jest.spyOn(database.adapter, 'unsafeExecute').mockImplementation(() => Promise.resolve());

        const {error} = await deletePostsInChannelsByCutoff(serverUrl, [channelId], CUTOFF);

        expect(error).toBeUndefined();
        const postCondition = `channel_id IN ('${channelId}') AND create_at < ${CUTOFF}`;
        const postSubquery = `SELECT id FROM ${POST} WHERE ${postCondition}`;
        const rootInChannelsExists = `EXISTS (SELECT 1 FROM ${POST} WHERE ${POST}.id = ${POSTS_IN_THREAD}.root_id AND ${POST}.channel_id IN ('${channelId}'))`;
        expect(database.adapter.unsafeExecute).toHaveBeenCalledWith({
            sqls: [
                [`DELETE FROM ${REACTION} WHERE post_id IN (${postSubquery})`, []],
                [`DELETE FROM ${FILE} WHERE post_id IN (${postSubquery})`, []],
                [`DELETE FROM ${POSTS_IN_THREAD} WHERE latest < ${CUTOFF} AND ${rootInChannelsExists}`, []],
                [`UPDATE ${POSTS_IN_THREAD} SET earliest = ${CUTOFF} WHERE earliest < ${CUTOFF} AND ${rootInChannelsExists}`, []],
                [`DELETE FROM ${THREAD} WHERE id IN (${postSubquery})`, []],
                [`DELETE FROM ${THREAD_PARTICIPANT} WHERE thread_id IN (${postSubquery})`, []],
                [`DELETE FROM ${THREADS_IN_TEAM} WHERE thread_id IN (${postSubquery})`, []],
                [`DELETE FROM ${POST} WHERE ${postCondition}`, []],
                [`DELETE FROM ${POSTS_IN_CHANNEL} WHERE channel_id IN ('${channelId}') AND latest < ${CUTOFF}`, []],
                [`UPDATE ${POSTS_IN_CHANNEL} SET earliest = ${CUTOFF} WHERE channel_id IN ('${channelId}') AND earliest < ${CUTOFF}`, []],
                [`UPDATE ${MY_CHANNEL} SET last_fetched_at = 0 WHERE id IN ('${channelId}') AND last_fetched_at > 0 AND NOT EXISTS (SELECT 1 FROM ${POSTS_IN_CHANNEL} WHERE channel_id = ${MY_CHANNEL}.id)`, []],
            ],
        });
    });

    it('returns an error when the underlying transaction fails', async () => {
        const database = operator.database;
        jest.spyOn(database.adapter, 'unsafeExecute').mockImplementation(() => Promise.reject(new Error('fail')));

        const {error} = await deletePostsInChannelsByCutoff(serverUrl, [channelId], CUTOFF);

        expect(error).toBeTruthy();
    });

    it('scopes the post delete and its dependent subqueries to exclude the given post IDs', async () => {
        const database = operator.database;
        jest.spyOn(database.adapter, 'unsafeExecute').mockImplementation(() => Promise.resolve());

        const {error} = await deletePostsInChannelsByCutoff(serverUrl, [channelId], CUTOFF, new Set(['excluded-1', 'excluded-2']));

        expect(error).toBeUndefined();
        const postCondition = `channel_id IN ('${channelId}') AND create_at < ${CUTOFF} AND id NOT IN ('excluded-1','excluded-2')`;
        const postSubquery = `SELECT id FROM ${POST} WHERE ${postCondition}`;
        expect(database.adapter.unsafeExecute).toHaveBeenCalledWith(
            expect.objectContaining({
                sqls: expect.arrayContaining([
                    [`DELETE FROM ${REACTION} WHERE post_id IN (${postSubquery})`, []],
                    [`DELETE FROM ${POST} WHERE ${postCondition}`, []],
                ]),
            }),
        );
    });
});
