// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';

import {
    queryEnabledDevices,
} from './devices';

import type ServerDataOperator from '@database/operator/server_data_operator';

describe('Enabled Devices Queries', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init(['devices.test.com']);
        operator = DatabaseManager.serverDatabases['devices.test.com']!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase('devices.test.com');
    });

    describe('queryEnabledDevices', () => {
        it('should return enabled devices sorted by is_current_device and created_at', async () => {
            const devices = [
                {device_id: 'device-1', device_name: 'Device 1', is_current_device: false, created_at: new Date('2021-01-01').getMilliseconds(), last_active_at: new Date('2021-01-01').getMilliseconds()},
                {device_id: 'device-2', device_name: 'Device 2', is_current_device: false, created_at: new Date('2021-01-02').getMilliseconds(), last_active_at: new Date('2021-01-02').getMilliseconds()},
                {device_id: 'device-3', device_name: 'Device 3', is_current_device: true, created_at: new Date('2021-01-03').getMilliseconds(), last_active_at: new Date('2021-01-03').getMilliseconds()},
            ];

            await operator.handleDevices({devices});

            const result = queryEnabledDevices(operator.database);
            const fetchedDevices = await result.fetch();

            expect(fetchedDevices.length).toBe(3);
            expect(fetchedDevices[0].deviceId).toBe('device-3');
            expect(fetchedDevices[1].deviceId).toBe('device-1');
            expect(fetchedDevices[2].deviceId).toBe('device-2');
        });
    });
});
