// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {ActionType} from '@constants';
import {OperationType} from '@constants/database';
import DatabaseManager from '@database/manager';
import {buildDraftKey} from '@database/operator/server_data_operator/comparators';
import {transformDraftRecord, transformPostsInChannelRecord} from '@database/operator/server_data_operator/transformers/post';
import {createPostsChain} from '@database/operator/utils/post';

import {exportedForTest} from './post';

import type ServerDataOperator from '..';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';

Q.sortBy = jest.fn().mockImplementation((field) => {
    return Q.where(field, Q.gte(0));
});
describe('*** Operator: Post Handlers tests ***', () => {
    let operator: ServerDataOperator;

    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com']!.operator;
    });

    it('=> HandleDraft: should write to the the Draft table', async () => {
        expect.assertions(1);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const drafts = [
            {
                channel_id: '4r9jmr7eqt8dxq3f9woypzurrychannelid',
                files: [
                    {
                        id: '322dxx',
                        user_id: 'user_id',
                        post_id: 'post_id',
                        create_at: 123,
                        update_at: 456,
                        delete_at: 789,
                        name: 'an_image',
                        extension: 'jpg',
                        size: 10,
                        mime_type: 'image',
                        width: 10,
                        height: 10,
                        has_preview_image: false,
                        clientId: 'clientId',
                    },
                ],
                message: 'test draft message for post',
                root_id: '',
            },
        ];

        await operator.handleDraft({drafts, prepareRecordsOnly: false});

        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            buildKeyRecordBy: buildDraftKey,
            fieldName: 'channel_id',
            transformer: transformDraftRecord,
            createOrUpdateRawValues: drafts,
            tableName: 'Draft',
            prepareRecordsOnly: false,
        }, 'handleDraft');
    });

    it('=> HandlePosts: should write to the Post and its sub-child tables', async () => {
        // expect.assertions(12);

        const posts: Post[] = [
            {
                id: '8swgtrrdiff89jnsiwiip3y1eoe',
                create_at: 1596032651747,
                update_at: 1596032651747,
                edit_at: 0,
                delete_at: 0,
                is_pinned: false,
                is_following: false,
                user_id: 'q3mzxua9zjfczqakxdkowc6u6yy',
                channel_id: 'xxoq1p6bqg7dkxb3kj1mcjoungw',
                root_id: '',
                original_id: '',
                message: "I'll second these kudos!  Thanks m!",
                type: '',
                props: {},
                hashtags: '',
                pending_post_id: '',
                reply_count: 4,
                last_reply_at: 0,
                participants: null,
                metadata: {
                    images: {
                        'https://community-release.mattermost.com/api/v4/image?url=https%3A%2F%2Favatars1.githubusercontent.com%2Fu%2F6913320%3Fs%3D400%26v%3D4': {
                            width: 400,
                            height: 400,
                            format: 'png',
                            frame_count: 0,
                        },
                    },
                    reactions: [
                        {
                            user_id: 'njic1w1k5inefp848jwk6oukio',
                            post_id: '8swgtrrdiff89jnsiwiip3y1eoe',
                            emoji_name: 'clap',
                            create_at: 1608252965442,
                        },
                    ],
                    embeds: [
                        {
                            type: 'opengraph',
                            url: 'https://github.com/mickmister/mattermost-plugin-default-theme',
                            data: {
                                type: 'object',
                                url: 'https://github.com/mickmister/mattermost-plugin-default-theme',
                                title: 'mickmister/mattermost-plugin-default-theme',
                                description: 'Contribute to mickmister/mattermost-plugin-default-theme development by creating an account on GitHub.',
                                determiner: '',
                                site_name: 'GitHub',
                                locale: '',
                                locales_alternate: null,
                                images: [
                                    {
                                        url: '',
                                        secure_url: 'https://community-release.mattermost.com/api/v4/image?url=https%3A%2F%2Favatars1.githubusercontent.com%2Fu%2F6913320%3Fs%3D400%26v%3D4',
                                        type: '',
                                        width: 0,
                                        height: 0,
                                    },
                                ],
                                audios: null,
                                videos: null,
                            },
                        },
                    ],
                    emojis: [
                        {
                            id: 'dgwyadacdbbwjc8t357h6hwsrh',
                            create_at: 1502389307432,
                            update_at: 1502389307432,
                            delete_at: 0,
                            creator_id: 'x6sdh1ok1tyd9f4dgq4ybw839a',
                            name: 'thanks',
                        },
                    ],
                    files: [
                        {
                            id: 'f1oxe5rtepfs7n3zifb4sso7po',
                            user_id: '89ertha8xpfsumpucqppy5knao',
                            post_id: 'a7ebyw883trm884p1qcgt8yw4a',
                            create_at: 1608270920357,
                            update_at: 1608270920357,
                            delete_at: 0,
                            name: '4qtwrg.jpg',
                            extension: 'jpg',
                            size: 89208,
                            mime_type: 'image/jpeg',
                            width: 500,
                            height: 656,
                            has_preview_image: true,
                            mini_preview:
                                '/9j/2wCEAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRQBAwQEBQQFCQUFCRQNCw0UFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFP/AABEIABAAEAMBIgACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/AN/T/iZp+pX15FpUmnwLbXtpJpyy2sQLw8CcBXA+bksCDnHGOaf4W+P3xIshbQ6loB8RrbK11f3FpbBFW3ZwiFGHB2kr25BIOeCPPbX4S3407T7rTdDfxFNIpDyRaw9lsB4OECHGR15yO4GK6fRPhR4sGmSnxAs8NgchNOjvDPsjz8qSHA37cDk5JPPFdlOpTdPlcVt/Ku1lrvr17b67EPnjrH8/626H/9k=',
                        },
                    ],
                },
            },
            {
                id: '8fcnk3p1jt8mmkaprgajoxz115a',
                create_at: 1596104683748,
                update_at: 1596104683748,
                edit_at: 0,
                delete_at: 0,
                is_pinned: false,
                is_following: false,
                user_id: 'hy5sq51sebfh58ktrce5ijtcwyy',
                channel_id: 'xxoq1p6bqg7dkxb3kj1mcjoungw',
                root_id: '8swgtrrdiff89jnsiwiip3y1eoe',
                original_id: '',
                message: 'a added to the channel by j.',
                type: 'system_add_to_channel',
                props: {
                    addedUserId: 'z89qsntet7bimd3xddfu7u9ncdaxc',
                    addedUsername: 'a',
                    userId: 'hy5sdfdfq51sebfh58ktrce5ijtcwy',
                    username: 'j',
                },
                hashtags: '',
                pending_post_id: '',
                reply_count: 0,
                last_reply_at: 0,
                participants: null,
                metadata: {},
            },
            {
                id: '3y3w3a6gkbg73bnj3xund9o5ic',
                create_at: 1596277483749,
                update_at: 1596277483749,
                edit_at: 0,
                delete_at: 0,
                is_pinned: false,
                is_following: false,
                user_id: '44ud4m9tqwby3mphzzdwm7h31sr',
                channel_id: 'xxoq1p6bqg7dkxb3kj1mcjoungw',
                root_id: '8swgtrrdiff89jnsiwiip3y1eoe',
                original_id: '',
                message: 'Great work M!',
                type: '',
                props: {},
                hashtags: '',
                pending_post_id: '',
                reply_count: 4,
                last_reply_at: 0,
                participants: null,
                metadata: {},
            },
        ];

        const order = [
            '8swgtrrdiff89jnsiwiip3y1eoe',
            '8fcnk3p1jt8mmkaprgajoxz115a',
            '3y3w3a6gkbg73bnj3xund9o5ic',
        ];
        const actionType = ActionType.POSTS.RECEIVED_IN_CHANNEL;

        const spyOnHandleFiles = jest.spyOn(operator, 'handleFiles');
        const spyOnHandleReactions = jest.spyOn(operator, 'handleReactions');
        const spyOnHandleCustomEmojis = jest.spyOn(operator, 'handleCustomEmojis');
        const spyOnHandlePostsInThread = jest.spyOn(operator, 'handlePostsInThread');
        const spyOnHandlePostsInChannel = jest.spyOn(operator, 'handlePostsInChannel');

        // handlePosts will in turn call handlePostsInThread
        await operator.handlePosts({
            actionType,
            order,
            posts,
            previousPostId: '',
        });

        expect(spyOnHandleReactions).toHaveBeenCalledTimes(1);
        expect(spyOnHandleReactions).toHaveBeenCalledWith({
            postsReactions: [{
                post_id: '8swgtrrdiff89jnsiwiip3y1eoe',
                reactions: [
                    {
                        user_id: 'njic1w1k5inefp848jwk6oukio',
                        post_id: '8swgtrrdiff89jnsiwiip3y1eoe',
                        emoji_name: 'clap',
                        create_at: 1608252965442,
                    },
                ],
            }],
            prepareRecordsOnly: true,
        });

        expect(spyOnHandleFiles).toHaveBeenCalledTimes(1);
        expect(spyOnHandleFiles).toHaveBeenCalledWith({
            files: [
                {
                    id: 'f1oxe5rtepfs7n3zifb4sso7po',
                    user_id: '89ertha8xpfsumpucqppy5knao',
                    post_id: 'a7ebyw883trm884p1qcgt8yw4a',
                    create_at: 1608270920357,
                    update_at: 1608270920357,
                    delete_at: 0,
                    name: '4qtwrg.jpg',
                    extension: 'jpg',
                    size: 89208,
                    mime_type: 'image/jpeg',
                    width: 500,
                    height: 656,
                    has_preview_image: true,
                    mini_preview:
                        '/9j/2wCEAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRQBAwQEBQQFCQUFCRQNCw0UFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFP/AABEIABAAEAMBIgACEQEDEQH/xAGiAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgsQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+gEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoLEQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2gAMAwEAAhEDEQA/AN/T/iZp+pX15FpUmnwLbXtpJpyy2sQLw8CcBXA+bksCDnHGOaf4W+P3xIshbQ6loB8RrbK11f3FpbBFW3ZwiFGHB2kr25BIOeCPPbX4S3407T7rTdDfxFNIpDyRaw9lsB4OECHGR15yO4GK6fRPhR4sGmSnxAs8NgchNOjvDPsjz8qSHA37cDk5JPPFdlOpTdPlcVt/Ku1lrvr17b67EPnjrH8/626H/9k=',
                },
            ],
            prepareRecordsOnly: true,
        });

        expect(spyOnHandleCustomEmojis).toHaveBeenCalledTimes(1);
        expect(spyOnHandleCustomEmojis).toHaveBeenCalledWith({
            prepareRecordsOnly: true,
            emojis: [
                {
                    id: 'dgwyadacdbbwjc8t357h6hwsrh',
                    create_at: 1502389307432,
                    update_at: 1502389307432,
                    delete_at: 0,
                    creator_id: 'x6sdh1ok1tyd9f4dgq4ybw839a',
                    name: 'thanks',
                },
            ],
        });

        const postInThreadExpected: Record<string, Post[]> = {};
        posts.filter((p) => p.root_id).forEach((p) => {
            if (postInThreadExpected[p.root_id]) {
                postInThreadExpected[p.root_id].push(p);
            } else {
                postInThreadExpected[p.root_id] = [p];
            }
        });
        expect(spyOnHandlePostsInThread).toHaveBeenCalledTimes(1);
        expect(spyOnHandlePostsInThread).toHaveBeenCalledWith(postInThreadExpected, ActionType.POSTS.RECEIVED_IN_CHANNEL, true);

        const linkedPosts = createPostsChain({order, posts, previousPostId: ''});
        expect(spyOnHandlePostsInChannel).toHaveBeenCalledTimes(1);
        expect(spyOnHandlePostsInChannel).toHaveBeenCalledWith(linkedPosts.slice(0, 3), actionType, true);
    });
});

