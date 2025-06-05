// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {queryPostsById, queryPostsChunk} from '@queries/servers/post';
import TestHelper from '@test/test_helper';

import {fetchPostAuthors, fetchPostsForChannel} from './post';
import {processChannelPostsByTeam} from './post.auxiliary';

import type ServerDataOperator from '@database/operator/server_data_operator';

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
        DatabaseManager.destroyServerDatabase('baseHandler.test.com');
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
