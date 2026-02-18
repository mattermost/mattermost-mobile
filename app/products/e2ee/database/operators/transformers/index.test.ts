// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {E2EE_TABLES} from '@e2ee/constants/database';
import E2EEEnabledDeviceModel from '@e2ee/database/models/e2ee_enabled_device';

import {OperationType} from '@constants/database';
import DatabaseManager from '@database/manager';
import {createTestConnection} from '@database/operator/utils/create_test_connection';

import {transformE2EEEnabledDeviceRecord} from '.';

const {E2EE_ENABLED_DEVICES} = E2EE_TABLES;

const serverUrl = 'server-url.test.com';
const databaseName = 'e2ee_device_transform';

describe('transformE2EEEnabledDeviceRecord', () => {
    let database: Awaited<ReturnType<typeof createTestConnection>>;

    beforeAll(async () => {
        database = await createTestConnection({databaseName, setActive: true});
    });

    afterAll(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return a record of type E2EEEnabledDevice for CREATE action', async () => {
        const preparedRecord = await transformE2EEEnabledDeviceRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    device_id: 'device-1',
                    signature_public_key: 'key-1',
                },
            },
        });

        expect(preparedRecord).toBeTruthy();
        expect(preparedRecord!.collection.table).toBe(E2EE_ENABLED_DEVICES);
        expect(preparedRecord!.deviceId).toBe('device-1');
        expect(preparedRecord!.signaturePublicKey).toBe('key-1');
    });

    it('should return a record of type E2EEEnabledDevice for UPDATE action', async () => {
        let existingRecord: E2EEEnabledDeviceModel | undefined;
        await database!.write(async () => {
            existingRecord = await database!.get<E2EEEnabledDeviceModel>(E2EE_ENABLED_DEVICES).create((record) => {
                record._raw.id = 'device-2';
                record.deviceId = 'device-2';
                record.signaturePublicKey = 'key-2';
                record.isCurrentDevice = true;
                record.verified = true;
            });
        });

        const preparedRecord = await transformE2EEEnabledDeviceRecord({
            action: OperationType.UPDATE,
            database: database!,
            value: {
                record: existingRecord,
                raw: {
                    device_id: 'device-2',
                    signature_public_key: 'key-2-updated',
                },
            },
        });

        await database?.write(async () => {
            await database?.batch(preparedRecord);
        });

        expect(preparedRecord).toBeTruthy();
        expect(preparedRecord!.signaturePublicKey).toBe('key-2-updated');
        expect(preparedRecord!.isCurrentDevice).toBe(true);
        expect(preparedRecord!.verified).toBe(true);
        expect(preparedRecord!.collection.table).toBe(E2EE_ENABLED_DEVICES);
    });

    it('should reject for non-create action without an existing record', async () => {
        await expect(
            transformE2EEEnabledDeviceRecord({
                action: OperationType.UPDATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {
                        device_id: 'device-3',
                    },
                },
            }),
        ).rejects.toThrow('Record not found for non create action');
    });
});
