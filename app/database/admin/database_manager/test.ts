// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import {DBInstance} from '@typings/database/database';
import IServers from '@typings/database/servers';

import DatabaseManager, {DatabaseType} from './index';

jest.mock('./index');

const {SERVERS} = MM_TABLES.DEFAULT;

// NOTE :  On the mock Database Manager, we cannot test for :
// 1. Android/iOS file path
// 2. Deletion of the 'databases' folder on those two platforms

describe('*** Database Manager tests ***', () => {
    it('=> should return a default database', async () => {
        expect.assertions(2);

        const spyOnAddServerToDefaultDatabase = jest.spyOn(DatabaseManager as any, 'addServerToDefaultDatabase');

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeInstanceOf(Database);
        expect(spyOnAddServerToDefaultDatabase).not.toHaveBeenCalledTimes(1);
    });

    it('=> should create a new server connection', async () => {
        expect.assertions(2);

        const spyOnAddServerToDefaultDatabase = jest.spyOn(DatabaseManager as any, 'addServerToDefaultDatabase');

        const connection1 = await DatabaseManager.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            databaseConnection: {
                actionsEnabled: true,
                dbName: 'community mattermost',
                dbType: DatabaseType.SERVER,
                serverUrl: 'https://appv1.mattermost.com',
            },
        });

        expect(connection1).toBeInstanceOf(Database);
        expect(spyOnAddServerToDefaultDatabase).toHaveBeenCalledTimes(1);
    });

    it('=> should switch between active server connections', async () => {
        expect.assertions(7);
        let activeServer: DBInstance;
        let adapter;

        activeServer = await DatabaseManager.getActiveServerDatabase();

        // as we haven't set an active server yet, we should be getting undefined in the activeServer variable
        expect(activeServer).toBeUndefined();

        const setActiveServer = async ({displayName, serverUrl}:{displayName: string, serverUrl: string}) => {
            // now we set the active database
            const server = await DatabaseManager.setActiveServerDatabase({displayName, serverUrl});

            // setActiveServer should be undefined as the method  does not actually return anything
            expect(server).toBeUndefined();
        };

        await setActiveServer({displayName: 'community mattermost', serverUrl: 'https://appv1.mattermost.com'});

        // let's verify if we now have a value for activeServer
        activeServer = await DatabaseManager.getActiveServerDatabase();
        expect(activeServer).toBeDefined();
        adapter = activeServer!.adapter as any;
        const currentDBName = adapter.underlyingAdapter._dbName;
        expect(currentDBName).toStrictEqual('community mattermost');

        // spice things up; we'll set a new server and verify if the value of activeServer changes
        await setActiveServer({displayName: 'appv2', serverUrl: 'https://appv2.mattermost.com'});
        activeServer = await DatabaseManager.getActiveServerDatabase();
        expect(activeServer).toBeDefined();
        adapter = activeServer!.adapter as any;
        const newDBName = adapter.underlyingAdapter._dbName;
        expect(newDBName).toStrictEqual('appv2');
    });

    it('=> should retrieve all database instances matching serverUrls parameter', async () => {
        expect.assertions(3);

        const spyOnCreateDatabaseConnection = jest.spyOn(DatabaseManager, 'createDatabaseConnection');

        const dbInstances = await DatabaseManager.retrieveDatabaseInstances([
            'https://xunity2.mattermost.com',
            'https://appv2.mattermost.com',
            'https://appv1.mattermost.com',
        ]);

        expect(dbInstances).toBeTruthy();
        const numDbInstances = dbInstances && dbInstances.length ? dbInstances.length : 0;

        // The Database Manager will call the 'createDatabaseConnection' method in consequence of the number of database connection present in dbInstances array
        expect(spyOnCreateDatabaseConnection).toHaveBeenCalledTimes(numDbInstances);

        // We should have two active database connection
        expect(numDbInstances).toEqual(2);
    });

    it('=> should have records of Servers set in the servers table of the default database', async () => {
        expect.assertions(3);

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeDefined();

        const serversRecords = await defaultDB!.collections.get(SERVERS).query().fetch() as IServers[];
        expect(serversRecords).toBeDefined();

        // We have call the 'DatabaseManager.setActiveServerDatabase' twice in the previous test case; that implies that we have 2 records in the 'servers' table
        expect(serversRecords.length).toEqual(2);
    });

    it('=> should delete appv1 server from the servers table of Default database', async () => {
        expect.assertions(3);

        // Removing database for appv1 connection
        const isAppV1Removed = await DatabaseManager.deleteDatabase('https://appv1.mattermost.com');
        expect(isAppV1Removed).toBe(true);

        // Verifying in the database to confirm if its record was deleted
        const defaultDB = await DatabaseManager.getDefaultDatabase();
        const serversRecords = await defaultDB!.collections.get(SERVERS).query().fetch() as IServers[];
        expect(serversRecords).toBeDefined();
        expect(serversRecords.length).toEqual(1);
    });

    it('=> should enforce uniqueness of connections using serverUrl as key', async () => {
        expect.assertions(2);

        // We can't have more than one connection with the same server url
        const serverUrl = 'https://appv3.mattermost.com';
        await DatabaseManager.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            databaseConnection: {
                actionsEnabled: true,
                dbName: 'community mattermost',
                dbType: DatabaseType.SERVER,
                serverUrl,
            },
        });

        await DatabaseManager.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            databaseConnection: {
                actionsEnabled: true,
                dbName: 'duplicate server',
                dbType: DatabaseType.SERVER,
                serverUrl,
            },
        });

        const defaultDB = await DatabaseManager.getDefaultDatabase();

        const allServers = defaultDB && await defaultDB.collections.get(SERVERS).query().fetch() as IServers[];

        // We should be having some servers returned here
        expect(allServers?.length).toBeGreaterThan(0);

        const occurrences = allServers?.map((server) => server.url).reduce((acc, cur) => (cur === serverUrl ? acc + 1 : acc), 0);

        // We should only have one occurence of the 'https://appv3.mattermost.com' url
        expect(occurrences).toEqual(1);
    });
});
