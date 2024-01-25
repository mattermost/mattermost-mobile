// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {shouldUpdateFileRecord} from '@database/operator/server_data_operator/comparators/files';
import {
    transformConfigRecord,
    transformCustomEmojiRecord,
    transformRoleRecord,
    transformSystemRecord,
} from '@database/operator/server_data_operator/transformers/general';

import type ServerDataOperator from '@database/operator/server_data_operator/index';

describe('*** DataOperator: Base Handlers tests ***', () => {
    let operator: ServerDataOperator;
    beforeAll(async () => {
        await DatabaseManager.init(['baseHandler.test.com']);
        operator = DatabaseManager.serverDatabases['baseHandler.test.com']!.operator;
    });

    it('=> HandleRole: should write to the ROLE table', async () => {
        expect.assertions(1);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');

        const roles: Role[] = [
            {
                id: 'custom-role-id-1',
                name: 'custom-role-1',
                permissions: ['custom-permission-1'],
            },
        ];

        await operator.handleRole({
            roles,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            transformer: transformRoleRecord,
            createOrUpdateRawValues: roles,
            tableName: 'Role',
            prepareRecordsOnly: false,
        }, 'handleRole');
    });

    it('=> HandleCustomEmojis: should write to the CUSTOM_EMOJI table', async () => {
        expect.assertions(2);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');
        const emojis: CustomEmoji[] = [
            {
                id: 'i',
                create_at: 1580913641769,
                update_at: 1580913641769,
                delete_at: 0,
                creator_id: '4cprpki7ri81mbx8efixcsb8jo',
                name: 'boomI',
            },
        ];

        await operator.handleCustomEmojis({
            emojis,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledTimes(1);
        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'name',
            createOrUpdateRawValues: emojis,
            tableName: 'CustomEmoji',
            prepareRecordsOnly: false,
            transformer: transformCustomEmojiRecord,
        }, 'handleCustomEmojis');
    });

    it('=> HandleSystem: should write to the SYSTEM table', async () => {
        expect.assertions(1);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');

        const systems = [{id: 'system-1', value: 'system-1'}];

        await operator.handleSystem({
            systems,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            transformer: transformSystemRecord,
            createOrUpdateRawValues: systems,
            tableName: 'System',
            prepareRecordsOnly: false,
        }, 'handleSystem');
    });

    it('=> HandleConfig: should write to the CONFIG table', async () => {
        expect.assertions(1);

        const spyOnHandleRecords = jest.spyOn(operator, 'handleRecords');

        const configs = [{id: 'config-1', value: 'config-1'}];
        const configsToDelete = [{id: 'toDelete', value: 'toDelete'}];

        await operator.handleConfigs({
            configs,
            configsToDelete,
            prepareRecordsOnly: false,
        });

        expect(spyOnHandleRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            transformer: transformConfigRecord,
            createOrUpdateRawValues: configs,
            tableName: 'Config',
            prepareRecordsOnly: false,
            deleteRawValues: configsToDelete,
        }, 'handleConfigs');
    });

    it('=> HandleFiles: should write to the FILE table', async () => {
        expect.assertions(1);

        const spyOnprocessRecords = jest.spyOn(operator, 'processRecords');

        const files = [{
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
        }, {
            id: 'f1oxe5rtepfs7n3zifb4sso7po',
            user_id: 'bookmark',
            create_at: 1608270920357,
            update_at: 1608270920357,
            delete_at: 1608270920357,
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
        ];

        await operator.handleFiles({
            files,
            prepareRecordsOnly: false,
        });

        expect(spyOnprocessRecords).toHaveBeenCalledWith({
            fieldName: 'id',
            createOrUpdateRawValues: files.filter((f) => !f.delete_at),
            deleteRawValues: files.filter((f) => f.delete_at),
            tableName: 'File',
            shouldUpdate: shouldUpdateFileRecord,
        });
    });

    it('=> No table name: should not call execute if tableName is invalid', async () => {
        expect.assertions(3);

        const appDatabase = DatabaseManager.appDatabase?.database;
        const appOperator = DatabaseManager.appDatabase?.operator;
        expect(appDatabase).toBeTruthy();
        expect(appOperator).toBeTruthy();

        await expect(
            operator?.handleRecords({
                fieldName: 'invalidField',
                tableName: 'INVALID_TABLE_NAME',
                transformer: transformSystemRecord,
                createOrUpdateRawValues: [{id: 'tos-1', value: '1'}],
                prepareRecordsOnly: false,
            }, 'test'),
        ).rejects.toThrow(Error);
    });
});
