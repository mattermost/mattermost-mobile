// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

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

export const queryServerByIdentifier = async (appDatabase: Database, identifier: string) => {
    try {
        const servers = (await appDatabase.get<ServerModel>(SERVERS).query(Q.where('identifier', identifier)).fetch());
        return servers?.[0];
    } catch {
        return undefined;
    }
};

export const queryServerName = async (appDatabase: Database, serverUrl: string) => {
    try {
        const servers = (await appDatabase.get<ServerModel>(SERVERS).query(Q.where('url', serverUrl)).fetch());
        return servers?.[0].displayName;
    } catch {
        return serverUrl;
    }
};

