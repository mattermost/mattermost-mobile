// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/admin/database_manager';
import DataOperator from '@database/admin/data_operator';
import App from '@typings/database/app';
import {DatabaseType, IsolatedEntities} from '@typings/database/enums';

import {
    operateAppRecord,
    operateCustomEmojiRecord,
    operateDraftRecord,
    operateFileRecord,
    operateGlobalRecord,
    operatePostInThreadRecord,
    operatePostMetadataRecord,
    operatePostRecord,
    operatePostsInChannelRecord,
    operateReactionRecord,
    operateRoleRecord,
    operateServersRecord,
    operateSystemRecord,
    operateTermsOfServiceRecord,
} from './index';

jest.mock('@database/admin/database_manager');

const {APP} = MM_TABLES.DEFAULT;

describe('*** DataOperator: Operators tests ***', () => {
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

    it('=> operateAppRecord: should return an array of type App', async () => {
        expect.assertions(3);

        const database = await DatabaseManager.getDefaultDatabase();
        expect(database).toBeTruthy();

        const preparedRecords = await operateAppRecord({
            database: database!,
            value: {
                buildNumber: 'build-7',
                createdAt: 1,
                id: 'id-18',
                versionNumber: 'v-1',
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('App');
    });

    it('=> operateGlobalRecord: should return an array of type Global', async () => {
        expect.assertions(3);

        const database = await DatabaseManager.getDefaultDatabase();
        expect(database).toBeTruthy();

        const preparedRecords = await operateGlobalRecord({
            database: database!,
            value: {id: 'g-1', name: 'g-n1', value: 'g-v1'},
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('Global');
    });

    it('=> operateServersRecord: should return an array of type Servers', async () => {
        expect.assertions(3);

        const database = await DatabaseManager.getDefaultDatabase();
        expect(database).toBeTruthy();

        const preparedRecords = await operateServersRecord({
            database: database!,
            value: {
                dbPath: 'mm-server',
                displayName: 's-displayName',
                id: 's-1',
                mentionCount: 1,
                unreadCount: 0,
                url: 'https://community.mattermost.com',
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('Servers');
    });

    it('=> operateCustomEmojiRecord: should return an array of type CustomEmoji', async () => {
        expect.assertions(3);

        const database = await createConnection();
        expect(database).toBeTruthy();

        const preparedRecords = await operateCustomEmojiRecord({
            database: database!,
            value: {id: 'emo-1', name: 'emoji'},
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('CustomEmoji');
    });

    it('=> operateRoleRecord: should return an array of type Role', async () => {
        expect.assertions(3);

        const database = await createConnection();
        expect(database).toBeTruthy();

        const preparedRecords = await operateRoleRecord({
            database: database!,
            value: {id: 'role-1', name: 'role-name-1', permissions: []},
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('Role');
    });

    it('=> operateSystemRecord: should return an array of type System', async () => {
        expect.assertions(3);

        const database = await createConnection();
        expect(database).toBeTruthy();

        const preparedRecords = await operateSystemRecord({
            database: database!,
            value: {id: 'system-1', name: 'system-name-1', value: 'system'},
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('System');
    });

    it('=> operateTermsOfServiceRecord: should return an array of type TermsOfService', async () => {
        expect.assertions(3);

        const database = await createConnection();
        expect(database).toBeTruthy();

        const preparedRecords = await operateTermsOfServiceRecord({
            database: database!,
            value: {id: 'system-1', acceptedAt: 1},
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch(
            'TermsOfService',
        );
    });

    it('=> should create a record in the App table in the default database', async () => {
        expect.assertions(2);

        // Creates a record in the App table
        await DataOperator.handleIsolatedEntity({
            tableName: IsolatedEntities.APP,
            values: [
                {
                    buildNumber: 'build-1',
                    createdAt: 1,
                    id: 'id-1',
                    versionNumber: 'version-1',
                },
            ],
        });

        // Do a query and find out if the value has been registered in the App table of the default database
        const connection = await DatabaseManager.getDefaultDatabase();
        expect(connection).toBeTruthy();

        const records = (await connection!.collections.
            get(APP).
            query(Q.where('id', 'id-1')).
            fetch()) as App[];

        // We should expect to have a record returned as dictated by our query
        expect(records.length).toBe(1);
    });

    it('=> should create several records in the App table in the default database', async () => {
        expect.assertions(2);

        // Creates a record in the App table
        await DataOperator.handleIsolatedEntity({
            tableName: IsolatedEntities.APP,
            values: [
                {
                    buildNumber: 'build-10',
                    createdAt: 1,
                    id: 'id-10',
                    versionNumber: 'version-10',
                },
                {
                    buildNumber: 'build-11',
                    createdAt: 1,
                    id: 'id-11',
                    versionNumber: 'version-11',
                },
                {
                    buildNumber: 'build-12',
                    createdAt: 1,
                    id: 'id-12',
                    versionNumber: 'version-12',
                },
                {
                    buildNumber: 'build-13',
                    createdAt: 1,
                    id: 'id-13',
                    versionNumber: 'version-13',
                },
            ],
        });

        // Do a query and find out if the value has been registered in the App table of the default database
        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        const records = (await defaultDB!.collections.
            get(APP).
            query(Q.where('id', Q.oneOf(['id-10', 'id-11', 'id-12', 'id-13']))).
            fetch()) as App[];

        // We should expect to have 4 records created
        expect(records.length).toBe(4);
    });

    it('=> should update a record in the App table in the default database', async () => {
        expect.assertions(3);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        // Update record having id 'id-1'
        await DataOperator.handleIsolatedEntity({
            tableName: IsolatedEntities.APP,
            values: [
                {
                    buildNumber: 'build-13-13',
                    createdAt: 1,
                    id: 'id-1',
                    versionNumber: 'version-1',
                },
            ],
        });

        const records = (await defaultDB!.collections.
            get(APP).
            query(Q.where('id', 'id-1')).
            fetch()) as App[];
        expect(records.length).toBeGreaterThan(0);

        // Verify if the buildNumber for this record has been updated
        expect(records[0].buildNumber).toMatch('build-13-13');
    });

    it('=> should update several records in the App table in the default database', async () => {
        expect.assertions(4);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        // Update records having id 'id-10' and 'id-11'
        await DataOperator.handleIsolatedEntity({
            tableName: IsolatedEntities.APP,
            values: [
                {
                    buildNumber: 'build-10x',
                    createdAt: 1,
                    id: 'id-10',
                    versionNumber: 'version-10',
                },
                {
                    buildNumber: 'build-11y',
                    createdAt: 1,
                    id: 'id-11',
                    versionNumber: 'version-11',
                },
            ],
        });

        const records = (await defaultDB!.collections.
            get(APP).
            query(Q.where('id', Q.oneOf(['id-10', 'id-11']))).
            fetch()) as App[];
        expect(records.length).toBe(2);

        // Verify if the buildNumber for those two record has been updated
        expect(records[0].buildNumber).toMatch('build-10x');
        expect(records[1].buildNumber).toMatch('build-11y');
    });

    it('=> [EDGE CASE] should UPDATE instead of CREATE record for existing id', async () => {
        expect.assertions(3);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        await DataOperator.handleIsolatedEntity({
            tableName: IsolatedEntities.APP,
            values: [
                {
                    buildNumber: 'build-10x',
                    createdAt: 1,
                    id: 'id-10',
                    versionNumber: 'version-10',
                },
                {
                    buildNumber: 'build-11x',
                    createdAt: 1,
                    id: 'id-11',
                    versionNumber: 'version-11',
                },
            ],
        });

        const records = (await defaultDB!.collections.
            get(APP).
            query(Q.where('id', Q.oneOf(['id-10', 'id-11']))).
            fetch()) as App[];

        // Verify if the buildNumber for those two record has been updated
        expect(records[0].buildNumber).toMatch('build-10x');
        expect(records[1].buildNumber).toMatch('build-11x');
    });

    it('=> [EDGE CASE] should CREATE instead of UPDATE record for non-existing id', async () => {
        expect.assertions(3);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeTruthy();

        // id-15 and id-16 do not exist but yet the optType is UPDATE.  The operator should then prepareCreate the records instead of prepareUpdate
        await DataOperator.handleIsolatedEntity({
            tableName: IsolatedEntities.APP,
            values: [
                {
                    buildNumber: 'build-10x',
                    createdAt: 1,
                    id: 'id-15',
                    versionNumber: 'version-10',
                },
                {
                    buildNumber: 'build-11x',
                    createdAt: 1,
                    id: 'id-16',
                    versionNumber: 'version-11',
                },
            ],
        });

        const records = (await defaultDB!.collections.
            get(APP).
            query(Q.where('id', Q.oneOf(['id-15', 'id-16']))).
            fetch()) as App[];

        // Verify if the buildNumber for those two record has been created
        expect(records[0].buildNumber).toMatch('build-10x');
        expect(records[1].buildNumber).toMatch('build-11x');
    });

    it('=> operatePostRecord: should return an array of type Post', async () => {
        expect.assertions(3);

        const database = await createConnection();
        expect(database).toBeTruthy();

        const preparedRecords = await operatePostRecord({
            database: database!,
            value: {
                id: '8swgtrrdiff89jnsiwiip3y1eoe',
                create_at: 1596032651748,
                update_at: 1596032651748,
                edit_at: 0,
                delete_at: 0,
                is_pinned: false,
                user_id: 'q3mzxua9zjfczqakxdkowc6u6yy',
                channel_id: 'xxoq1p6bqg7dkxb3kj1mcjoungw',
                root_id: 'ps81iqbesfby8jayz7owg4yypoo',
                parent_id: 'ps81iqbddesfby8jayz7owg4yypoo',
                original_id: '',
                message: 'Testing operator post',
                type: '',
                props: {},
                hashtags: '',
                pending_post_id: '',
                reply_count: 4,
                last_reply_at: 0,
                participants: null,
                metadata: {},
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('Post');
    });

    it('=> operatePostInThreadRecord: should return an array of type PostsInThread', async () => {
        expect.assertions(3);

        const database = await createConnection();
        expect(database).toBeTruthy();

        const preparedRecords = await operatePostInThreadRecord({
            database: database!,
            value: {
                id: 'ps81iqbddesfby8jayz7owg4yypoo',
                post_id: '8swgtrrdiff89jnsiwiip3y1eoe',
                earliest: 1596032651748,
                latest: 1597032651748,
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('PostsInThread');
    });

    it('=> operateReactionRecord: should return an array of type Reaction', async () => {
        expect.assertions(3);

        const database = await createConnection();
        expect(database).toBeTruthy();

        const preparedRecords = await operateReactionRecord({
            database: database!,
            value: {
                id: 'ps81iqbddesfby8jayz7owg4yypoo',
                user_id: 'q3mzxua9zjfczqakxdkowc6u6yy',
                post_id: 'ps81iqbddesfby8jayz7owg4yypoo',
                emoji_name: 'thumbsup',
                create_at: 1596032651748,
                update_at: 1608253011321,
                delete_at: 0,
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('Reaction');
    });

    it('=> operateFileRecord: should return an array of type File', async () => {
        expect.assertions(3);

        const database = await createConnection();
        expect(database).toBeTruthy();

        const preparedRecords = await operateFileRecord({
            database: database!,
            value: {
                post_id: 'ps81iqbddesfby8jayz7owg4yypoo',
                name: 'test_file',
                extension: '.jpg',
                size: 1000,
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('File');
    });

    it('=> operatePostMetadataRecord: should return an array of type PostMetadata', async () => {
        expect.assertions(3);

        const database = await createConnection();
        expect(database).toBeTruthy();

        const preparedRecords = await operatePostMetadataRecord({
            database: database!,
            value: {
                id: 'ps81i4yypoo',
                data: {},
                postId: 'ps81iqbddesfby8jayz7owg4yypoo',
                type: 'opengraph',
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('PostMetadata');
    });

    it('=> operateDraftRecord: should return an array of type Draft', async () => {
        expect.assertions(3);

        const database = await createConnection();
        expect(database).toBeTruthy();

        const preparedRecords = await operateDraftRecord({
            database: database!,
            value: {
                id: 'ps81i4yypoo',
                root_id: 'ps81iqbddesfby8jayz7owg4yypoo',
                message: 'draft message',
                channel_id: 'channel_idp23232e',
                files: [],
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('Draft');
    });

    it('=> operatePostsInChannelRecord: should return an array of type PostsInChannel', async () => {
        expect.assertions(3);

        const database = await createConnection();
        expect(database).toBeTruthy();

        const preparedRecords = await operatePostsInChannelRecord({
            database: database!,
            value: {
                id: 'ps81i4yypoo',
                channel_id: 'channel_idp23232e',
                earliest: 1608253011321,
                latest: 1609253011321,
            },
        });

        expect(preparedRecords).toBeTruthy();
        expect(preparedRecords!.collection.modelClass.name).toMatch('PostsInChannel');
    });
});
