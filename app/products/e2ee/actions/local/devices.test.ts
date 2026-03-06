// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {addDevice} from '@e2ee/actions/local/devices';

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

describe('addDevice', () => {
    it('should handle not found database', async () => {
        const {error} = await addDevice('bad-url', 'device-id', 'key');
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('bad-url database not found');
    });

    it('should create new device successfully', async () => {
        const handleCurrentDeviceSpy = jest.spyOn(operator, 'handleCurrentDevice');
        const {data} = await addDevice(serverUrl, 'device-id', 'key');

        expect(data).toBeDefined();
        expect(handleCurrentDeviceSpy).toHaveBeenCalledWith({deviceId: 'device-id', signaturePublicKey: 'key'});
    });

    it('should handle existing data for current device successfully', async () => {
        await operator.handleCurrentDevice({
            deviceId: 'device-id',
            signaturePublicKey: 'key',
        });

        const {data} = await addDevice(serverUrl, 'device-id', 'key-2');

        expect(data).toBeDefined();
        expect(data!.length).toBe(1);
    });
});
