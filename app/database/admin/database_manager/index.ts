// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MIGRATION_EVENTS, MM_TABLES} from '@constants/database';
import {Database, Model, Q} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import {Class} from '@nozbe/watermelondb/utils/common';
import type {DefaultNewServer, MigrationEvents, MMDatabaseConnection} from '@typings/database/database';
import IServers from '@typings/database/servers';
import {deleteIOSDatabase, getIOSAppGroupDetails} from '@utils/mattermost_managed';
import {DeviceEventEmitter, Platform} from 'react-native';
import {FileSystem} from 'react-native-unimodules';

import DefaultMigration from '../../default/migration';
import {App, Global, Servers} from '../../default/models';
import {defaultSchema} from '../../default/schema';
import ServerMigration from '../../server/migration';
import {
    Channel,
    ChannelInfo,
    ChannelMembership,
    CustomEmoji,
    Draft,
    File,
    Group,
    GroupMembership,
    GroupsInChannel,
    GroupsInTeam,
    MyChannel,
    MyChannelSettings,
    MyTeam,
    Post,
    PostMetadata,
    PostsInChannel,
    PostsInThread,
    Preference,
    Reaction,
    Role,
    SlashCommand,
    System,
    Team,
    TeamChannelHistory,
    TeamMembership,
    TeamSearchHistory,
    TermsOfService,
    User,
} from '../../server/models';
import {serverSchema} from '../../server/schema';

// TODO [x] : Initialize a db connection with default schema
// TODO [x] : handle migration
// TODO [x] : create server db
// TODO [x] : set active db
// TODO [x] : delete server db and removes its record in default db
// TODO [X] : retrieve all dbs or a subset via the url and it then returns db instances

// TODO [] : factory reset - wipe every data on the phone

// TODO [] : how do we track down if migration succeeded on all the instances of 'server db'

// TODO :  review all private/public methods/fields

type Models = Class<Model>[]

// A database connection is of type 'Database'; unless it fails to be initialize and in which case it becomes 'undefined'
type DBInstance = Database | undefined

// The elements needed to create a new connection
type DatabaseConnection = { databaseConnection: MMDatabaseConnection, shouldAddToDefaultDB: boolean }

// The elements required to switch to another active server database
type ActiveServerDatabase = { displayName: string, serverUrl: string }

// The elements required to delete a database on iOS
type RemoveDatabaseIOS = { databaseName?: string, shouldRemoveDirectory?: boolean }

// The only two types of databases in the app
export enum DatabaseType {
    DEFAULT,
    SERVER
}

class DatabaseManager {
    private activeDatabase: DBInstance;
    private defaultDatabase: DBInstance;
    private readonly defaultModels: Models;
    private readonly iOSAppGroupDatabase: string | undefined;
    private readonly serverModels: Models;

    constructor() {
        this.defaultModels = [App, Global, Servers];
        this.serverModels = [Channel, ChannelInfo, ChannelMembership, CustomEmoji, Draft, File, Group, GroupMembership,
            GroupsInChannel, GroupsInTeam, MyChannel, MyChannelSettings, MyTeam, Post, PostMetadata, PostsInChannel,
            PostsInThread, Preference, Reaction, Role, SlashCommand, System, Team, TeamChannelHistory, TeamMembership,
            TeamSearchHistory, TermsOfService, User];

        if (Platform.OS === 'ios') {
            this.iOSAppGroupDatabase = getIOSAppGroupDetails().appGroupDatabase;
        }
    }

    /**
     * createDatabaseConnection: Adds/Creates database connection and registers the new connection into the default database.  However,
     * if a database connection could not be created, it will return undefined.
     * @param {MMDatabaseConnection} databaseConnection
     * @param {boolean} shouldAddToDefaultDB
     * @returns {Promise<DBInstance>}
     */
    createDatabaseConnection = async ({
        databaseConnection,
        shouldAddToDefaultDB = true,
    }: DatabaseConnection): Promise<DBInstance> => {
        const {
            actionsEnabled = true,
            dbName = 'default',
            dbType = DatabaseType.DEFAULT,
            serverUrl = undefined,
        } = databaseConnection;

        try {
            const databaseName = dbType === DatabaseType.DEFAULT ? 'default' : dbName;

            const dbFilePath = await this.getDBDirectory(databaseName);

            const migrations = dbType === DatabaseType.DEFAULT ? DefaultMigration : ServerMigration;
            const modelClasses = dbType === DatabaseType.DEFAULT ? this.defaultModels : this.serverModels;
            const schema = dbType === DatabaseType.DEFAULT ? defaultSchema : serverSchema;

            const adapter = new SQLiteAdapter({
                dbName: dbFilePath,
                migrationEvents: this.buildMigrationCallbacks(databaseName),
                migrations,
                schema,
            });

            // Registers the new server connection into the DEFAULT database
            if (serverUrl && shouldAddToDefaultDB) {
                await this.addServerToDefaultDB({dbFilePath, displayName: dbName, serverUrl});
            }

            return new Database({adapter, actionsEnabled, modelClasses});
        } catch (e) {
            // console.log(e);
        }

        return undefined;
    };

