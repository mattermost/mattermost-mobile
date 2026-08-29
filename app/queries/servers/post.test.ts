// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {firstValueFrom} from 'rxjs';

import {ActionType, License} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import ServerDataOperator from '@database/operator/server_data_operator';
import TestHelper from '@test/test_helper';

import {
    queryPostsWithPermalinkReferences,
    observeIsBoREnabled,
    getPostById,
    observePost,
    getRecentPostsInChannel,
    queryPostsById,
    queryPostsByType,
    queryPostsBetween,
    queryPinnedPostsInChannel,
    observePinnedPostsInChannel,
    getIsPostPriorityEnabled,
    getIsPostAcknowledgementsEnabled,
    observeIsPostPriorityEnabled,
    observeIsPostAcknowledgementsEnabled,
    observeBoRConfig,
    countUsersFromMentions,
    findPostsWithPermalinkReferences,
} from './post';

describe('Post Queries', () => {
    const serverUrl = 'post.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('queryPostsWithPermalinkReferences', () => {
        it('should return posts that reference the given post ID', async () => {
            const referencedPostId = 'referenced_post_123';
            const referencingPost = TestHelper.fakePost({
                id: 'referencing_post_456',
                channel_id: 'channel1',
                metadata: {
                    embeds: [
                        {
                            type: 'permalink',
                            url: '',
                            data: {
                                post_id: referencedPostId,
                            },
                        },
                    ],
                },
            });

            const nonReferencingPost = TestHelper.fakePost({
                id: 'non_referencing_post_789',
                channel_id: 'channel1',
                metadata: {
                    embeds: [
                        {
                            type: 'opengraph',
                            url: 'https://example.com',
                            data: {},
                        },
                    ],
                },
            });

            const models = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_NEW,
                order: [referencingPost.id, nonReferencingPost.id],
                posts: [referencingPost, nonReferencingPost],
                prepareRecordsOnly: true,
            });
            await operator.batchRecords(models, 'test');

            const result = await queryPostsWithPermalinkReferences(database, referencedPostId);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(referencingPost.id);
        });

        it('should return posts from multiple channels that reference the same post', async () => {
            const referencedPostId = 'referenced_post_123';
            const channel1Post = TestHelper.fakePost({
                id: 'channel1_post',
                channel_id: 'channel1',
                metadata: {
                    embeds: [
                        {
                            type: 'permalink',
                            url: '',
                            data: {
                                post_id: referencedPostId,
                            },
                        },
                    ],
                },
            });

            const channel2Post = TestHelper.fakePost({
                id: 'channel2_post',
                channel_id: 'channel2',
                metadata: {
                    embeds: [
                        {
                            type: 'permalink',
                            url: '',
                            data: {
                                post_id: referencedPostId,
                            },
                        },
                    ],
                },
            });

            const models = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_NEW,
                order: [channel1Post.id, channel2Post.id],
                posts: [channel1Post, channel2Post],
                prepareRecordsOnly: true,
            });
            await operator.batchRecords(models, 'test');

            const result = await queryPostsWithPermalinkReferences(database, referencedPostId);

            expect(result).toHaveLength(2);
            expect(result.map((p) => p.id)).toEqual(expect.arrayContaining([channel1Post.id, channel2Post.id]));
        });

        it('should exclude deleted posts', async () => {
            const referencedPostId = 'referenced_post_123';
            const deletedPost = TestHelper.fakePost({
                id: 'deleted_post',
                channel_id: 'channel1',
                delete_at: Date.now(),
                metadata: {
                    embeds: [
                        {
                            type: 'permalink',
                            url: '',
                            data: {
                                post_id: referencedPostId,
                            },
                        },
                    ],
                },
            });

            const models = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_NEW,
                order: [deletedPost.id],
                posts: [deletedPost],
                prepareRecordsOnly: true,
            });
            await operator.batchRecords(models, 'test');

            const result = await queryPostsWithPermalinkReferences(database, referencedPostId);

            expect(result).toHaveLength(0);
        });

        it('should exclude posts without metadata', async () => {
            const referencedPostId = 'referenced_post_123';
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

            const result = await queryPostsWithPermalinkReferences(database, referencedPostId);

            expect(result).toHaveLength(0);
        });

        it('should exclude posts with empty embeds', async () => {
            const referencedPostId = 'referenced_post_123';
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

            const result = await queryPostsWithPermalinkReferences(database, referencedPostId);

            expect(result).toHaveLength(0);
        });

        it('should handle multiple embeds and find the correct permalink', async () => {
            const referencedPostId = 'referenced_post_123';
            const postWithMultipleEmbeds = TestHelper.fakePost({
                id: 'post_with_multiple_embeds',
                channel_id: 'channel1',
                metadata: {
                    embeds: [
                        {
                            type: 'opengraph',
                            url: 'https://example.com',
                            data: {},
                        },
                        {
                            type: 'permalink',
                            url: '',
                            data: {
                                post_id: referencedPostId,
                            },
                        },
                        {
                            type: 'image',
                            url: 'https://example.com/image.jpg',
                            data: {},
                        },
                    ],
                },
            });

            const models = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_NEW,
                order: [postWithMultipleEmbeds.id],
                posts: [postWithMultipleEmbeds],
                prepareRecordsOnly: true,
            });
            await operator.batchRecords(models, 'test');

            const result = await queryPostsWithPermalinkReferences(database, referencedPostId);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(postWithMultipleEmbeds.id);
        });

        it('should return empty array when no posts reference the given post ID', async () => {
            const nonExistentPostId = 'non_existent_post_456';

            const result = await queryPostsWithPermalinkReferences(database, nonExistentPostId);

            expect(result).toHaveLength(0);
        });

        it('should only match exact post_id in permalink data', async () => {
            const referencedPostId = 'referenced_post_123';
            const partialMatchPost = TestHelper.fakePost({
                id: 'partial_match_post',
                channel_id: 'channel1',
                metadata: {
                    embeds: [
                        {
                            type: 'permalink',
                            url: '',
                            data: {
                                post_id: 'referenced_post_12345',
                            },
                        },
                    ],
                },
            });

            const models = await operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_NEW,
                order: [partialMatchPost.id],
                posts: [partialMatchPost],
                prepareRecordsOnly: true,
            });
            await operator.batchRecords(models, 'test');

            const result = await queryPostsWithPermalinkReferences(database, referencedPostId);

            expect(result).toHaveLength(0);
        });
    });

    describe('observeIsBoREnabled', () => {
        it('should return true when both feature is enabled and license is valid', async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
                prepareRecordsOnly: false,
            });

            await operator.handleConfigs({
                configs: [
                    {id: 'EnableBurnOnRead', value: 'true'},
                    {id: 'BuildEnterpriseReady', value: 'true'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            const result = await firstValueFrom(observeIsBoREnabled(database));
            expect(result).toBe(true);
        });

        it('should return false when feature is disabled but license is valid', async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
                prepareRecordsOnly: false,
            });

            await operator.handleConfigs({
                configs: [
                    {id: 'EnableBurnOnRead', value: 'false'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            const result = await firstValueFrom(observeIsBoREnabled(database));
            expect(result).toBe(false);
        });

        it('should return false when feature is enabled but license is insufficient', async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.Enterprise}}],
                prepareRecordsOnly: false,
            });

            await operator.handleConfigs({
                configs: [
                    {id: 'EnableBurnOnRead', value: 'true'},
                    {id: 'BuildEnterpriseReady', value: 'true'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            const result = await firstValueFrom(observeIsBoREnabled(database));
            expect(result).toBe(false);
        });

        it('should return false when both feature is disabled and license is insufficient', async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.Professional}}],
                prepareRecordsOnly: false,
            });

            await operator.handleConfigs({
                configs: [
                    {id: 'EnableBurnOnRead', value: 'false'},
                    {id: 'BuildEnterpriseReady', value: 'true'},
                ],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });

            const result = await firstValueFrom(observeIsBoREnabled(database));
            expect(result).toBe(false);
        });

        it('should return false when no config is set', async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced}}],
                prepareRecordsOnly: false,
            });

            const result = await firstValueFrom(observeIsBoREnabled(database));
            expect(result).toBe(false);
        });
    });
});

