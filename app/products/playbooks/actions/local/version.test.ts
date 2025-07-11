// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {querySystemValue} from '@queries/servers/system';

import {setPlaybooksVersion} from './version';

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

describe('setPlaybooksVersion', () => {
    it('should handle not found database', async () => {
        const {error} = await setPlaybooksVersion('foo', '1.2.3');
        expect(error).toBeTruthy();
    });

    it('should set playbooks version successfully', async () => {
        const version = '2.0.0';
        const {data, error} = await setPlaybooksVersion(serverUrl, version);
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        const systemValues = await querySystemValue(operator.database, SYSTEM_IDENTIFIERS.PLAYBOOKS_VERSION);
        expect(systemValues[0].value).toBe(version);
    });

    it('should handle operator errors', async () => {
        const originalHandleSystem = operator.handleSystem;
        operator.handleSystem = jest.fn().mockImplementation(() => {
            throw new Error('fail');
        });
        const {error} = await setPlaybooksVersion(serverUrl, '3.0.0');
        expect(error).toBeTruthy();
        operator.handleSystem = originalHandleSystem;
    });
});
