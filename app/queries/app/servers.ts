// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';
import {of as of$, switchMap, distinctUntilChanged} from 'rxjs';

import {SupportedServer} from '@constants';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getConfigValue} from '@queries/servers/system';
import {isMinimumServerVersion} from '@utils/helpers';

import type ServerModel from '@typings/database/models/app/servers';

const {APP: {SERVERS}} = MM_TABLES;

export const queryServerDisplayName = (serverUrl: string) => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();
        return database.get<ServerModel>(SERVERS).query(Q.where('url', serverUrl));
    } catch {
        return undefined;
    }
};

export const queryAllActiveServers = () => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();
        return database.get<ServerModel>(MM_TABLES.APP.SERVERS).query(
            Q.and(
                Q.where('identifier', Q.notEq('')),
                Q.where('last_active_at', Q.gt(0)),
            ),
        );
    } catch {
        return undefined;
    }
};

export const getServer = async (serverUrl: string) => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();
        const servers = (await database.get<ServerModel>(SERVERS).query(Q.where('url', serverUrl)).fetch());
        return servers?.[0];
    } catch {
        return undefined;
    }
};

export const getAllServers = async () => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();
        return database.get<ServerModel>(MM_TABLES.APP.SERVERS).query().fetch();
    } catch {
        return [];
    }
};

export const getActiveServer = async () => {
    try {
        const servers = await getAllServers();
        const server = servers?.filter((s) => s.identifier)?.reduce((a, b) => (b.lastActiveAt > a.lastActiveAt ? b : a));
        return server;
    } catch {
        return undefined;
    }
};

export const getActiveServerUrl = async () => {
    const server = await getActiveServer();
    return server?.url || '';
};

export const getServerByIdentifier = async (identifier: string) => {
    try {
        const {database} = DatabaseManager.getAppDatabaseAndOperator();
        const servers = (await database.get<ServerModel>(SERVERS).query(Q.where('identifier', identifier)).fetch());
        return servers?.[0];
    } catch {
        return undefined;
    }
};

export const getServerByDisplayName = async (displayName: string) => {
    const servers = await getAllServers();
    const server = servers.find((s) => s.displayName.toLowerCase() === displayName.toLowerCase());
    return server;
};

export const getServerDisplayName = async (serverUrl: string) => {
    const servers = await queryServerDisplayName(serverUrl)?.fetch();
    return servers?.[0].displayName || serverUrl;
};

export const observeServerDisplayName = (serverUrl: string) => {
    return queryServerDisplayName(serverUrl)?.observeWithColumns(['display_name']).pipe(
        switchMap((s) => of$(s.length ? s[0].displayName : serverUrl)),
        distinctUntilChanged(),
    );
};

export const observeAllActiveServers = () => {
    return queryAllActiveServers()?.observe() || of$([]);
};

export const areAllServersSupported = async () => {
    const servers = await getAllServers();
    for await (const s of servers) {
        if (s.lastActiveAt) {
            try {
                const {database: serverDatabase} = DatabaseManager.getServerDatabaseAndOperator(s.url);
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
