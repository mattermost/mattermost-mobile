// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {SupportedServer} from '@constants';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getConfigValue} from '@queries/servers/system';
import {isMinimumServerVersion} from '@utils/helpers';

import type ServerModel from '@typings/database/models/app/servers';

const {APP: {SERVERS}} = MM_TABLES;

export const queryServer = async (appDatabase: Database, serverUrl: string) => {
    const servers = (await appDatabase.get<ServerModel>(SERVERS).query(Q.where('url', serverUrl)).fetch());
    return servers?.[0];
};

export const queryAllServers = async (appDatabase: Database) => {
    return appDatabase.get<ServerModel>(MM_TABLES.APP.SERVERS).query().fetch();
};

export const queryActiveServer = async (appDatabase: Database) => {
    try {
        const servers = await queryAllServers(appDatabase);
        const server = servers?.filter((s) => s.identifier)?.reduce((a, b) => (b.lastActiveAt > a.lastActiveAt ? b : a));
        return server;
    } catch {
        return undefined;
    }
};

export const getActiveServerUrl = async (appDatabase: Database) => {
    const server = await queryActiveServer(appDatabase);
    return server?.url || '';
};

export const queryServerByIdentifier = async (appDatabase: Database, identifier: string) => {
    try {
        const servers = (await appDatabase.get<ServerModel>(SERVERS).query(Q.where('identifier', identifier)).fetch());
        return servers?.[0];
    } catch {
        return undefined;
    }
};

export const queryServerByDisplayName = async (appDatabase: Database, displayName: string) => {
    const servers = await queryAllServers(appDatabase);
    const server = servers.find((s) => s.displayName.toLowerCase() === displayName.toLowerCase());
    return server;
};

export const queryServerName = async (appDatabase: Database, serverUrl: string) => {
    try {
        const servers = (await appDatabase.get<ServerModel>(SERVERS).query(Q.where('url', serverUrl)).fetch());
        return servers?.[0].displayName;
    } catch {
        return serverUrl;
    }
};

export const areAllServersSupported = async () => {
    let appDatabase;
    try {
        const databaseAndOperator = DatabaseManager.getAppDatabaseAndOperator();
        appDatabase = databaseAndOperator.database;
    } catch {
        return false;
    }

    const servers = await queryAllServers(appDatabase);
    for (const s of servers) {
        if (s.lastActiveAt) {
            try {
                const {database: serverDatabase} = DatabaseManager.getServerDatabaseAndOperator(s.url);
                // eslint-disable-next-line no-await-in-loop
                const version = await getConfigValue(serverDatabase, 'Version');

                const {MAJOR_VERSION, MIN_VERSION, PATCH_VERSION} = SupportedServer;
                const isSupportedServer = isMinimumServerVersion(version || '', MAJOR_VERSION, MIN_VERSION, PATCH_VERSION);
                if (!isSupportedServer) {
                    return false;
                }
            } catch {
                continue;
            }
        }
    }

    return true;
};
