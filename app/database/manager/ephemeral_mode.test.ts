// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Use the real DatabaseManager (not the mock) to test ZPM wiring.
jest.unmock('@database/manager');

// Replace SQLiteAdapter with LokiJS so the real manager works in Jest.
jest.mock('@nozbe/watermelondb/adapters/sqlite', () => {
    const LokiJSAdapter = require('@nozbe/watermelondb/adapters/lokijs').default;
    return {
        __esModule: true,
        default: LokiJSAdapter,
    };
});

// Mock @queries/app/servers to break the circular dependency with @database/manager.
jest.mock('@queries/app/servers', () => ({
    getServer: jest.fn(),
}));

jest.mock('@utils/mattermost_managed', () => ({
    getIOSAppGroupDetails: jest.fn(() => ({
        appGroupIdentifier: 'group.test',
        appGroupSharedDirectory: '/tmp/test',
        appGroupDatabase: '/tmp/test/databases',
    })),
    deleteIOSDatabase: jest.fn(),
    renameIOSDatabase: jest.fn(),
}));

jest.mock('@helpers/database/upgrade', () => ({
    beforeUpgrade: jest.fn(),
}));

jest.mock('@init/credentials', () => ({
    removePreauthSecret: jest.fn(),
}));

import DatabaseManager from '@database/manager';
import {getServer} from '@queries/app/servers';

import type ServersModel from '@typings/database/models/app/servers';

const serverUrl = 'https://zpm-test.example.com';

describe('DatabaseManager ZPM wiring', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('createServerDatabase deletes stale SQLite files when persistenceFlag is zero-persistence', async () => {
        jest.mocked(getServer).mockResolvedValue({persistenceFlag: 'zero-persistence'} as unknown as ServersModel);
        const deleteDbSpy = jest.spyOn(DatabaseManager, 'deleteServerDatabaseFiles').mockResolvedValue();

        await DatabaseManager.createServerDatabase({
            config: {dbName: serverUrl, serverUrl},
        });

        expect(deleteDbSpy).toHaveBeenCalledWith(serverUrl);
    });

    it('createServerDatabase does not delete SQLite files when persistenceFlag is not set', async () => {
        jest.mocked(getServer).mockResolvedValue({persistenceFlag: ''} as unknown as ServersModel);
        const deleteDbSpy = jest.spyOn(DatabaseManager, 'deleteServerDatabaseFiles').mockResolvedValue();

        await DatabaseManager.createServerDatabase({
            config: {dbName: serverUrl, serverUrl},
        });

        expect(deleteDbSpy).not.toHaveBeenCalled();
    });

    it('createServerDatabase does not delete SQLite files when persistenceFlag is wiped', async () => {
        jest.mocked(getServer).mockResolvedValue({persistenceFlag: 'wiped'} as unknown as ServersModel);
        const deleteDbSpy = jest.spyOn(DatabaseManager, 'deleteServerDatabaseFiles').mockResolvedValue();

        await DatabaseManager.createServerDatabase({
            config: {dbName: serverUrl, serverUrl},
        });

        expect(deleteDbSpy).not.toHaveBeenCalled();
    });
});
