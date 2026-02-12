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
        expect.assertions(7);

        expect(database).toBeTruthy();

        const preparedRecord = await transformE2EEEnabledDeviceRecord({
            action: OperationType.CREATE,
            database: database!,
            value: {
                record: undefined,
                raw: {
                    device_id: 'device-1',
                    device_name: 'Device 1',
                    signature_public_key: 'key-1',
                    is_current_device: true,
                    created_at: 1620000000000,
                    last_active_at: 1620000001000,
                    revoke_at: null,
                    os_version: 'iOS 15',
                    app_version: '1.0.0',
                    verified: true,
                },
            },
        });

        expect(preparedRecord).toBeTruthy();
        expect(preparedRecord!.collection.table).toBe(E2EE_ENABLED_DEVICES);
        expect(preparedRecord!.deviceId).toBe('device-1');
        expect(preparedRecord!.deviceName).toBe('Device 1');
        expect(preparedRecord!.isCurrentDevice).toBe(true);
        expect(preparedRecord!.verified).toBe(true);
    });

    it('should return a record of type E2EEEnabledDevice for UPDATE action', async () => {
        expect.assertions(5);

        expect(database).toBeTruthy();

        let existingRecord: E2EEEnabledDeviceModel | undefined;
        await database!.write(async () => {
            existingRecord = await database!.get<E2EEEnabledDeviceModel>(E2EE_ENABLED_DEVICES).create((record) => {
                record._raw.id = 'device-2';
                record.deviceId = 'device-2';
                record.deviceName = 'Device 2';
                record.signaturePublicKey = 'key-2';
                record.isCurrentDevice = false;
                record.createdAt = 1620000000000;
                record.lastActiveAt = 1620000001000;
                record.revokeAt = null;
                record.osVersion = 'Android 12';
                record.appVersion = '1.0.0';
                record.verified = false;
            });
        });

        const preparedRecord = await transformE2EEEnabledDeviceRecord({
            action: OperationType.UPDATE,
            database: database!,
            value: {
                record: existingRecord,
                raw: {
                    device_id: 'device-2',
                    device_name: 'Updated Device 2',
                    signature_public_key: 'key-2-updated',
                    is_current_device: true,
                    created_at: 1620000000000,
                    last_active_at: 1620000002000,
                    revoke_at: null,
                    os_version: 'Android 13',
                    app_version: '2.0.0',
                    verified: true,
                },
            },
        });

        await database?.write(async () => {
            await database?.batch(preparedRecord);
        });

        expect(preparedRecord).toBeTruthy();
        expect(preparedRecord!.deviceName).toBe('Updated Device 2');
        expect(preparedRecord!.isCurrentDevice).toBe(true);
        expect(preparedRecord!.collection.table).toBe(E2EE_ENABLED_DEVICES);
    });

    it('should reject for non-create action without an existing record', async () => {
        expect.assertions(2);

        expect(database).toBeTruthy();

        await expect(
            transformE2EEEnabledDeviceRecord({
                action: OperationType.UPDATE,
                database: database!,
                value: {
                    record: undefined,
                    raw: {
                        device_id: 'device-3',
                        device_name: 'Device 3',
                        created_at: 1620000000000,
                    },
                },
            }),
        ).rejects.toThrow('Record not found for non create action');
    });
});
