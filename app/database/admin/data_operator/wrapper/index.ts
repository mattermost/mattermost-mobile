// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DataOperator from '@database/admin/data_operator/handlers';
import DatabaseManager from '@database/admin/database_manager';
import DatabaseConnectionException from '@database/admin/exceptions/database_connection_exception';
import {Database} from '@nozbe/watermelondb';

export const createDataOperator = async (serverUrl: string) => {
    // Retrieves the connection matching serverUrl
    const connections = await DatabaseManager.retrieveDatabaseInstances([
        serverUrl,
    ]);

    if (connections?.length) {
    // finds the connection that corresponds to the serverUrl value
        const index = connections.findIndex((connection) => {
            return connection.url === serverUrl;
        });

        if (!connections?.[index]?.dbInstance) {
            throw new DatabaseConnectionException(
                `An instance of a database connection was found but we could not create a connection out of it for url: ${serverUrl}`,
            );
        }

        const connection = connections[index].dbInstance as Database;

        return new DataOperator(connection);
    }

    throw new DatabaseConnectionException(
        `No database has been registered with this url: ${serverUrl}`,
    );
};
