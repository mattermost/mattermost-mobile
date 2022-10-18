// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';

import type ServersModel from '@typings/database/models/app/servers';

const {SERVERS} = MM_TABLES.APP;

export const subscribeActiveServers = (observer: (servers: ServersModel[]) => void) => {
    const db = DatabaseManager.appDatabase?.database;
    return db?.
        get<ServersModel>(SERVERS).
        query(Q.where('identifier', Q.notEq(''))).
        observeWithColumns(['display_name', 'last_active_at']).
        subscribe(observer);
};

export const subscribeAllServers = (observer: (servers: ServersModel[]) => void) => {
    const db = DatabaseManager.appDatabase?.database;
    return db?.
        get<ServersModel>(SERVERS).
        query().
        observeWithColumns(['last_active_at']).
        subscribe(observer);
};

