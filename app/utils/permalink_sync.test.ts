// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';
import ServerDataOperator from '@database/operator/server_data_operator';
import TestHelper from '@test/test_helper';
import * as logModule from '@utils/log';

import {updatePermalinkMetadata} from './permalink_sync';

import type PostModel from '@typings/database/models/servers/post';

describe('Permalink Sync Utils', () => {
    const serverUrl = 'permalinksync.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('updatePermalinkMetadata', () => {
        it('should return null when post has no metadata', async () => {
            const referencedPostId = 'referenced_post_456';
            const freshPostData = TestHelper.fakePost({id: referencedPostId});

            const postWithoutMetadata = TestHelper.fakePost({
                id: 'post_without_metadata',
                channel_id: 'channel1',
                metadata: undefined,
            });

            const models = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_NEW,
                order: [postWithoutMetadata.id],
                posts: [postWithoutMetadata],
                prepareRecordsOnly: true,
            });
            await operator.batchRecords(models, 'test');

            const postModel = await database.get('Post').find(postWithoutMetadata.id) as PostModel;

            const result = updatePermalinkMetadata(postModel, referencedPostId, freshPostData);

            expect(result).toBeNull();
        });

        it('should return null when post has no embeds', async () => {
            const referencedPostId = 'referenced_post_456';
            const freshPostData = TestHelper.fakePost({id: referencedPostId});

            const postWithEmptyEmbeds = TestHelper.fakePost({
                id: 'post_with_empty_embeds',
                channel_id: 'channel1',
                metadata: {
                    embeds: [],
                },
            });

            const models = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_NEW,
                order: [postWithEmptyEmbeds.id],
                posts: [postWithEmptyEmbeds],
                prepareRecordsOnly: true,
            });
            await operator.batchRecords(models, 'test');

            const postModel = await database.get('Post').find(postWithEmptyEmbeds.id) as PostModel;

            const result = updatePermalinkMetadata(postModel, referencedPostId, freshPostData);

            expect(result).toBeNull();
        });

        it('should update permalink metadata when fresh post is newer', async () => {
            const referencedPostId = 'referenced_post_456';

            const referencingPost = TestHelper.fakePost({
                id: 'referencing_post_123',
                channel_id: 'channel1',
                metadata: {
                    embeds: [
                        {
                            type: 'permalink',
                            url: '',
                            data: {
                                post_id: referencedPostId,
                                post: {
                                    id: referencedPostId,
                                    message: 'Old message',
                                    edit_at: 1000,
                                    update_at: 1000,
                                    user_id: 'user_123',
                                    create_at: 500,
                                },
                            },
                        },
                    ],
                },
            });

            const models = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_NEW,
                order: [referencingPost.id],
                posts: [referencingPost],
                prepareRecordsOnly: true,
            });
            await operator.batchRecords(models, 'test');

            const postModel = await database.get('Post').find(referencingPost.id) as PostModel;

            const freshPostData = TestHelper.fakePost({
                id: referencedPostId,
                message: 'Updated message',
                edit_at: 2000,
                update_at: 2000,
                user_id: 'user_123',
                create_at: 500,
            });

            const result = updatePermalinkMetadata(postModel, referencedPostId, freshPostData);

            expect(result).not.toBeNull();
            expect(result!.id).toBe(referencingPost.id);
            expect(result!._preparedState).toBe('update');

            await operator.batchRecords([result!], 'test update');
        });

        it('should not update when fresh post is older or same age', async () => {
            const referencedPostId = 'referenced_post_456';

            const referencingPost = TestHelper.fakePost({
                id: 'referencing_post_123',
                channel_id: 'channel1',
                metadata: {
                    embeds: [
                        {
                            type: 'permalink',
                            url: '',
                            data: {
                                post_id: referencedPostId,
                                post: {
                                    id: referencedPostId,
                                    message: 'Current message',
                                    edit_at: 2000,
                                    update_at: 2000,
                                    user_id: 'user_123',
                                    create_at: 500,
                                },
                            },
                        },
                    ],
                },
            });

            const models = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_NEW,
                order: [referencingPost.id],
                posts: [referencingPost],
                prepareRecordsOnly: true,
            });
            await operator.batchRecords(models, 'test');

            const postModel = await database.get('Post').find(referencingPost.id) as PostModel;

            const freshPostData = TestHelper.fakePost({
                id: referencedPostId,
                message: 'Older message',
                edit_at: 1000,
                update_at: 1000,
            });

            const result = updatePermalinkMetadata(postModel, referencedPostId, freshPostData);

            expect(result).toBeNull();
        });

        it('should handle errors during post update gracefully', async () => {
            const referencedPostId = 'referenced_post_456';

            const referencingPost = TestHelper.fakePost({
                id: 'referencing_post_123',
                channel_id: 'channel1',
                metadata: {
                    embeds: [
                        {
                            type: 'permalink',
                            url: '',
                            data: {
                                post_id: referencedPostId,
                                post: {
                                    id: referencedPostId,
                                    message: 'Old message',
                                    edit_at: 1000,
                                    update_at: 1000,
                                    user_id: 'user_123',
                                    create_at: 500,
                                },
                            },
                        },
                    ],
                },
            });

            const models = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_NEW,
                order: [referencingPost.id],
                posts: [referencingPost],
                prepareRecordsOnly: true,
            });
            await operator.batchRecords(models, 'test');

            const postModel = await database.get('Post').find(referencingPost.id) as PostModel;

            const testError = new Error('Database update failed');
            jest.spyOn(postModel, 'prepareUpdate').mockImplementationOnce(() => {
                throw testError;
            });

            const logWarningSpy = jest.spyOn(logModule, 'logWarning').mockImplementationOnce(() => {});

            const freshPostData = TestHelper.fakePost({
                id: referencedPostId,
                message: 'Updated message',
                edit_at: 2000,
                update_at: 2000,
                user_id: 'user_123',
                create_at: 500,
            });

            const result = updatePermalinkMetadata(postModel, referencedPostId, freshPostData);

            expect(result).toBeNull();
            expect(logWarningSpy).toHaveBeenCalledWith('Error updating permalink metadata:', testError);
        });
    });
});
