// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {ActionType} from '@constants';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {queryPostsById, queryPostsChunk} from '@queries/servers/post';
import TestHelper from '@test/test_helper';

import {fetchPostAuthors, fetchPostsForChannel} from './post';
import {processChannelPostsByTeam} from './post.auxiliary';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';

jest.mock('./post');

const user1 = {id: 'userid1', username: 'user1', email: 'user1@mattermost.com', roles: ''} as UserProfile;
const user2 = {id: 'userid2', username: 'user2', email: 'user2@mattermost.com', roles: ''} as UserProfile;

const post1 = TestHelper.fakePost({channel_id: 'channelid1', id: 'postid1', user_id: user1.id});
const post2 = TestHelper.fakePost({channel_id: 'channelid1', id: 'postid2', user_id: user2.id});
const post3 = TestHelper.fakePost({channel_id: 'channelid2', id: 'postid3', user_id: user2.id});

describe('post.auxilary', () => {
    let operator: ServerDataOperator;
    let spyOnBatchRecords: jest.SpyInstance;
    const serverUrl = 'baseHandler.test.com';
    beforeEach(async () => {
        jest.clearAllMocks();

        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        spyOnBatchRecords = jest.spyOn(operator, 'batchRecords');
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase('baseHandler.test.com');
    });

    it('should batch record once for multiple posts', async () => {
        (fetchPostsForChannel as jest.Mock).mockResolvedValue({
            posts: Array.from({length: 20}, (_, index) => TestHelper.fakePost({channel_id: 'channelid1', id: `postid${index}`, user_id: user1.id})),
        });
        await processChannelPostsByTeam(serverUrl, ['channelid1']);
        expect(spyOnBatchRecords).toHaveBeenCalledTimes(1);

        const postsByChannel = await queryPostsChunk(operator.database, 'channelid1', 0, Date.now());
        expect(postsByChannel.length).toBe(20);
    });

    it('should fetch post authors', async () => {
        (fetchPostsForChannel as jest.Mock).mockResolvedValue({
            posts: [post1, post2],
        });
        await processChannelPostsByTeam(serverUrl, ['channelid1']);

        expect(fetchPostAuthors).toHaveBeenCalledWith(serverUrl, [post1, post2], false, undefined);
    });

    it('should not fetch post authors if skipAuthors is true', async () => {
        (fetchPostsForChannel as jest.Mock).mockResolvedValue({
            posts: [post1, post2],
        });
        await processChannelPostsByTeam(serverUrl, ['channelid1'], true);
        expect(fetchPostAuthors).not.toHaveBeenCalled();
    });

    it('should not batch record if no channels are passed', async () => {
        await processChannelPostsByTeam(serverUrl, []);
        expect(spyOnBatchRecords).not.toHaveBeenCalled();
    });

    it('should not batch record if no posts fetched from server', async () => {
        (fetchPostsForChannel as jest.Mock).mockResolvedValue({});
        await processChannelPostsByTeam(serverUrl, ['channelid1']);
        expect(spyOnBatchRecords).not.toHaveBeenCalled();
    });

    it('should not fetch authors if no posts returned', async () => {
        (fetchPostsForChannel as jest.Mock).mockResolvedValue({});
        await processChannelPostsByTeam(serverUrl, ['channelid1']);
        expect(fetchPostAuthors).not.toHaveBeenCalled();
    });

    it('extends the existing interval (no orphan) when a since-fetch returns posts newer than the chunk (MM-66467)', async () => {
        const queryIntervals = () => operator.database.
            get<PostsInChannelModel>(MM_TABLES.SERVER.POSTS_IN_CHANNEL).
            query(Q.where('channel_id', 'channelid1')).fetch();

        // Seed an existing interval [1000, 5000] for the channel.
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: ['seed1', 'seed2'],
            posts: [
                TestHelper.fakePost({channel_id: 'channelid1', id: 'seed1', user_id: user1.id, create_at: 1000, update_at: 1000, delete_at: 0}),
                TestHelper.fakePost({channel_id: 'channelid1', id: 'seed2', user_id: user1.id, create_at: 5000, update_at: 5000, delete_at: 0}),
            ],
        });

        const seeded = await queryIntervals();
        expect(seeded.length).toBe(1);
        expect(seeded[0].earliest).toBe(1000);
        expect(seeded[0].latest).toBe(5000);

        // The deferred unread-channel fetch uses getPostsSince, so fetchPostsForChannel returns a
        // contiguous continuation with actionType RECEIVED_SINCE. A live post at 9000 (> 5000)
        // must EXTEND the existing chunk — not create a disjoint [9000, 9000] orphan that becomes
        // postsInChannel[0] and hides the channel (MM-66467).
        (fetchPostsForChannel as jest.Mock).mockResolvedValue({
            posts: [TestHelper.fakePost({channel_id: 'channelid1', id: 'newpost', user_id: user1.id, create_at: 9000, update_at: 9000, delete_at: 0})],
            order: ['newpost'],
            previousPostId: '',
            actionType: ActionType.POSTS.RECEIVED_SINCE,
        });

        await processChannelPostsByTeam(serverUrl, ['channelid1']);

        const after = await queryIntervals();
        expect(after.length).toBe(1);
        expect(after[0].earliest).toBe(1000);
        expect(after[0].latest).toBe(9000);
    });

    it('should still batch record even if some posts are returning errors', async () => {
        (fetchPostsForChannel as jest.Mock).mockRejectedValueOnce(new Error('error'));
        (fetchPostsForChannel as jest.Mock).mockResolvedValue({
            posts: [post3],
        });
        await processChannelPostsByTeam(serverUrl, ['channelid1', 'channelid2']);
        expect(spyOnBatchRecords).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    _raw: expect.objectContaining({
                        channel_id: 'channelid2',
                    }),
                }),
            ]),
            'processTeamChannels',
        );

        const postsChannel1 = await queryPostsById(operator.database, ['postid1']);
        expect(postsChannel1.length).toBe(0);

        const postsChannel2 = await queryPostsById(operator.database, ['postid3']);
        expect(postsChannel2.length).toBe(1);
    });
});
