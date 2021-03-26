// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/admin/database_manager';
import DataOperator from '@database/admin/data_operator';
import {DatabaseType, IsolatedEntities} from '@typings/database/enums';

import {
    operateAppRecord,
    operateCustomEmojiRecord,
    operateDraftRecord,
    operateGlobalRecord,
    operateRoleRecord,
    operateServersRecord,
    operateSystemRecord,
    operateTermsOfServiceRecord,
} from '../operators';

jest.mock('@database/admin/database_manager');

const {DRAFT} = MM_TABLES.SERVER;

describe('*** DataOperator: Handlers tests ***', () => {
    const createConnection = async (setActive = false) => {
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

        if (setActive) {
            await DatabaseManager.setActiveServerDatabase({
                displayName: dbName,
                serverUrl,
            });
        }

        return database;
    };

    it('=> HandleApp: should write to APP entity', async () => {
        expect.assertions(2);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'executeInDatabase');

        const data = {
            tableName: IsolatedEntities.APP,
            values: [
                {
                    buildNumber: 'build-10x',
                    createdAt: 1,
                    id: 'id-21',
                    versionNumber: 'version-10',
                },
                {
                    buildNumber: 'build-11y',
                    createdAt: 1,
                    id: 'id-22',
                    versionNumber: 'version-11',
                },
            ],
        };

        await DataOperator.handleIsolatedEntity(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({
            ...data,
            recordOperator: operateAppRecord,
        });
    });

    it('=> HandleGlobal: should write to GLOBAL entity', async () => {
        expect.assertions(2);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'executeInDatabase');

        const data = {
            tableName: IsolatedEntities.GLOBAL,
            values: [
                {id: 'global-1-id', name: 'global-1-name', value: 'global-1-value'},
            ],
        };

        await DataOperator.handleIsolatedEntity(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({
            ...data,
            recordOperator: operateGlobalRecord,
        });
    });

    it('=> HandleServers: should write to SERVERS entity', async () => {
        expect.assertions(2);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'executeInDatabase');

        const data = {
            tableName: IsolatedEntities.SERVERS,
            values: [
                {
                    dbPath: 'server.db',
                    displayName: 'community',
                    id: 'server-id-1',
                    mentionCount: 0,
                    unreadCount: 0,
                    url: 'https://community.mattermost.com',
                },
            ],
        };

        await DataOperator.handleIsolatedEntity(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({
            ...data,
            recordOperator: operateServersRecord,
        });
    });

    it('=> HandleCustomEmoji: should write to CUSTOM_EMOJI entity', async () => {
        expect.assertions(2);

        const database = await createConnection(true);
        expect(database).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'executeInDatabase');

        const data = {
            tableName: IsolatedEntities.CUSTOM_EMOJI,
            values: [
                {
                    id: 'custom-emoji-id-1',
                    name: 'custom-emoji-1',
                },
            ],
        };

        await DataOperator.handleIsolatedEntity(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({
            ...data,
            recordOperator: operateCustomEmojiRecord,
        });
    });

    it('=> HandleRole: should write to ROLE entity', async () => {
        expect.assertions(2);

        const database = await createConnection(true);
        expect(database).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'executeInDatabase');

        const data = {
            tableName: IsolatedEntities.ROLE,
            values: [
                {
                    id: 'custom-emoji-id-1',
                    name: 'custom-emoji-1',
                    permissions: ['custom-emoji-1'],
                },
            ],
        };

        await DataOperator.handleIsolatedEntity(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({
            ...data,
            recordOperator: operateRoleRecord,
        });
    });

    it('=> HandleSystem: should write to SYSTEM entity', async () => {
        expect.assertions(2);

        const database = await createConnection(true);
        expect(database).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'executeInDatabase');

        const data = {
            tableName: IsolatedEntities.SYSTEM,
            values: [{id: 'system-id-1', name: 'system-1', value: 'system-1'}],
        };

        await DataOperator.handleIsolatedEntity(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({
            ...data,
            recordOperator: operateSystemRecord,
        });
    });

    it('=> HandleTermsOfService: should write to TERMS_OF_SERVICE entity', async () => {
        expect.assertions(2);

        const database = await createConnection(true);
        expect(database).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'executeInDatabase');

        const data = {
            tableName: IsolatedEntities.TERMS_OF_SERVICE,
            values: [{id: 'tos-1', acceptedAt: 1}],
        };

        await DataOperator.handleIsolatedEntity(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({
            ...data,
            recordOperator: operateTermsOfServiceRecord,
        });
    });

    it('=> No table name: should not call executeInDatabase if tableName is invalid', async () => {
        expect.assertions(2);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'executeInDatabase');

        await DataOperator.handleIsolatedEntity({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            tableName: 'INVALID_TABLE_NAME',
            values: [{id: 'tos-1', acceptedAt: 1}],
        });

        expect(spyOnHandleBase).toHaveBeenCalledTimes(0);
    });

    it('=> HandleReactions: should write to both Reactions and CustomEmoji entities', async () => {
        expect.assertions(3);

        const database = await createConnection(true);
        expect(database).toBeTruthy();

        const spyOnPrepareBase = jest.spyOn(DataOperator as any, 'prepareRecords');
        const spyOnBatchOperation = jest.spyOn(DataOperator as any, 'batchOperations');

        await DataOperator.handleReactions({
            reactions: [
                {
                    create_at: 1608263728086,
                    delete_at: 0,
                    emoji_name: 'p4p1',
                    post_id: '4r9jmr7eqt8dxq3f9woypzurry',
                    update_at: 1608263728077,
                    user_id: 'ooumoqgq3bfiijzwbn8badznwc',
                },
            ],
            prepareRowsOnly: false,
        });

        // Called twice:  Once for Reaction record and once for CustomEmoji record
        expect(spyOnPrepareBase).toHaveBeenCalledTimes(2);

        // Only one batch operation for both entities
        expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);
    });

    it('=> HandleDraft: should write to the Draft entity', async () => {
        expect.assertions(2);

        const database = await createConnection(true);
        expect(database).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'executeInDatabase');

        const data = [
            {
                channel_id: '4r9jmr7eqt8dxq3f9woypzurrychannelid',
                files: [
                    {
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
        await DataOperator.handleDraft(data);

        // Only one batch operation for both entities
        expect(spyOnHandleBase).toHaveBeenCalledWith({
            tableName: DRAFT,
            values: data,
            recordOperator: operateDraftRecord,
        });
    });

    it('=> HandleFiles: should write to File entity', async () => {
        expect.assertions(3);

        const database = await createConnection(true);
        expect(database).toBeTruthy();

        const spyOnPrepareBase = jest.spyOn(DataOperator as any, 'prepareRecords');
        const spyOnBatchOperation = jest.spyOn(DataOperator as any, 'batchOperations');

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await DataOperator.handleFiles({
            files: [
                {
                    user_id: 'user_id',
                    post_id: 'post_id',
                    create_at: 12345,
                    update_at: 456,
                    delete_at: 789,
                    name: 'an_image',
                    extension: 'jpg',
                    size: 10,
                    mime_type: 'image',
                    width: 10,
                    height: 10,
                    has_preview_image: false,
                },
            ],
            prepareRowsOnly: false,
        });

        expect(spyOnPrepareBase).toHaveBeenCalledTimes(1);
        expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);
    });

    it('=> HandlePosts: should write to Post and its sub-child entities', async () => {
        expect.assertions(12);

        const posts = [
            {
                id: '8swgtrrdiff89jnsiwiip3y1eoe',
                create_at: 1596032651747,
                update_at: 1596032651747,
                edit_at: 0,
                delete_at: 0,
                is_pinned: false,
                user_id: 'q3mzxua9zjfczqakxdkowc6u6yy',
                channel_id: 'xxoq1p6bqg7dkxb3kj1mcjoungw',
                root_id: '',
                parent_id: 'ps81iqbddesfby8jayz7owg4yypoo',
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
                            post_id: 'a7ebyw883trm884p1qcgt8yw4a',
                            emoji_name: 'clap',
                            create_at: 1608252965442,
                            update_at: 1608252965442,
                            delete_at: 0,
                        },
                    ],
                    embeds: [
                        {
                            type: 'opengraph',
                            url:
                'https://github.com/mickmister/mattermost-plugin-default-theme',
                            data: {
                                type: 'object',
                                url:
                  'https://github.com/mickmister/mattermost-plugin-default-theme',
                                title: 'mickmister/mattermost-plugin-default-theme',
                                description:
                  'Contribute to mickmister/mattermost-plugin-default-theme development by creating an account on GitHub.',
                                determiner: '',
                                site_name: 'GitHub',
                                locale: '',
                                locales_alternate: null,
                                images: [
                                    {
                                        url: '',
                                        secure_url:
                      'https://community-release.mattermost.com/api/v4/image?url=https%3A%2F%2Favatars1.githubusercontent.com%2Fu%2F6913320%3Fs%3D400%26v%3D4',
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
                user_id: 'hy5sq51sebfh58ktrce5ijtcwyy',
                channel_id: 'xxoq1p6bqg7dkxb3kj1mcjoungw',
                root_id: '8swgtrrdiff89jnsiwiip3y1eoe',
                parent_id: '',
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
                user_id: '44ud4m9tqwby3mphzzdwm7h31sr',
                channel_id: 'xxoq1p6bqg7dkxb3kj1mcjoungw',
                root_id: '8swgtrrdiff89jnsiwiip3y1eoe',
                parent_id: 'ps81iqbwesfby8jayz7owg4yypo',
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

        const spyOnHandleReactions = jest.spyOn(DataOperator as any, 'handleReactions');
        const spyOnHandleFiles = jest.spyOn(DataOperator as any, 'handleFiles');
        const spyOnHandlePostMetadata = jest.spyOn(DataOperator as any, 'handlePostMetadata');
        const spyOnHandleIsolatedEntity = jest.spyOn(DataOperator as any, 'handleIsolatedEntity');
        const spyOnHandlePostsInThread = jest.spyOn(DataOperator as any, 'handlePostsInThread');
        const spyOnHandlePostsInChannel = jest.spyOn(DataOperator as any, 'handlePostsInChannel');

        await createConnection(true);

        // handlePosts will in turn call handlePostsInThread
        await DataOperator.handlePosts({
            orders: [
                '8swgtrrdiff89jnsiwiip3y1eoe',
                '8fcnk3p1jt8mmkaprgajoxz115a',
                '3y3w3a6gkbg73bnj3xund9o5ic',
            ],
            values: posts,
            previousPostId: '',
        });

        expect(spyOnHandleReactions).toHaveBeenCalledTimes(1);
        expect(spyOnHandleReactions).toHaveBeenCalledWith({
            reactions: [
                {
                    user_id: 'njic1w1k5inefp848jwk6oukio',
                    post_id: 'a7ebyw883trm884p1qcgt8yw4a',
                    emoji_name: 'clap',
                    create_at: 1608252965442,
                    update_at: 1608252965442,
                    delete_at: 0,
                },
            ],
            prepareRowsOnly: true,
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
            prepareRowsOnly: true,
        });

        expect(spyOnHandlePostMetadata).toHaveBeenCalledTimes(1);
        expect(spyOnHandlePostMetadata).toHaveBeenCalledWith({
            embeds: [
                {
                    embed: [
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
                    postId: '8swgtrrdiff89jnsiwiip3y1eoe',
                },
            ],
            images: [
                {
                    images: {
                        'https://community-release.mattermost.com/api/v4/image?url=https%3A%2F%2Favatars1.githubusercontent.com%2Fu%2F6913320%3Fs%3D400%26v%3D4': {
                            width: 400,
                            height: 400,
                            format: 'png',
                            frame_count: 0,
                        },
                    },
                    postId: '8swgtrrdiff89jnsiwiip3y1eoe',
                },
            ],
            prepareRowsOnly: true,
        });

        expect(spyOnHandleIsolatedEntity).toHaveBeenCalledTimes(1);
        expect(spyOnHandleIsolatedEntity).toHaveBeenCalledWith({
            tableName: 'CustomEmoji',
            values: [
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

        expect(spyOnHandlePostsInThread).toHaveBeenCalledTimes(1);
        expect(spyOnHandlePostsInThread).toHaveBeenCalledWith([{earliest: 1596032651747, post_id: '8swgtrrdiff89jnsiwiip3y1eoe'}]);

        expect(spyOnHandlePostsInChannel).toHaveBeenCalledTimes(1);
        expect(spyOnHandlePostsInChannel).toHaveBeenCalledWith(posts.slice(0, 3));
    });
});
