// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

import {getCurrentDevice} from './devices';

import type ServerDataOperator from '@database/operator/server_data_operator';

describe('Device Queries', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init(['devices.query.test.com']);
        operator = DatabaseManager.serverDatabases['devices.query.test.com']!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase('devices.query.test.com');
    });

    describe('getCurrentDevice', () => {
        it('should return undefined when no devices exist', async () => {
            const result = await getCurrentDevice(operator.database);
            expect(result).toBeUndefined();
        });

        it('should return the current device only', async () => {
            await operator.handleDevices({
                devices: [{device_id: 'device-2', device_name: 'Device 2'} as RegisteredDevice],
            });

            await operator.handleCurrentDevice({
                deviceId: 'device-1',
                signaturePublicKey: 'key-1',
            });

            const result = await getCurrentDevice(operator.database);

            expect(result).toBeDefined();
            expect(result!.deviceId).toBe('device-1');
            expect(result!.isCurrentDevice).toBe(true);
        });

        it('should return undefined when devices exist but none is the current device', async () => {
            await operator.handleDevices({
                devices: [{device_id: 'device-1', device_name: 'Device 1'} as RegisteredDevice],
            });

            const result = await getCurrentDevice(operator.database);
            expect(result).toBeUndefined();
        });
    });
});