    /**
     * setActiveServerDatabase: From the displayName and serverUrl, we set the new active server database.  For example, on switching to another
     * another server, on a screen/component/list, we retrieve those values and call setActiveServerDatabase.
     * @param {string} displayName
     * @param {string} serverUrl
     * @returns {Promise<void>}
     */
    setActiveServerDatabase = async ({displayName, serverUrl}: ActiveServerDatabase) => {
        this.activeDatabase = await this.createDatabaseConnection({
            databaseConnection: {
                actionsEnabled: true,
                dbName: displayName,
                dbType: DatabaseType.SERVER,
                serverUrl,
            },
            shouldAddToDefaultDB: true,
        });
    };

    /**
     * getActiveServerDatabase: The DatabaseManager should be the only one setting the active database.  Hence, we have made the activeDatabase property private.
     * Use this getter method to retrieve the active database if it has been set in your code.
     * @returns {DBInstance}
     */
    getActiveServerDatabase = (): DBInstance => {
        return this.activeDatabase;
    };

    /**
     * getDefaultDatabase : Returns the default database.
     * @returns {Database} default database
     */
    getDefaultDatabase = async (): Promise<DBInstance> => {
        if (!this.defaultDatabase) {
            await this.setDefaultDatabase();
        }
        return this.defaultDatabase;
    };

    /**
     * retrieveServerDBInstances: Returns database instances which are created from the provided server urls.
     * @param {string[]} serverUrls
     * @returns {Promise<null | {dbInstance:  | undefined, url: string}[]>}
     */
    retrieveServerDBInstances = async (serverUrls?: string[]) => {
        // Retrieve all server records from the default db
        const defaultDatabase = await this.getDefaultDatabase();
        const allServers = defaultDatabase && await defaultDatabase.collections.get(MM_TABLES.DEFAULT.SERVERS).query().fetch() as IServers[];

        if (serverUrls?.length) {
            // Filter only those servers that are present in the serverUrls array
            const servers = allServers!.filter((server: IServers) => {
                return serverUrls.includes(server.url);
            });

            // Creates server database instances
            if (servers.length) {
                const databasePromises = servers.map(async (server: IServers) => {
                    const {displayName, url} = server;
                    const databaseConnection = {
                        actionsEnabled: true,
                        dbName: displayName,
                        dbType: DatabaseType.SERVER,
                        serverUrl: url,
                    };

                    const dbInstance = await this.createDatabaseConnection({
                        databaseConnection,
                        shouldAddToDefaultDB: false,
                    });

                    return {url, dbInstance};
                });

                const databaseInstances = await Promise.all(databasePromises);
                return databaseInstances;
            }
            return null;
        }
        return null;
    };

    /**
     * deleteDBFileOnIOS: Used only on iOS platform to delete a database by its name
     * @param {string} databaseName
     */
    deleteDBFileOnIOS = ({databaseName}: RemoveDatabaseIOS) => {
        try {
            deleteIOSDatabase({databaseName});
        } catch (e) {
            // console.log('An error             // console.log('An error occurred while trying to delete database with name ', databaseName); while trying to delete database with name ', databaseName);
        }
    };

    /**
     * factoryResetOnIOS: Deletes the database directory on iOS
     * @param {boolean} shouldRemoveDirectory
     */
    factoryResetOnIOS = ({shouldRemoveDirectory}: RemoveDatabaseIOS) => {
        if (shouldRemoveDirectory) {
            deleteIOSDatabase({shouldRemoveDirectory: true});
        }
    };

    /**
     * deleteDBFileOnAndroid: Used only on iOS platform to delete a database by its name
     * @param {string} databaseName
     */
    deleteDBFileOnAndroid = async ({databaseName}: RemoveDatabaseIOS) => {
        try {
            const androidFilesDir = `${FileSystem.documentDirectory}databases/`;
            const databaseFile = `${androidFilesDir}${databaseName}.db`;
            const databaseJournal = `${androidFilesDir}${databaseName}.db-journal`;

            await FileSystem.deleteAsync(databaseFile);
            await FileSystem.deleteAsync(databaseJournal);
        } catch (e) {
            // console.log('An error occurred while trying to delete database with name ', databaseName);
        }
    };

