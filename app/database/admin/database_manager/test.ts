// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {DBInstance} from '@typings/database/database';
import DatabaseManager, {DatabaseType} from './index';

jest.mock('./index');

// TODO : clear db/reset ???

describe('*** Database Manager tests ***', () => {
    it(' => should return a default database', async () => {
        expect.assertions(2);

        const spyOnAddServerToDefaultDatabase = jest.spyOn(DatabaseManager, 'addServerToDefaultDatabase');

        const defaultDB = await DatabaseManager.getDefaultDatabase();
        expect(defaultDB).toBeInstanceOf(Database);
        expect(spyOnAddServerToDefaultDatabase).not.toHaveBeenCalledTimes(1);
    });

    it('=> should create a new server connection', async () => {
        expect.assertions(2);

        const spyOnAddServerToDefaultDatabase = jest.spyOn(DatabaseManager, 'addServerToDefaultDatabase');

        const connection1 = await DatabaseManager.createDatabaseConnection({
            shouldAddToDefaultDatabase: true,
            databaseConnection: {
                actionsEnabled: true,
                dbName: 'community mattermost',
                dbType: DatabaseType.SERVER,
                serverUrl: 'https://comm4.mattermost.com',
            },
        });

        expect(connection1).toBeInstanceOf(Database);
        expect(spyOnAddServerToDefaultDatabase).toHaveBeenCalledTimes(1);
    });

    it('=> should switch between active server connections', async () => {
        expect.assertions(8);
        let activeServer: DBInstance;
        activeServer = await DatabaseManager.getActiveServerDatabase();

        // as we haven't set an active server yet, we should be getting undefined in the activeServer variable
        expect(activeServer).toBeUndefined();

        const setActiveServer = async ({displayName, serverUrl}:{displayName: string, serverUrl: string}) => {
            // now we set the active database
            const server = await DatabaseManager.setActiveServerDatabase({displayName, serverUrl});

            // setActiveServer should be undefined as the method  does not actually return anything
            expect(server).toBeUndefined();
        };

        await setActiveServer({displayName: 'community mattermost', serverUrl: 'https://comm4.mattermost.com'});

        // let's verify if we now have a value for activeServer
        activeServer = await DatabaseManager.getActiveServerDatabase();
        expect(activeServer).toBeDefined();
        const currentDBName = activeServer!.adapter.underlyingAdapter._dbName;
        expect(currentDBName).toStrictEqual('community mattermost');

        // spice things up; we'll set a new server and verify if the value of activeServer changes
        await setActiveServer({displayName: 'appv2', serverUrl: 'https://appv2.mattermost.com'});
        activeServer = await DatabaseManager.getActiveServerDatabase();
        expect(activeServer).toBeDefined();
        const newDBName = activeServer!.adapter.underlyingAdapter._dbName;
        expect(newDBName).not.toStrictEqual('community mattermost');
        expect(newDBName).toStrictEqual('appv2');
    });

    it('=> should retrieve all database instances matching serverUrls parameter', async () => {
        expect.assertions(3);

        const spyOnCreateDatabaseConnection = jest.spyOn(DatabaseManager, 'createDatabaseConnection');

        const dbInstances = await DatabaseManager.retrieveDatabaseInstances([
            'https://xunity2.mattermost.com',
            'https://appv2.mattermost.com',
            'https://comm4.mattermost.com',
        ]);

        expect(dbInstances).toBeTruthy();
        const numDbInstances = dbInstances && dbInstances.length ? dbInstances.length : 0;
        expect(spyOnCreateDatabaseConnection).toHaveBeenCalledTimes(numDbInstances);
        expect(numDbInstances).toEqual(2);
    });
});

// FIXME :  see if records are being added to the servers table for each new connection
