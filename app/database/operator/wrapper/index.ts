// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Operator from '@database/operator/index';
import DatabaseManager from '@database/manager';
import DatabaseConnectionException from '@database/exceptions/database_connection_exception';

export const createDataOperator = async (serverUrl: string) => {
    const databaseManagerClient = new DatabaseManager();

    const connection = await databaseManagerClient.getDatabaseConnection({serverUrl, setAsActiveDatabase: false});

    if (connection) {
        const operator = new Operator(connection);
        return operator;
    }
    throw new DatabaseConnectionException(
        `No database has been registered with this url: ${serverUrl}`,
    );
};
