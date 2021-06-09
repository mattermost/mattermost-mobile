// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {DatabaseType} from '@typings/database/enums';
import IGlobal from '@typings/database/global';
import IServers from '@typings/database/servers';

import DatabaseManager from '@database/manager';

jest.mock('@database/manager');

const {GLOBAL, SERVERS} = MM_TABLES.DEFAULT;
const RECENTLY_VIEWED_SERVERS = 'RECENTLY_VIEWED_SERVERS';

// NOTE :  On the mock Database Manager, we cannot test for :
// 1. Android/iOS file path
// 2. Deletion of the 'databases' folder on those two platforms

/* eslint-disable  @typescript-eslint/no-explicit-any */

describe('*** Database Manager tests ***', () => {
    let databaseManagerClient: DatabaseManager | null;

    beforeEach(() => {
        databaseManagerClient = new DatabaseManager();
    });

    afterEach(() => {
        databaseManagerClient = null;
    });

    const createTwoConnections = async () => {
        await databaseManagerClient!.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            configs: {
                actionsEnabled: true,
                dbName: 'connection1',
                dbType: DatabaseType.SERVER,
                serverUrl: 'https://appv1.mattermost.com',
            },
        });
        await databaseManagerClient!.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            configs: {
                actionsEnabled: true,
                dbName: 'connection2',
                dbType: DatabaseType.SERVER,
                serverUrl: 'https://appv2.mattermost.com',
            },
        });
    };

    it('=> should return a default database', async () => {
        expect.assertions(2);

        const spyOnAddServerToDefaultDatabase = jest.spyOn(databaseManagerClient as any, 'addServerToDefaultDatabase');

        const defaultDB = await databaseManagerClient!.getDefaultDatabase();

        expect(defaultDB).toBeInstanceOf(Database);
        expect(spyOnAddServerToDefaultDatabase).not.toHaveBeenCalledTimes(1);
    });

    it('=> should create a new server connection', async () => {
        expect.assertions(2);

        const spyOnAddServerToDefaultDatabase = jest.spyOn(databaseManagerClient as any, 'addServerToDefaultDatabase');

        const connection1 = await databaseManagerClient!.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            configs: {
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
        expect.assertions(6);
        let adapter;

        const activeServerA = await databaseManagerClient!.getActiveServerDatabase();

        // as we haven't set an active server yet, we should be getting undefined in the activeServer variable
        expect(activeServerA).toBeUndefined();

        const setActiveServer = async (serverUrl: string) => {
            // now we set the active database
            await databaseManagerClient!.setActiveServerDatabase(serverUrl);
        };

        await setActiveServer('https://appv1.mattermost.com');

        // let's verify if we now have a value for activeServer
        const activeServerB = await databaseManagerClient!.getActiveServerDatabase();
        expect(activeServerB).toBeDefined();

        adapter = activeServerB!.adapter as any;
        const currentDBName = adapter.underlyingAdapter._dbName;
        expect(currentDBName).toStrictEqual('appv1.mattermost.com');

        // spice things up; we'll set a new server and verify if the value of activeServer changes
        await setActiveServer('https://appv2.mattermost.com');
        const activeServerC = await databaseManagerClient!.getActiveServerDatabase();
        expect(activeServerC).toBeDefined();

        adapter = activeServerC!.adapter as any;
        const newDBName = adapter.underlyingAdapter._dbName;
        expect(newDBName).toStrictEqual('appv2.mattermost.com');

        const defaultDatabase = await databaseManagerClient!.getDefaultDatabase();
        const records = await defaultDatabase!.collections.get(MM_TABLES.DEFAULT.GLOBAL).query(Q.where('name', 'RECENTLY_VIEWED_SERVERS')).fetch() as IGlobal[];
        const recentlyViewedServers = records?.[0]?.value;
        expect(recentlyViewedServers?.length).toBe(2);
    });

    it('=> should retrieve all database instances matching serverUrls parameter', async () => {
        expect.assertions(3);

        await createTwoConnections();

        const spyOnCreateDatabaseConnection = jest.spyOn(databaseManagerClient!, 'createDatabaseConnection');

        const dbInstances = await databaseManagerClient!.retrieveDatabaseInstances([
            'https://xunity2.mattermost.com',
            'https://appv2.mattermost.com',
            'https://appv1.mattermost.com',
        ]);

        expect(dbInstances).toBeTruthy();
        const numDbInstances = dbInstances?.length ?? 0;

        // The Database Manager will call the 'createDatabaseConnection' method in consequence of the number of database connection present in dbInstances array
        expect(spyOnCreateDatabaseConnection).toHaveBeenCalledTimes(numDbInstances);

        // We should have two active database connection
        expect(numDbInstances).toEqual(2);
    });

    it('=> should retrieve existing database instances matching serverUrl parameter', async () => {
        expect.assertions(2);
        await createTwoConnections();
        const spyOnRetrieveDatabaseInstances = jest.spyOn(databaseManagerClient!, 'retrieveDatabaseInstances');
        const connection = await databaseManagerClient!.getDatabaseConnection({serverUrl: 'https://appv1.mattermost.com', setAsActiveDatabase: false});
        expect(spyOnRetrieveDatabaseInstances).toHaveBeenCalledTimes(1);
        expect(connection).toBeDefined();
    });

    //todo: test the current active database together with the getDatabaseConnection method

    it('=> should have records of Servers set in the servers table of the default database', async () => {
        expect.assertions(3);

        const defaultDB = await databaseManagerClient!.getDefaultDatabase();
        expect(defaultDB).toBeDefined();
        await createTwoConnections();
        const serversRecords = await defaultDB!.collections.get(SERVERS).query().fetch() as IServers[];
        expect(serversRecords).toBeDefined();

        // We have call the 'DatabaseManager.setActiveServerDatabase' twice in the previous test case; that implies that we have 2 records in the 'servers' table
        expect(serversRecords.length).toEqual(2);
    });

    it('=> should delete appv1 server from the servers table of Default database', async () => {
        expect.assertions(3);
        await createTwoConnections();

        const defaultDatabase = await databaseManagerClient!.getDefaultDatabase();

        await databaseManagerClient?.setActiveServerDatabase('https://appv1.mattermost.com');
        await databaseManagerClient?.setActiveServerDatabase('https://appv2.mattermost.com');

        const fetchGlobalRecords = async () => {
            const initialGlobalRecords = await defaultDatabase!.collections.get(GLOBAL).query(Q.where('name', RECENTLY_VIEWED_SERVERS)).fetch() as IGlobal[];
            return initialGlobalRecords?.[0].value as string[];
        };

        const recentServers = await fetchGlobalRecords();
        expect(recentServers.length).toBe(2);

        // Removing database for appv1 connection
        const isAppV1Removed = await databaseManagerClient!.deleteDatabase('https://appv1.mattermost.com');
        expect(isAppV1Removed).toBe(true);

        // Verifying in the database to confirm if its record was deleted

        const updatedRecentServers = await fetchGlobalRecords();
        expect(updatedRecentServers.length).toBe(1);
    });

    it('=> should enforce uniqueness of connections using serverUrl as key', async () => {
        expect.assertions(2);

        // We can't have more than one connection with the same server url
        const serverUrl = 'https://appv3.mattermost.com';
        await databaseManagerClient!.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            configs: {
                actionsEnabled: true,
                dbName: 'community mattermost',
                dbType: DatabaseType.SERVER,
                serverUrl,
            },
        });

        await databaseManagerClient!.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            configs: {
                actionsEnabled: true,
                dbName: 'duplicate server',
                dbType: DatabaseType.SERVER,
                serverUrl,
            },
        });

        const defaultDB = await databaseManagerClient!.getDefaultDatabase();

        const allServers = defaultDB && await defaultDB.collections.get(SERVERS).query().fetch() as IServers[];

        // We should be having some servers returned here
        expect(allServers?.length).toBeGreaterThan(0);

        const occurrences = allServers?.map((server) => server.url).reduce((acc, cur) => (cur === serverUrl ? acc + 1 : acc), 0);

        // We should only have one occurrence of the 'https://appv3.mattermost.com' url
        expect(occurrences).toEqual(1);
    });
});
