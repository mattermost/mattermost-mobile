// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ComponentType, useState} from 'react';
import {Database} from '@nozbe/watermelondb';
import DatabaseProvider from '@nozbe/watermelondb/DatabaseProvider';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import Servers from '@app/database/models/app/servers';

const {SERVERS} = MM_TABLES.APP;

export function withServerDatabase<T>(
    Component: ComponentType<T>,
): ComponentType<T> {
    return function ServerDatabaseComponent(props) {
        const [database, setDatabase] = useState<Database|unknown>();
        const db = DatabaseManager.appDatabase?.database;

        const observer = async (servers: Servers[]) => {
            const server = servers.reduce((a, b) => (b.lastActiveAt > a.lastActiveAt ? b : a));

            const serverDatabase = DatabaseManager.serverDatabases[server.url].database;
            if (serverDatabase) {
                setDatabase(serverDatabase);
            }
        };

        db?.collections.
            get(SERVERS).
            query().
            observeWithColumns(['last_active_at']).
            subscribe(observer);

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
