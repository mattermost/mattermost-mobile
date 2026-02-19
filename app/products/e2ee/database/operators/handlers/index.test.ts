// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {E2EE_TABLES} from '@e2ee/constants/database';

import DatabaseManager from '@database/manager';

import type ServerDataOperator from '@database/operator/server_data_operator';

const {E2EE_REGISTERED_DEVICES} = E2EE_TABLES;

describe('E2EEHandler', () => {
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init(['e2eeHandler.test.com']);
        operator = DatabaseManager.serverDatabases['e2eeHandler.test.com']!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase('e2eeHandler.test.com');
    });

    describe('handlerDevices', () => {
        it('should return an empty array if devices is empty', async () => {
            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');

            const result = await operator.handleDevices({devices: []});
            expect(result).toEqual([]);
            expect(spyOnPrepareRecords).not.toHaveBeenCalled();
        });

        it('skips devices without device_id', async () => {
            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const devices = [
                {device_id: 'device-1', device_name: 'Device 1'},
                {device_id: 'device-2', device_name: 'Device 2'},
                {device_name: 'Device 3'},
            ];

            const result = await operator.handleDevices({devices: devices as RegisteredDevice[]});
            expect(result).toBeDefined();
            expect(result.length).toBe(2);
            expect(spyOnPrepareRecords).toHaveBeenCalledTimes(1);
            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);
        });

        it('should sync existing devices with new ones', async () => {
            const initDevices = [
                {device_id: 'device-1', device_name: 'Device 1', signature_public_key: 'key-1'},
                {device_id: 'device-2', device_name: 'Device 2', signature_public_key: 'key-2'},
            ];

            await operator.handleDevices({devices: initDevices as RegisteredDevice[]});

            const spyOnPrepareRecords = jest.spyOn(operator, 'prepareRecords');
            const spyOnBatchOperation = jest.spyOn(operator, 'batchRecords');

            const devices = [
                {device_id: 'device-1', signature_public_key: 'new-key-1'},
                {device_id: 'device-3', device_name: 'Device 3'},
            ];

            const result = await operator.handleDevices({devices: devices as RegisteredDevice[]});
            expect(result).toBeDefined();
            expect(result.length).toBe(3);

            expect(spyOnPrepareRecords).toHaveBeenCalledTimes(1);
            const [prepareArgs] = spyOnPrepareRecords.mock.calls[0];
            expect(prepareArgs.createRaws).toHaveLength(1); // device-3 created
            expect(prepareArgs.updateRaws).toHaveLength(1); // device-1 updated
            expect(prepareArgs.deleteRaws).toHaveLength(1); // device-2 deleted

            expect(spyOnBatchOperation).toHaveBeenCalledTimes(1);

            const {database} = operator;

            // Verify that the devices table contains just 2 records
            const registeredDeviceRecords = await database.get(E2EE_REGISTERED_DEVICES).query().fetch();
            expect(registeredDeviceRecords.length).toBe(2);
        });
    });
});
