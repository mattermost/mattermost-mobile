// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {queryPostsById} from '@queries/servers/post';
import TestHelper from '@test/test_helper';

import type PostModel from '@typings/database/models/servers/post';

const serverUrl = 'recent-mentions.test.com';
const postId = 'postid1';

describe('Recent Mentions posts subscription', () => {
    let database: Database;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const server = DatabaseManager.serverDatabases[serverUrl]!;
        database = server.database;
        await server.operator.handlePosts({
            actionType: 'RECEIVED_NEW_POSTS',
            order: [postId],
            posts: [TestHelper.fakePost({id: postId, message: 'Own mention', edit_at: 0})],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    const editThePost = async () => {
        const post = await database.get<PostModel>(MM_TABLES.SERVER.POST).find(postId);
        await database.write(async () => {
            await post.update((p) => {
                p.message = 'Own mention edit';
                p.editAt = 1234;
            });
        });
    };

    // The screen renders the post body straight off these models, so an edit that never reaches
    // the subscriber leaves the stale message on screen with no "Edited" marker (MM-T4909_3).
    it('should re-emit when an already-matching post is edited', async () => {
        const emissions: string[][] = [];
        const subscription = queryPostsById(database, [postId], Q.asc).
            observeWithColumns(['message', 'edit_at', 'update_at', 'delete_at', 'metadata', 'props']).
            subscribe((posts) => emissions.push(posts.map((p) => p.message)));

        await editThePost();
        subscription.unsubscribe();

        expect(emissions[emissions.length - 1]).toEqual(['Own mention edit']);
    });

    // Guards the regression itself: this is what the screen used to subscribe to.
    it('should NOT re-emit on an edit when using a plain observe', async () => {
        const emissions: string[][] = [];
        const subscription = queryPostsById(database, [postId], Q.asc).
            observe().
            subscribe((posts) => emissions.push(posts.map((p) => p.message)));

        await editThePost();
        subscription.unsubscribe();

        expect(emissions[emissions.length - 1]).toEqual(['Own mention']);
    });
});