describe('post query helpers', () => {
    const serverUrl = 'post.helpers.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await TestHelper.setupServerDatabase(serverUrl);
        ({database, operator} = DatabaseManager.serverDatabases[serverUrl]!);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('getPostById', () => {
        it('should return undefined when post does not exist', async () => {
            expect(await getPostById(database, 'nonexistent')).toBeUndefined();
        });

        it('should return post when it exists', async () => {
            const post = TestHelper.fakePost({channel_id: TestHelper.basicChannel!.id});
            await operator.handlePosts({posts: [post], order: [post.id], previousPostId: '', actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
            const result = await getPostById(database, post.id);
            expect(result?.id).toBe(post.id);
        });
    });

    describe('observePost', () => {
        it('should emit undefined when post does not exist', async () => {
            const result = await firstValueFrom(observePost(database, 'nonexistent'));
            expect(result).toBeUndefined();
        });

        it('should emit post when it exists', async () => {
            const post = TestHelper.fakePost({channel_id: TestHelper.basicChannel!.id});
            await operator.handlePosts({posts: [post], order: [post.id], previousPostId: '', actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
            const result = await firstValueFrom(observePost(database, post.id));
            expect(result?.id).toBe(post.id);
        });
    });

    describe('getRecentPostsInChannel', () => {
        it('should return empty array when no posts in channel', async () => {
            const result = await getRecentPostsInChannel(database, 'nonexistent');
            expect(result).toEqual([]);
        });
    });

    describe('queryPostsById', () => {
        it('should return posts matching given ids', async () => {
            const post = TestHelper.fakePost({channel_id: TestHelper.basicChannel!.id});
            await operator.handlePosts({posts: [post], order: [post.id], previousPostId: '', actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
            const results = await queryPostsById(database, [post.id]).fetch();
            expect(results.map((p) => p.id)).toContain(post.id);
        });

        it('should return empty array when no matching ids', async () => {
            const results = await queryPostsById(database, ['nonexistent']).fetch();
            expect(results).toEqual([]);
        });
    });

    describe('queryPostsByType', () => {
        it('should return posts matching given type', async () => {
            const post = TestHelper.fakePost({channel_id: TestHelper.basicChannel!.id, type: 'system_join_channel'});
            await operator.handlePosts({posts: [post], order: [post.id], previousPostId: '', actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
            const results = await queryPostsByType(database, 'system_join_channel').fetch();
            expect(results.length).toBeGreaterThan(0);
        });
    });

    describe('queryPostsBetween', () => {
        it('should return posts within time range', async () => {
            const now = Date.now();
            const post = TestHelper.fakePost({channel_id: TestHelper.basicChannel!.id, create_at: now});
            await operator.handlePosts({posts: [post], order: [post.id], previousPostId: '', actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
            const results = await queryPostsBetween(database, now - 1000, now + 1000, null).fetch();
            expect(results.map((p) => p.id)).toContain(post.id);
        });

        it('should filter by channelId when provided', async () => {
            const now = Date.now();
            const post = TestHelper.fakePost({channel_id: TestHelper.basicChannel!.id, create_at: now});
            await operator.handlePosts({posts: [post], order: [post.id], previousPostId: '', actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
            const results = await queryPostsBetween(database, now - 1000, now + 1000, null, undefined, TestHelper.basicChannel!.id).fetch();
            expect(results.map((p) => p.id)).toContain(post.id);
        });

        it('should filter by userId when provided', async () => {
            const now = Date.now();
            const post = TestHelper.fakePost({channel_id: TestHelper.basicChannel!.id, create_at: now, user_id: TestHelper.basicUser!.id});
            await operator.handlePosts({posts: [post], order: [post.id], previousPostId: '', actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
            const results = await queryPostsBetween(database, now - 1000, now + 1000, null, TestHelper.basicUser!.id).fetch();
            expect(results.map((p) => p.id)).toContain(post.id);
        });

        it('should filter by rootId when provided', async () => {
            const now = Date.now();
            const post = TestHelper.fakePost({channel_id: TestHelper.basicChannel!.id, create_at: now, root_id: 'root1'});
            await operator.handlePosts({posts: [post], order: [post.id], previousPostId: '', actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
            const results = await queryPostsBetween(database, now - 1000, now + 1000, null, undefined, undefined, 'root1').fetch();
            expect(results.map((p) => p.id)).toContain(post.id);
        });
    });

    describe('queryPinnedPostsInChannel / observePinnedPostsInChannel', () => {
        it('should return empty when no pinned posts', async () => {
            const results = await queryPinnedPostsInChannel(database, TestHelper.basicChannel!.id).fetch();
            expect(results).toEqual([]);
        });

        it('should return pinned posts', async () => {
            const post = TestHelper.fakePost({channel_id: TestHelper.basicChannel!.id, is_pinned: true});
            await operator.handlePosts({posts: [post], order: [post.id], previousPostId: '', actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
            const results = await queryPinnedPostsInChannel(database, TestHelper.basicChannel!.id).fetch();
            expect(results.map((p) => p.id)).toContain(post.id);
        });

        it('observePinnedPostsInChannel emits pinned posts', async () => {
            const post = TestHelper.fakePost({channel_id: TestHelper.basicChannel!.id, is_pinned: true});
            await operator.handlePosts({posts: [post], order: [post.id], previousPostId: '', actionType: ActionType.POSTS.RECEIVED_NEW, prepareRecordsOnly: false});
            const results = await firstValueFrom(observePinnedPostsInChannel(database, TestHelper.basicChannel!.id));
            expect(results.map((p) => p.id)).toContain(post.id);
        });
    });

    describe('getIsPostPriorityEnabled / getIsPostAcknowledgementsEnabled', () => {
        it('getIsPostPriorityEnabled returns false when config not set', async () => {
            expect(await getIsPostPriorityEnabled(database)).toBe(false);
        });

        it('getIsPostPriorityEnabled returns true when config is true', async () => {
            await operator.handleConfigs({configs: [{id: 'PostPriority', value: 'true'}], configsToDelete: [], prepareRecordsOnly: false});
            expect(await getIsPostPriorityEnabled(database)).toBe(true);
        });

        it('getIsPostAcknowledgementsEnabled returns false when config not set', async () => {
            expect(await getIsPostAcknowledgementsEnabled(database)).toBe(false);
        });

        it('getIsPostAcknowledgementsEnabled returns true when config is true', async () => {
            await operator.handleConfigs({configs: [{id: 'PostAcknowledgements', value: 'true'}], configsToDelete: [], prepareRecordsOnly: false});
            expect(await getIsPostAcknowledgementsEnabled(database)).toBe(true);
        });
    });

    describe('observeIsPostPriorityEnabled / observeIsPostAcknowledgementsEnabled', () => {
        it('observeIsPostPriorityEnabled emits false when not set', async () => {
            expect(await firstValueFrom(observeIsPostPriorityEnabled(database))).toBe(false);
        });

        it('observeIsPostAcknowledgementsEnabled emits false when not set', async () => {
            expect(await firstValueFrom(observeIsPostAcknowledgementsEnabled(database))).toBe(false);
        });
    });

    describe('observeBoRConfig', () => {
        it('should return default values when config not set', async () => {
            const result = await firstValueFrom(observeBoRConfig(database));
            expect(result.enabled).toBe(false);
            expect(typeof result.borDurationSeconds).toBe('number');
            expect(typeof result.borMaximumTimeToLiveSeconds).toBe('number');
        });
    });

    describe('countUsersFromMentions', () => {
        it('should return 0 when no matching users or groups', async () => {
            const count = await countUsersFromMentions(database, ['@nobody']);
            expect(count).toBe(0);
        });
    });

    describe('findPostsWithPermalinkReferences', () => {
        it('should return empty array when no posts reference the given id', async () => {
            const results = await findPostsWithPermalinkReferences(database, 'nonexistent');
            expect(results).toEqual([]);
        });
    });
});