    /**
     * factoryResetOnAndroid: Deletes the database directory on iOS
     * @param {boolean} shouldRemoveDirectory
     */
    factoryResetOnAndroid = async ({shouldRemoveDirectory}: RemoveDatabaseIOS) => {
        if (shouldRemoveDirectory) {
            try {
                const androidFilesDir = `${FileSystem.documentDirectory}databases/`;
                await FileSystem.deleteAsync(androidFilesDir);
            } catch (e) {
                // console.log('An error occurred while trying to delete the databases directory on Android);
            }
        }
    };

    /**
     * removeServerFromDefaultDB : Removes a server record by its url value from the Default database
     * @param {string} serverUrl
     * @returns {Promise<void>}
     */
    removeServerFromDefaultDB = async ({serverUrl}: { serverUrl: string }) => {
        try {
            // Query the servers table to fetch the record with the above displayName
            const defaultDB = await this.getDefaultDatabase();
            if (defaultDB) {
                const serversRecords = await defaultDB.collections.get('servers').query(Q.where('url', serverUrl)).fetch() as IServers[];
                if (serversRecords.length) {
                    const targetServer = serversRecords[0];

                    // Perform a delete operation on that record; since there is no sync with backend, we will delete the record permanently
                    await defaultDB.action(async () => {
                        await targetServer.destroyPermanently();
                    });

                    if (Platform.OS === 'ios') {
                        // Removes the *.db file from the App-Group directory
                        this.deleteDBFileOnIOS({databaseName: targetServer.displayName});
                    } else {
                        // TODO : Perform a similar operation on Android
                    }
                }
            }
        } catch (e) {
            // console.error('An error occurred while deleting server record ', e);
        }
    };

    /**
     * setDefaultDatabase : Sets the default database.
     * @returns {Promise<DBInstance>}
     */
    private setDefaultDatabase = async (): Promise<DBInstance> => {
        this.defaultDatabase = await this.createDatabaseConnection({
            databaseConnection: {dbName: 'default'},
            shouldAddToDefaultDB: false,
        });
        return this.defaultDatabase;
    };

    /**
     * addServerToDefaultDB: Adds a record into the 'default' database - into the 'servers' table - for this new server connection
     * @param {string} dbFilePath
     * @param {string} displayName
     * @param {string} serverUrl
     * @returns {Promise<void>}
     */
    private addServerToDefaultDB = async ({
        dbFilePath,
        displayName,
        serverUrl,
    }: DefaultNewServer) => {
        try {
            const defaultDatabase = await this.getDefaultDatabase();

            if (defaultDatabase) {
                await defaultDatabase.action(async () => {
                    const serversCollection = defaultDatabase.collections.get('servers');
                    await serversCollection.create((server: IServers) => {
                        server.dbPath = dbFilePath;
                        server.displayName = displayName;
                        server.mentionCount = 0;
                        server.unreadCount = 0;
                        server.url = serverUrl;
                    });
                });
            }
        } catch (e) {
            // console.log({catchError: e});
        }
    };

    /**
     * buildMigrationCallbacks: Creates a set of callbacks that can be used to monitor the migration process.
     * For example, we can display a processing spinner while we have a migration going on. Moreover, we can also
     * hook into those callbacks to assess how many of our servers successfully completed their migration.
     * @param {string} dbName
     * @returns {MigrationEvents}
     */
    private buildMigrationCallbacks = (dbName: string) => {
        const migrationEvents: MigrationEvents = {
            onSuccess: () => {
                return DeviceEventEmitter.emit(MIGRATION_EVENTS.MIGRATION_SUCCESS, {dbName});
            },
            onStarted: () => {
                return DeviceEventEmitter.emit(MIGRATION_EVENTS.MIGRATION_STARTED, {dbName});
            },
            onFailure: (error) => {
                return DeviceEventEmitter.emit(MIGRATION_EVENTS.MIGRATION_ERROR, {dbName, error});
            },
        };

        return migrationEvents;
    };

    /**
     * Retrieves the AppGroup shared directory on iOS or the DocumentsDirectory for Android and then places the
     * database file under the 'databases/{dbName}.db' directory. Examples of such directory are:
     * iOS Simulator : appGroup => /Users/{username}/Library/Developer/CoreSimulator/Devices/DA6F1C73/data/Containers/Shared/AppGroup/ACA65327"}
     * Android Device: file:///data/user/0/com.mattermost.rnbeta/files/
     *
     * @param {string} dbName
     * @returns {Promise<string>}
     */
    private getDBDirectory = async (dbName: string): Promise<string> => {
        if (Platform.OS === 'ios') {
            return `${this.iOSAppGroupDatabase}/${dbName}.db`;
        }

        return `${FileSystem.documentDirectory}${dbName}.db`;
    };
}

export default new DatabaseManager();