describe('*** Operator: merge chunks ***', () => {
    const {mergePostInChannelChunks} = exportedForTest;
    let database: Database;
    let operator: ServerDataOperator;
    const databaseName = 'baseHandler.test.com';
    const channelId = '1234';
    beforeEach(async () => {
        await DatabaseManager.init([databaseName]);
        const serverDatabase = DatabaseManager.serverDatabases[databaseName]!;
        database = serverDatabase.database;
        operator = serverDatabase.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(databaseName);
    });

    it('merge on empty chunks', async () => {
        const newChunk = await transformPostsInChannelRecord({action: OperationType.CREATE, database, value: {record: undefined, raw: {channel_id: channelId, earliest: 0, latest: 100}}});
        const chunks: PostsInChannelModel[] = [];
        const result = await mergePostInChannelChunks(newChunk, chunks);
        expect(result.length).toBe(0);
        expect(newChunk.earliest).toBe(0);
        expect(newChunk.latest).toBe(100);
    });

    it('remove contained chunks', async () => {
        const newChunk = await transformPostsInChannelRecord({action: OperationType.CREATE, database, value: {record: undefined, raw: {channel_id: channelId, earliest: 0, latest: 100}}});
        const chunks: PostsInChannelModel[] = [
            await transformPostsInChannelRecord({action: OperationType.CREATE, database, value: {record: undefined, raw: {channel_id: channelId, earliest: 20, latest: 80}}}),
        ];
        const result = await mergePostInChannelChunks(newChunk, chunks);
        expect(result.length).toBe(1);
        expect(newChunk.earliest).toBe(0);
        expect(newChunk.latest).toBe(100);
        expect(result[0]).toBe(chunks[0]);
        expect(chunks[0]._preparedState).toBe('destroyPermanently');
    });

    it('merge intersecting chunks', async () => {
        const newChunk = await transformPostsInChannelRecord({action: OperationType.CREATE, database, value: {record: undefined, raw: {channel_id: channelId, earliest: 50, latest: 100}}});
        const chunks: PostsInChannelModel[] = [
            await transformPostsInChannelRecord({action: OperationType.CREATE, database, value: {record: undefined, raw: {channel_id: channelId, earliest: 25, latest: 70}}}),
            await transformPostsInChannelRecord({action: OperationType.CREATE, database, value: {record: undefined, raw: {channel_id: channelId, earliest: 80, latest: 125}}}),
        ];
        const result = await mergePostInChannelChunks(newChunk, chunks);
        expect(result.length).toBe(3);
        expect(newChunk.earliest).toBe(25);
        expect(newChunk.latest).toBe(125);
        expect(newChunk._preparedState).toBe('update');
        expect(result[0]).toBe(chunks[0]);
        expect(chunks[0]._preparedState).toBe('destroyPermanently');
        expect(result[1]).toBe(chunks[1]);
        expect(chunks[1]._preparedState).toBe('destroyPermanently');
        expect(result[2]).toBe(newChunk);
        await operator.batchRecords(result, 'test');
    });

    it('merge with the chunk present', async () => {
        const newChunk = await transformPostsInChannelRecord({action: OperationType.CREATE, database, value: {record: undefined, raw: {channel_id: channelId, earliest: 50, latest: 100}}});
        const chunks: PostsInChannelModel[] = [
            await transformPostsInChannelRecord({action: OperationType.CREATE, database, value: {record: undefined, raw: {channel_id: channelId, earliest: 25, latest: 70}}}),
            newChunk,
            await transformPostsInChannelRecord({action: OperationType.CREATE, database, value: {record: undefined, raw: {channel_id: channelId, earliest: 80, latest: 125}}}),
        ];
        const result = await mergePostInChannelChunks(newChunk, chunks);
        expect(result.length).toBe(3);
        expect(newChunk.earliest).toBe(25);
        expect(newChunk.latest).toBe(125);
        expect(newChunk._preparedState).toBe('update');
        expect(result[0]).toBe(chunks[0]);
        expect(chunks[0]._preparedState).toBe('destroyPermanently');
        expect(result[1]).toBe(chunks[2]);
        expect(chunks[2]._preparedState).toBe('destroyPermanently');
        expect(result[2]).toBe(newChunk);
        await operator.batchRecords(result, 'test');
    });

    it('do nothing with no intersecting chunks', async () => {
        const newChunk = await transformPostsInChannelRecord({action: OperationType.CREATE, database, value: {record: undefined, raw: {channel_id: channelId, earliest: 50, latest: 100}}});
        const chunks: PostsInChannelModel[] = [
            await transformPostsInChannelRecord({action: OperationType.CREATE, database, value: {record: undefined, raw: {channel_id: channelId, earliest: 25, latest: 40}}}),
            newChunk,
            await transformPostsInChannelRecord({action: OperationType.CREATE, database, value: {record: undefined, raw: {channel_id: channelId, earliest: 110, latest: 125}}}),
        ];
        const result = await mergePostInChannelChunks(newChunk, chunks);
        expect(result.length).toBe(0);
        expect(newChunk.earliest).toBe(50);
        expect(newChunk.latest).toBe(100);
        expect(newChunk._preparedState).toBe('create');
        for (const chunk of chunks) {
            expect(chunk._preparedState).toBe('create');
        }
        await operator.batchRecords(result, 'test');
    });
});
