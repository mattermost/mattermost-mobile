// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';

import DatabaseManager, {DatabaseType} from '../database_manager';
import DataOperator from './index';
import {
    operateAppRecord,
    operateCustomEmojiRecord,
    operateDraftRecord,
    operateGlobalRecord,
    operateRoleRecord,
    operateServersRecord,
    operateSystemRecord,
    operateTermsOfServiceRecord,
} from './operators';
import {OperationType, IsolatedEntities} from './types';

jest.mock('../database_manager');

const {DRAFT} = MM_TABLES.SERVER;

describe('*** DataOperator: Handlers tests ***', () => {
    const createConnection = async (setActive = false) => {
        const dbName = 'server_schema_connection';
        const serverUrl = 'https://appv2.mattermost.com';
        const database = await DatabaseManager.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            databaseConnection: {
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

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBase');

        const data = {
            optType: OperationType.CREATE,
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

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBase');

        const data = {
            optType: OperationType.CREATE,
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

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBase');

        const data = {
            optType: OperationType.CREATE,
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

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBase');

        const data = {
            optType: OperationType.CREATE,
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

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBase');

        const data = {
            optType: OperationType.CREATE,
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

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBase');

        const data = {
            optType: OperationType.CREATE,
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

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBase');

        const data = {
            optType: OperationType.CREATE,
            tableName: IsolatedEntities.TERMS_OF_SERVICE,
            values: [{id: 'tos-1', acceptedAt: 1}],
        };

        await DataOperator.handleIsolatedEntity(data);

        expect(spyOnHandleBase).toHaveBeenCalledWith({
            ...data,
            recordOperator: operateTermsOfServiceRecord,
        });
    });

    it('=> No table name: should not call handleBase if tableName is invalid', async () => {
        expect.assertions(2);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBase');

        const data = {
            optType: OperationType.CREATE,
            tableName: 'INVALID_TABLE_NAME',
            values: [{id: 'tos-1', acceptedAt: 1}],
        };

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        await DataOperator.handleIsolatedEntity(data);

        expect(spyOnHandleBase).toHaveBeenCalledTimes(0);
    });

    it('=> handleReactions: should write to both Reactions and CustomEmoji entities', async () => {
        expect.assertions(3);

        const database = await createConnection(true);
        expect(database).toBeTruthy();

        const spyOnPrepareBase = jest.spyOn(DataOperator as any, 'prepareBase');
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

    it('=> handleDraft: should write to the Draft entity', async () => {
        expect.assertions(2);

        const database = await createConnection(true);
        expect(database).toBeTruthy();

        const spyOnHandleBase = jest.spyOn(DataOperator as any, 'handleBase');
        const data = [
            {
                channel_id: '4r9jmr7eqt8dxq3f9woypzurrychannelid',
                files: [{
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
                }],
                message: 'test draft message for post',
                root_id: '',
            },
        ];
        await DataOperator.handleDraft(data);

        // Only one batch operation for both entities
        expect(spyOnHandleBase).toHaveBeenCalledWith({
            optType: OperationType.CREATE,
            tableName: DRAFT,
            values: data,
            recordOperator: operateDraftRecord,
        });
    });

    it('=> handleFiles: should write to File entity', async () => {
        expect.assertions(3);

        const database = await createConnection(true);
        expect(database).toBeTruthy();

        const spyOnPrepareBase = jest.spyOn(DataOperator as any, 'prepareBase');
        const spyOnBatchOperation = jest.spyOn(DataOperator as any, 'batchOperations');

        await DataOperator.handleFiles({
            files: [{
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
            }],
            prepareRowsOnly: false,
        });

        expect(spyOnPrepareBase).toHaveBeenCalledTimes(1);
        expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);
    });

    it('=> handlePostMetadata: should write to PostMetadata entity', async () => {
        expect.assertions(3);

        const database = await createConnection(true);
        expect(database).toBeTruthy();

        const spyOnPrepareBase = jest.spyOn(DataOperator as any, 'prepareBase');
        const spyOnBatchOperation = jest.spyOn(DataOperator as any, 'batchOperations');

        const data = {
            images: {
                'https://community-release.mattermost.com/api/v4/image?url=https%3A%2F%2Favatars1.githubusercontent.com%2Fu%2F6913320%3Fs%3D400%26v%3D4': {
                    width: 400,
                    height: 400,
                    format: 'png',
                    frame_count: 0,
                },

            },
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
        };

        await DataOperator.handlePostMetadata({
            embeds: [{
                embed: data.embeds, postId: 'post-1',
            }],
            images: [{
                images: data.images, postId: 'post-1',
            }],
            prepareRowsOnly: false});

        expect(spyOnPrepareBase).toHaveBeenCalledTimes(1);
        expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);
    });

    // TODO : test utils functions (  sanitizeReactions, createPostsChain, sanitizePosts)
});
