// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {PLAYBOOK_TABLES} from '@playbooks/constants/database';
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

    it('should purge playbooks when version is empty', async () => {
        const database = operator.database;
        jest.spyOn(database.adapter, 'unsafeExecute').mockImplementation(() => {
            return Promise.resolve();
        });

        const {data, error} = await setPlaybooksVersion(serverUrl, '');
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        expect(database.adapter.unsafeExecute).toHaveBeenCalledWith({
            sqls: [
                [`DELETE FROM ${PLAYBOOK_TABLES.PLAYBOOK_RUN}`, []],
                [`DELETE FROM ${PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST}`, []],
                [`DELETE FROM ${PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM}`, []],
            ],
        });
    });

    it('should not purge playbooks when version is not empty', async () => {
        const database = operator.database;
        jest.spyOn(database.adapter, 'unsafeExecute').mockImplementation(() => {
            return Promise.resolve();
        });

        const {data, error} = await setPlaybooksVersion(serverUrl, '1.2.3');
        expect(error).toBeUndefined();
        expect(data).toBe(true);

        expect(database.adapter.unsafeExecute).not.toHaveBeenCalled();
    });

    it('should handle purge playbooks errors', async () => {
        const database = operator.database;
        jest.spyOn(database.adapter, 'unsafeExecute').mockImplementation(() => {
            return Promise.reject(new Error('fail'));
        });

        const {error} = await setPlaybooksVersion(serverUrl, '');
        expect(error).toBeTruthy();
        expect(database.adapter.unsafeExecute).toHaveBeenCalledWith({
            sqls: [
                [`DELETE FROM ${PLAYBOOK_TABLES.PLAYBOOK_RUN}`, []],
                [`DELETE FROM ${PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST}`, []],
                [`DELETE FROM ${PLAYBOOK_TABLES.PLAYBOOK_CHECKLIST_ITEM}`, []],
            ],
        });
    });
});
