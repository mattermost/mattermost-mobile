// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DataOperator from '@database/admin/data_operator';
import DatabaseManager from '@database/admin/database_manager';
import {DatabaseType} from '@typings/database/enums';
import {RawPost} from '@typings/database/database';

import {createPostsChain, sanitizePosts, sanitizeReactions} from './index';
import {mockedPosts, mockedReactions} from './mock';

jest.mock('@database/admin/database_manager');

describe('DataOperator: Utils tests', () => {
    it('=> sanitizePosts: should filter between ordered and unordered posts', () => {
        const {postsOrdered, postsUnordered} = sanitizePosts({
            posts: Object.values(mockedPosts.posts),
            orders: mockedPosts.order,
        });
        expect(postsOrdered.length).toBe(4);
        expect(postsUnordered.length).toBe(2);
    });

    it('=> createPostsChain: should link posts amongst each other based on order array', () => {
        const previousPostId = 'prev_xxyuoxmehne';
        const chainedOfPosts = createPostsChain({
            orders: mockedPosts.order,
            rawPosts: Object.values(mockedPosts.posts),
            previousPostId,
        });

        // eslint-disable-next-line max-nested-callbacks
        const post1 = chainedOfPosts.find((post) => {
            const p = post.raw as unknown as RawPost;
            return p.id === '8swgtrrdiff89jnsiwiip3y1eoe';
        })?.raw as unknown as RawPost;

        expect(post1).toBeTruthy();
        expect(post1?.prev_post_id).toBe(previousPostId);

        // eslint-disable-next-line max-nested-callbacks
        const post2 = chainedOfPosts.find((post) => {
            const p = post.raw as unknown as RawPost;
            return p.id === '8fcnk3p1jt8mmkaprgajoxz115a';
        })?.raw as unknown as RawPost;

        expect(post2).toBeTruthy();
        expect(post2!.prev_post_id).toBe('8swgtrrdiff89jnsiwiip3y1eoe');

        // eslint-disable-next-line max-nested-callbacks
        const post3 = chainedOfPosts.find((post) => {
            const p = post.raw as unknown as RawPost;
            return p.id === '3y3w3a6gkbg73bnj3xund9o5ic';
        })?.raw as unknown as RawPost;

        expect(post3).toBeTruthy();
        expect(post3?.prev_post_id).toBe('8fcnk3p1jt8mmkaprgajoxz115a');

        // eslint-disable-next-line max-nested-callbacks
        const post4 = chainedOfPosts.find((post) => {
            const p = post.raw as unknown as RawPost;
            return p.id === '4btbnmticjgw7ewd3qopmpiwqw';
        })?.raw as unknown as RawPost;

        expect(post4).toBeTruthy();
        expect(post4!.prev_post_id).toBe('3y3w3a6gkbg73bnj3xund9o5ic');
    });

    it('=> sanitizeReactions: should triage between reactions that needs creation/deletion and emojis to be created', async () => {
        const dbName = 'server_schema_connection';
        const serverUrl = 'https://appv2.mattermost.com';
        const database = await DatabaseManager.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            configs: {
                actionsEnabled: true,
                dbName,
                dbType: DatabaseType.SERVER,
                serverUrl,
            },
        });
        await DatabaseManager.setActiveServerDatabase({
            displayName: dbName,
            serverUrl,
        });

        // we commit one Reaction to our database
        const prepareRecords = await DataOperator.handleReactions({
            reactions: [
                {
                    user_id: 'beqkgo4wzbn98kjzjgc1p5n91o',
                    post_id: '8ww8kb1dbpf59fu4d5xhu5nf5w',
                    emoji_name: 'tada_will_be_removed',
                    create_at: 1601558322701,
                    update_at: 1601558322701,
                    delete_at: 0,
                },
            ],
            prepareRowsOnly: true,
        });

        // Jest in not using the same database instance amongst the Singletons; hence, we are creating the reaction record here
        // eslint-disable-next-line max-nested-callbacks
        await database!.action(async () => {
            await database!.batch(...prepareRecords);
        });

        const {
            createReactions,
            createEmojis,
            deleteReactions,
        } = await sanitizeReactions({
            database: database!,
            post_id: '8ww8kb1dbpf59fu4d5xhu5nf5w',
            rawReactions: mockedReactions,
        });

        // The reaction with emoji_name 'tada_will_be_removed' will be in the deleteReactions array.   This implies that the user who reacted on that post later removed the reaction.
        expect(deleteReactions.length).toBe(1);
        expect(deleteReactions[0].emojiName).toBe('tada_will_be_removed');

        expect(createReactions.length).toBe(3);

        expect(createEmojis.length).toBe(3);
    });
});
