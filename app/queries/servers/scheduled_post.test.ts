// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';
import ServerDataOperator from '@database/operator/server_data_operator';
import TestHelper from '@test/test_helper';

import {
    observeFirstScheduledPost,
    observeScheduledPostCount,
    observeScheduledPostCountForChannel,
    observeScheduledPostCountForThread,
    observeScheduledPostsForTeam,
    queryScheduledPost,
    queryScheduledPostsForTeam,
} from './scheduled_post';

describe('Scheduled Post Queries', () => {
    const serverUrl = 'scheduledpost.test.com';
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

    describe('queryScheduledPostsForTeam', () => {
        it('should return posts for specific team', async () => {
            const channel = TestHelper.fakeChannel({id: 'ch1', team_id: 'team1', type: 'O'});
            const post = TestHelper.fakeScheduledPost({id: 'post1', channel_id: 'ch1', message: 'Test'});

            const models = (await Promise.all([
                operator.handleChannel({channels: [channel], prepareRecordsOnly: true}),
                operator.handleScheduledPosts({
                    actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
                    scheduledPosts: [post],
                    prepareRecordsOnly: true,
                }),
            ])).flat();
            await operator.batchRecords(models, 'test');

            const result = await queryScheduledPostsForTeam(database, 'team1').fetch();
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('post1');
        });

        it('should return empty for non-existent team', async () => {
            const result = await queryScheduledPostsForTeam(database, 'nonexistent').fetch();
            expect(result).toHaveLength(0);
        });

        it('should include direct channels when specified', async () => {
            const dmChannel = TestHelper.fakeChannel({id: 'dm1', team_id: '', type: 'D'});
            const post = TestHelper.fakeScheduledPost({id: 'post1', channel_id: 'dm1', message: 'DM'});

            const models = (await Promise.all([
                operator.handleChannel({channels: [dmChannel], prepareRecordsOnly: true}),
                operator.handleScheduledPosts({
                    actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
                    scheduledPosts: [post],
                    prepareRecordsOnly: true,
                }),
            ])).flat();
            await operator.batchRecords(models, 'test');

            const result = await queryScheduledPostsForTeam(database, 'team1', true).fetch();
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('post1');
        });
    });

    describe('queryScheduledPost', () => {
        it('should return posts for specific channel and root', async () => {
            const channel = TestHelper.fakeChannel({id: 'ch1', team_id: 'team1'});
            const posts = [
                TestHelper.fakeScheduledPost({id: 'post1', channel_id: 'ch1', root_id: 'root1', message: 'Reply1'}),
                TestHelper.fakeScheduledPost({id: 'post2', channel_id: 'ch1', root_id: 'root1', message: 'Reply2'}),
                TestHelper.fakeScheduledPost({id: 'post3', channel_id: 'ch1', root_id: 'root2', message: 'Other'}),
            ];

            const models = (await Promise.all([
                operator.handleChannel({channels: [channel], prepareRecordsOnly: true}),
                operator.handleScheduledPosts({
                    actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
                    scheduledPosts: posts,
                    prepareRecordsOnly: true,
                }),
            ])).flat();
            await operator.batchRecords(models, 'test');

            const result = await queryScheduledPost(database, 'ch1', 'root1').fetch();
            expect(result).toHaveLength(2);
            expect(result.map((p) => p.id).sort()).toEqual(['post1', 'post2']);
        });
    });

    describe('observeScheduledPostsForTeam', () => {
        it('should observe team posts', (done) => {
            const channel = TestHelper.fakeChannel({id: 'ch1', team_id: 'team1', type: 'O'});
            const post = TestHelper.fakeScheduledPost({id: 'post1', channel_id: 'ch1', message: 'Test'});

            Promise.all([
                operator.handleChannel({channels: [channel], prepareRecordsOnly: false}),
                operator.handleScheduledPosts({
                    actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
                    scheduledPosts: [post],
                    prepareRecordsOnly: false,
                }),
            ]).then(() => {
                observeScheduledPostsForTeam(database, 'team1').subscribe((posts) => {
                    if (posts.length === 1 && posts[0].id === 'post1') {
                        done();
                    }
                });
            });
        }, 1500);
    });

    describe('observeScheduledPostCount', () => {
        it('should count team posts correctly', (done) => {
            const channels = [
                TestHelper.fakeChannel({id: 'ch1', team_id: 'team1', type: 'O'}),
                TestHelper.fakeChannel({id: 'ch2', team_id: 'team1', type: 'P'}),
            ];
            const posts = [
                TestHelper.fakeScheduledPost({id: 'post1', channel_id: 'ch1', message: 'Test1'}),
                TestHelper.fakeScheduledPost({id: 'post2', channel_id: 'ch2', message: 'Test2'}),
            ];

            Promise.all([
                operator.handleChannel({channels, prepareRecordsOnly: false}),
                operator.handleScheduledPosts({
                    actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
                    scheduledPosts: posts,
                    prepareRecordsOnly: false,
                }),
            ]).then(() => {
                observeScheduledPostCount(database, 'team1', false).subscribe((count) => {
                    if (count === 2) {
                        done();
                    }
                });
            });
        }, 1500);

        it('should include direct channels when specified', (done) => {
            const channels = [
                TestHelper.fakeChannel({id: 'ch1', team_id: 'team1', type: 'O'}),
                TestHelper.fakeChannel({id: 'dm1', team_id: '', type: 'D'}),
            ];
            const posts = [
                TestHelper.fakeScheduledPost({id: 'post1', channel_id: 'ch1', message: 'Team'}),
                TestHelper.fakeScheduledPost({id: 'post2', channel_id: 'dm1', message: 'DM'}),
            ];

            Promise.all([
                operator.handleChannel({channels, prepareRecordsOnly: false}),
                operator.handleScheduledPosts({
                    actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
                    scheduledPosts: posts,
                    prepareRecordsOnly: false,
                }),
            ]).then(() => {
                observeScheduledPostCount(database, 'team1', true).subscribe((count) => {
                    if (count === 2) {
                        done();
                    }
                });
            });
        }, 1500);
    });

    describe('observeScheduledPostCountForChannel', () => {
        it('should count channel posts without errors', (done) => {
            const channel = TestHelper.fakeChannel({id: 'ch1', team_id: 'team1'});
            const posts = [
                TestHelper.fakeScheduledPost({id: 'post1', channel_id: 'ch1', error_code: '', message: 'Success1'}),
                TestHelper.fakeScheduledPost({id: 'post2', channel_id: 'ch1', error_code: '', message: 'Success2'}),
                TestHelper.fakeScheduledPost({id: 'post3', channel_id: 'ch1', error_code: 'failed', message: 'Error'}),
            ];

            Promise.all([
                operator.handleChannel({channels: [channel], prepareRecordsOnly: false}),
                operator.handleScheduledPosts({
                    actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
                    scheduledPosts: posts,
                    prepareRecordsOnly: false,
                }),
            ]).then(() => {
                observeScheduledPostCountForChannel(database, 'ch1', false).subscribe((count) => {
                    if (count === 2) { // Only posts without errors
                        done();
                    }
                });
            });
        }, 1500);

        it('should handle CRT filtering', (done) => {
            const channel = TestHelper.fakeChannel({id: 'ch1', team_id: 'team1'});
            const posts = [
                TestHelper.fakeScheduledPost({id: 'post1', channel_id: 'ch1', root_id: '', error_code: '', message: 'Root1'}),
                TestHelper.fakeScheduledPost({id: 'post2', channel_id: 'ch1', root_id: '', error_code: '', message: 'Root2'}),
                TestHelper.fakeScheduledPost({id: 'post3', channel_id: 'ch1', root_id: 'thread1', error_code: '', message: 'Reply'}),
            ];

            Promise.all([
                operator.handleChannel({channels: [channel], prepareRecordsOnly: false}),
                operator.handleScheduledPosts({
                    actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
                    scheduledPosts: posts,
                    prepareRecordsOnly: false,
                }),
            ]).then(() => {
                observeScheduledPostCountForChannel(database, 'ch1', true).subscribe((count) => {
                    if (count === 2) { // Only root posts when CRT enabled
                        done();
                    }
                });
            });
        }, 1500);
    });

    describe('observeScheduledPostCountForThread', () => {
        it('should count thread replies only', (done) => {
            const channel = TestHelper.fakeChannel({id: 'ch1', team_id: 'team1'});
            const posts = [
                TestHelper.fakeScheduledPost({id: 'post1', channel_id: 'ch1', root_id: 'thread1', error_code: '', message: 'Reply1'}),
                TestHelper.fakeScheduledPost({id: 'post2', channel_id: 'ch1', root_id: 'thread1', error_code: '', message: 'Reply2'}),
                TestHelper.fakeScheduledPost({id: 'post3', channel_id: 'ch1', root_id: 'thread2', error_code: '', message: 'Other'}),
                TestHelper.fakeScheduledPost({id: 'post4', channel_id: 'ch1', root_id: '', error_code: '', message: 'Root'}),
            ];

            Promise.all([
                operator.handleChannel({channels: [channel], prepareRecordsOnly: false}),
                operator.handleScheduledPosts({
                    actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
                    scheduledPosts: posts,
                    prepareRecordsOnly: false,
                }),
            ]).then(() => {
                observeScheduledPostCountForThread(database, 'thread1').subscribe((count) => {
                    if (count === 2) { // Only replies to thread1
                        done();
                    }
                });
            });
        }, 1500);
    });

    describe('observeFirstScheduledPost', () => {
        it('should return undefined for empty array', (done) => {
            observeFirstScheduledPost([]).subscribe((result) => {
                if (result === undefined) {
                    done();
                }
            });
        });

        it('should return first post when available', (done) => {
            const mockPost = TestHelper.fakeScheduledPostModel({
                id: 'first_post',
                observe: jest.fn().mockReturnValue({
                    subscribe: (callback: (result: any) => void) => {
                        callback({id: 'first_post', message: 'First post'});
                        return {unsubscribe: jest.fn()};
                    },
                }),
            });

            observeFirstScheduledPost([mockPost]).subscribe((result) => {
                if (result?.id === 'first_post') {
                    done();
                }
            });
        });
    });
});
