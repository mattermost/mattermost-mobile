// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {updateDevices} from '@e2ee/actions/local/devices';

import DatabaseManager from '@database/manager';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('updateDevices', () => {
    it('should handle not found database', async () => {
        const {error} = await updateDevices('bad-url', []);
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('bad-url database not found');
    });

    it('should handle devices successfully', async () => {
        await operator.handleDevices({devices: [{
            device_id: 'device-id',
            device_name: 'existing',
            created_at: 1,
            last_active_at: 1,
        }]});

        const {data} = await updateDevices(serverUrl, [{
            device_id: 'device-id',
            device_name: 'new',
            created_at: 2,
            last_active_at: 2,
        }, {
            device_id: 'second-device-id',
            device_name: 'second',
            created_at: 3,
            last_active_at: 3,
        }]);

        expect(data).toBeDefined();
        expect(data!.length).toBe(2);
    });
});
