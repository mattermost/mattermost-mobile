// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import ServerDataOperator from '@database/operator/server_data_operator';

import type ServersModel from '@typings/database/models/app/servers';

const {SERVERS} = MM_TABLES.APP;

// NOTE :  On the mock Database Manager, we cannot test for :
// 1. Android/iOS file path
// 2. Deletion of the 'databases' folder on those two platforms

describe('*** Database Manager tests ***', () => {
    const serverUrls = ['https://appv1.mattermost.com', 'https://appv2.mattermost.com'];
    beforeAll(async () => {
        await DatabaseManager.init(serverUrls);
        await DatabaseManager.updateServerIdentifier(serverUrls[0], 'appv1');
        await DatabaseManager.updateServerIdentifier(serverUrls[1], 'appv2');
    });

    it('=> should return a default database', async () => {
        expect.assertions(2);

        const appDatabase = DatabaseManager.appDatabase?.database;

        expect(appDatabase).toBeInstanceOf(Database);
        expect(Object.keys(DatabaseManager.serverDatabases).length).toBe(2);
    });

    it('=> should create a new server database', async () => {
        expect.assertions(3);

        const spyOnAddServerToDefaultDatabase = jest.spyOn(DatabaseManager as any, 'addServerToAppDatabase');

        const connection1 = await DatabaseManager!.createServerDatabase({
            config: {
                dbName: 'appv3 mattermost',
                serverUrl: 'https://appv3.mattermost.com',
                identifier: 'appv3',
            },
        });

        expect(connection1?.database).toBeInstanceOf(Database);
        expect(connection1?.operator).toBeInstanceOf(ServerDataOperator);
        expect(spyOnAddServerToDefaultDatabase).toHaveBeenCalledTimes(1);
    });

    it('=> should switch between active servers', async () => {
        expect.assertions(4);

        let activeServerUrl = await DatabaseManager.getActiveServerUrl();
        const serverA = await DatabaseManager.getActiveServerDatabase();

        // as we haven't set an active server yet, so the first registered server should be the active one
        expect(activeServerUrl).toBe(serverUrls[0]);
        expect(serverA).toEqual(DatabaseManager.serverDatabases[serverUrls[0]]!.database);

        await DatabaseManager.setActiveServerDatabase('https://appv2.mattermost.com');

        // new active server should change and we have a Database and is active
        activeServerUrl = await DatabaseManager.getActiveServerUrl();
        const serverB = await DatabaseManager.getActiveServerDatabase();
        expect(activeServerUrl).toBe(serverUrls[1]);
        expect(serverB).toEqual(DatabaseManager.serverDatabases[serverUrls[1]]!.database);
    });

    it('=> should delete appv1 server from the servers table of App database', async () => {
        expect.assertions(2);

        await DatabaseManager.setActiveServerDatabase('https://appv1.mattermost.com');
        await DatabaseManager.destroyServerDatabase('https://appv1.mattermost.com');

        const fetchServerRecords = async (serverUrl: string) => {
            const servers = await DatabaseManager.appDatabase?.database!.collections.get<ServersModel>(SERVERS).query(Q.where('url', serverUrl)).fetch();
            return servers?.length || 0;
        };

        const destroyed = await fetchServerRecords(serverUrls[0]);
        expect(destroyed).toBe(0);

        // Removing database for appv1 connection
        const activeServerUrl = await DatabaseManager.getActiveServerUrl();
        expect(activeServerUrl).toEqual(serverUrls[1]);
    });

    it('=> should return appv3 server url from the servers table of App database', async () => {
        expect.assertions(1);

        const serverUrl = await DatabaseManager.getServerUrlFromIdentifier('appv3');
        expect(serverUrl).toBe('https://appv3.mattermost.com');
    });
});
