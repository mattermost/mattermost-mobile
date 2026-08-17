// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {updatePlaybooksSettings} from '@playbooks/actions/remote/settings';
import {querySystemValue} from '@queries/servers/system';
import TestHelper from '@test/test_helper';
import {logDebug} from '@utils/log';

import {handlePlaybooksSettingsChanged} from './settings';

const serverUrl = 'baseHandler.test.com';

jest.mock('@playbooks/actions/remote/settings', () => ({
    updatePlaybooksSettings: jest.fn(),
}));
jest.mock('@utils/log');

beforeEach(async () => {
    jest.clearAllMocks();
    await DatabaseManager.init([serverUrl]);
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('handlePlaybooksSettingsChanged', () => {
    it('should no-op when payload is missing', async () => {
        const msg = TestHelper.fakeWebsocketMessage({data: {}});
        await handlePlaybooksSettingsChanged(serverUrl, msg);

        expect(logDebug).toHaveBeenCalledWith('handlePlaybooksSettingsChanged: missing payload');
        expect(updatePlaybooksSettings).not.toHaveBeenCalled();
    });

    it('should no-op when payload is invalid', async () => {
        const msg = TestHelper.fakeWebsocketMessage({
            data: {payload: 'not-json'},
        });
        await handlePlaybooksSettingsChanged(serverUrl, msg);

        expect(logDebug).toHaveBeenCalledWith('handlePlaybooksSettingsChanged: invalid settings payload');
        expect(updatePlaybooksSettings).not.toHaveBeenCalled();
    });

    it('should persist enable_task_requirements from the payload', async () => {
        const msg = TestHelper.fakeWebsocketMessage({
            data: {
                payload: JSON.stringify({enable_task_requirements: true}),
            },
        });

        await handlePlaybooksSettingsChanged(serverUrl, msg);

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const systemValues = await querySystemValue(database, SYSTEM_IDENTIFIERS.PLAYBOOKS_TASK_REQUIREMENTS_ENABLED);
        expect(systemValues).toHaveLength(1);
        expect(systemValues[0].value).toBe(true);
        expect(updatePlaybooksSettings).not.toHaveBeenCalled();
    });

    it('should fall back to a remote settings fetch for unrelated updates', async () => {
        jest.mocked(updatePlaybooksSettings).mockResolvedValueOnce({data: {
            enable_experimental_features: false,
            enable_task_requirements: false,
        }});

        const msg = TestHelper.fakeWebsocketMessage({
            data: {
                payload: JSON.stringify({enable_experimental_features: true}),
            },
        });

        await handlePlaybooksSettingsChanged(serverUrl, msg);

        expect(updatePlaybooksSettings).toHaveBeenCalledWith(serverUrl);
    });
});
