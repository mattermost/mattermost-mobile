// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/admin/database_manager';
import {createDataOperator} from '@database/admin/data_operator/wrapper';
import DatabaseConnectionException from '@database/admin/exceptions/database_connection_exception';
import {DatabaseType} from '@typings/database/enums';

jest.mock('@database/admin/database_manager');

describe('*** DataOperator Wrapper ***', () => {
    it('=> wrapper should return an instance of DataOperator ', async () => {
        expect.assertions(1);

        const serverUrl = 'https://wrapper.mattermost.com';

        // first we create the connection and save it into default database
        await DatabaseManager.createDatabaseConnection({
            configs: {
                actionsEnabled: true,
                dbName: 'community mattermost',
                dbType: DatabaseType.SERVER,
                serverUrl,
            },
            shouldAddToDefaultDatabase: true,
        });

        const dataOperator = await createDataOperator(serverUrl);

        expect(dataOperator).toBeTruthy();
    });

    it('=> wrapper should throw an error due to invalid server url', async () => {
        expect.assertions(2);

        const serverUrl = 'https://wrapper.mattermost.com';

        // first we create the connection and save it into default database
        await DatabaseManager.createDatabaseConnection({
            configs: {
                actionsEnabled: true,
                dbName: 'test_database',
                dbType: DatabaseType.SERVER,
                serverUrl,
            },
            shouldAddToDefaultDatabase: true,
        });

        await expect(createDataOperator('https://error.com')).rejects.toThrow(
            'No database has been registered with this url: https://error.com',
        );

        await expect(createDataOperator('https://error.com')).rejects.toThrow(DatabaseConnectionException);
    });
});
