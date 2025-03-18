// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {ActionType} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import TestHelper from '@test/test_helper';

import {
    getIsReactionAlreadyAddedToPost,
    toggleReaction,
    addReaction,
    removeReaction,
    handleReactionToLatestPost,
} from './reactions';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ReactionModel from '@typings/database/models/servers/reaction';

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
const post2 = TestHelper.fakePost({channel_id: channelId, id: 'postid2', root_id: post1.id});

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

const reaction = {
    create_at: 123,
    emoji_name: '+1',
    post_id: post1.id,
    user_id: user1.id,
};

const mockClient = {
    addReaction: jest.fn((userId: string, postId: string, emoji: string) => ({user_id: userId, post_id: postId, emoji_name: emoji})),
    removeReaction: jest.fn(),
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

describe('reactions crud', () => {
    it('getIsReactionAlreadyAddedToPost - handle error', async () => {
        const result = await getIsReactionAlreadyAddedToPost('foo', '', '') as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('getIsReactionAlreadyAddedToPost - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await getIsReactionAlreadyAddedToPost(serverUrl, post1.id, '+1');
        expect(result).toBe(false);
    });

    it('toggleReaction - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });
        await operator.handleReactions({
            postsReactions: [{
                post_id: post1.id,
                reactions: [reaction],
            }],
            prepareRecordsOnly: false,
        });

        const result = await toggleReaction(serverUrl, post1.id, '+1');
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.reaction).toBeDefined();
        expect((result.reaction as ReactionModel[]).length).toBe(1); // Reaction removed so we expect an array of reaction models

        const result2 = await toggleReaction(serverUrl, post1.id, '+1');
        expect(result2).toBeDefined();
        expect(result2.error).toBeUndefined();
        expect(result2.reaction).toBeDefined();
        expect((result2.reaction as Reaction).emoji_name).toBe('+1'); // Reaction added so we expect a single reaction object
    });

    it('addReaction - handle error', async () => {
        const result = await addReaction('foo', '', '');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('addReaction - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});

        const result = await addReaction(serverUrl, post1.id, '+1');
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.reaction).toBeDefined();
        expect(result.reaction?.emoji_name).toBe('+1');
    });

    it('addReaction - already reacted', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handleReactions({
            postsReactions: [{
                post_id: post1.id,
                reactions: [reaction],
            }],
            prepareRecordsOnly: false,
        });

        const result = await addReaction(serverUrl, post1.id, '+1');
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.reaction).toBeDefined();
        expect(result.reaction?.create_at).toBe(0);
    });

    it('removeReaction - handle error', async () => {
        const result = await removeReaction('foo', '', '');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('removeReaction - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handleReactions({
            postsReactions: [{
                post_id: post1.id,
                reactions: [reaction],
            }],
            prepareRecordsOnly: false,
        });

        const result = await removeReaction(serverUrl, post1.id, '+1');
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.reaction).toBeDefined();
        expect(result.reaction?.length).toBe(1);
    });

    it('handleReactionToLatestPost - handle error', async () => {
        const result = await handleReactionToLatestPost('foo', '', true);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('handleReactionToLatestPost - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: channelId}], prepareRecordsOnly: false});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id],
            posts: [post1],
            prepareRecordsOnly: false,
        });

        const result = await handleReactionToLatestPost(serverUrl, '+1', true);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.reaction).toBeDefined();
        expect((result.reaction as Reaction).emoji_name).toBe('+1'); // Reaction added so we expect a single reaction object

        const result2 = await handleReactionToLatestPost(serverUrl, '+1', false);
        expect(result2).toBeDefined();
        expect(result2.error).toBeUndefined();
        expect(result2.reaction).toBeDefined();
        expect((result2.reaction as ReactionModel[]).length).toBe(1); // Reaction removed so we expect an array of reaction models
    });

    it('handleReactionToLatestPost - base case with thread', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user1.id}], prepareRecordsOnly: false});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post1.id, post2.id],
            posts: [post1, post2],
            prepareRecordsOnly: false,
        });
        await operator.handleThreads({threads, prepareRecordsOnly: false, teamId: team.id});

        const result = await handleReactionToLatestPost(serverUrl, '+1', true, post1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.reaction).toBeDefined();
        expect((result.reaction as Reaction).emoji_name).toBe('+1'); // Reaction added so we expect a single reaction object
    });
});
