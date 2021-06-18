// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ComponentType, useEffect, useState} from 'react';
import {Database} from '@nozbe/watermelondb';
import DatabaseProvider from '@nozbe/watermelondb/DatabaseProvider';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import Servers from '@database/models/default/servers';

const {SERVERS} = MM_TABLES.DEFAULT;

//TODO: Remove when DatabaseManager is Singleton
const DBManager = new DatabaseManager();

export function withServerDatabase<T>(
    Component: ComponentType<T>,
): ComponentType<T> {
    return function ServerDatabaseComponent(props) {
        const [database, setDatabase] = useState<Database|unknown>();

        // If we don't need to await the async functions this side effect is not needed
        useEffect(() => {
            const observer = async (servers: Servers[]) => {
                const server = servers.reduce((a, b) => (a.lastActiveAt > b.lastActiveAt ? a : b));

                // The server database should already exists at this point
                // there should not be a need to await
                const serverDatabase = await DBManager.retrieveDatabaseInstances([server.url]);
                if (serverDatabase?.length) {
                    setDatabase(serverDatabase[0]);
                }
            };

            const init = async () => {
                // TODO: At this point the database should be already present
                // there should not be a need to await

                const db = await DBManager.getDefaultDatabase();
                db?.collections.
                    get(SERVERS).
                    query().
                    observeWithColumns(['last_active_at']).
                    subscribe(observer);
            };

            init();
        });

        if (!database) {
            return null;
        }

        return (
            <DatabaseProvider database={(database as Database)}>
                <Component {...props}/>
            </DatabaseProvider>
        );
    };
}
