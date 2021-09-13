// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type Servers from '@typings/database/models/app/servers';

const {APP: {SERVERS}} = MM_TABLES;

export const queryServer = async (appDatabase: Database, serverUrl: string) => {
    const servers = (await appDatabase.collections.get(SERVERS).query(Q.where('url', serverUrl)).fetch()) as Servers[];
    return servers?.[0];
};

export const queryAllServers = async (appDatabse: Database) => {
    return (await appDatabse.collections.get(MM_TABLES.APP.SERVERS).query().fetch()) as Servers[];
};

export const queryActiveServer = async (appDatabse: Database) => {
    try {
        const servers = await queryAllServers(appDatabse);
        return servers.reduce((a, b) => (b.lastActiveAt > a.lastActiveAt ? b : a));
    } catch {
        return undefined;
    }
};
