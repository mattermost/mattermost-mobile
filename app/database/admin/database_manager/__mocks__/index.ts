// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q} from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import {Class} from '@nozbe/watermelondb/utils/common';

import {MM_TABLES} from '@constants/database';
import type {DBInstance, DefaultNewServer, MMDatabaseConnection} from '@typings/database/database';
import IServers from '@typings/database/servers';

import DefaultMigration from '../../../default/migration';
import {App, Global, Servers} from '../../../default/models';
import {defaultSchema} from '../../../default/schema';
import ServerMigration from '../../../server/migration';
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
} from '../../../server/models';
import {serverSchema} from '../../../server/schema';

const {SERVERS} = MM_TABLES.DEFAULT;

type Models = Class<Model>[]

// The elements needed to create a new connection
type DatabaseConnection = {
    databaseConnection: MMDatabaseConnection, shouldAddToDefaultDatabase
        : boolean
}

// The elements required to switch to another active server database
type ActiveServerDatabase = { displayName: string, serverUrl: string }

// The only two types of databases in the app
export enum DatabaseType {
    DEFAULT,
    SERVER
}

class DatabaseManager {
    private activeDatabase: DBInstance;
    private defaultDatabase: DBInstance;
    private readonly defaultModels: Models;
    private readonly iOSAppGroupDatabase: string | null;
    private readonly androidFilesDirectory: string | null;
    private readonly serverModels: Models;

    constructor() {
        this.defaultModels = [App, Global, Servers];
        this.serverModels = [Channel, ChannelInfo, ChannelMembership, CustomEmoji, Draft, File, Group, GroupMembership,
            GroupsInChannel, GroupsInTeam, MyChannel, MyChannelSettings, MyTeam, Post, PostMetadata, PostsInChannel,
            PostsInThread, Preference, Reaction, Role, SlashCommand, System, Team, TeamChannelHistory, TeamMembership,
            TeamSearchHistory, TermsOfService, User];

        this.iOSAppGroupDatabase = null;
        this.androidFilesDirectory = null;
    }

    /**
     * createDatabaseConnection: Creates database connection and registers the new connection into the default database.  However,
     * if a database connection could not be created, it will return undefined.
     * @param {MMDatabaseConnection} databaseConnection
     * @param {boolean} shouldAddToDefaultDatabase
     *
     * @returns {Promise<DBInstance>}
     */
    createDatabaseConnection = async ({
        databaseConnection,
        shouldAddToDefaultDatabase = true,
    }: DatabaseConnection): Promise<DBInstance> => {
        const {
            actionsEnabled = true,
            dbName = 'default',
            dbType = DatabaseType.DEFAULT,
            serverUrl = undefined,
        } = databaseConnection;

        try {
            const databaseName = dbType === DatabaseType.DEFAULT ? 'default' : dbName;

            // const databaseFilePath = this.getDatabaseDirectory(databaseName);
            const migrations = dbType === DatabaseType.DEFAULT ? DefaultMigration : ServerMigration;
            const modelClasses = dbType === DatabaseType.DEFAULT ? this.defaultModels : this.serverModels;
            const schema = dbType === DatabaseType.DEFAULT ? defaultSchema : serverSchema;

            const adapter = new LokiJSAdapter({
                dbName: databaseName,
                migrations,
                schema,
            });

            // Registers the new server connection into the DEFAULT database
            if (serverUrl && shouldAddToDefaultDatabase) {
                await this.addServerToDefaultDatabase({databaseFilePath: databaseName, displayName: dbName, serverUrl});
            }
            return new Database({adapter, actionsEnabled, modelClasses});
        } catch (e) {
            // console.log(e);
        }

        return undefined;
    };

    /**
     * setActiveServerDatabase: Set the new active server database.  The serverUrl is used to ensure that we do not duplicate entries in the default database.
     * This method should be called when switching to another server.
     * @param {string} displayName
     * @param {string} serverUrl
     * @returns {Promise<void>}
     */
    setActiveServerDatabase = async ({displayName, serverUrl}: ActiveServerDatabase) => {
        const isServerPresent = await this.isServerPresent(serverUrl);

        this.activeDatabase = await this.createDatabaseConnection({
            databaseConnection: {
                actionsEnabled: true,
                dbName: displayName,
                dbType: DatabaseType.SERVER,
                serverUrl,
            },
            shouldAddToDefaultDatabase: Boolean(!isServerPresent),
        });
    };

    /**
     * isServerPresent : Confirms if the current serverUrl does not already exist in the database
     * @param {String} serverUrl
     * @returns {Promise<boolean>}
     */
    isServerPresent = async (serverUrl: String) => {
        const allServers = await this.getAllServers();
        const existingServer = allServers?.filter((server) => {
            return server.url === serverUrl;
        });
        return existingServer && existingServer.length > 0;
    }

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
     * retrieveDatabaseInstances: Using an array of server URLs, this method creates a database connection for each URL
     * and return them to the caller.
     *
     * @param {string[]} serverUrls
     * @returns {Promise<{url: string, dbInstance: DBInstance}[] | null>}
     */
    retrieveDatabaseInstances = async (serverUrls?: string[]): Promise<{ url: string, dbInstance: DBInstance }[] | null> => {
        if (serverUrls?.length) {
            // Retrieve all server records from the default db
            const allServers = await this.getAllServers();

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

                    // Since we are retrieving existing URL ( and so database connections ) from the 'DEFAULT' database, shouldAddToDefaultDatabase is set to false
                    const dbInstance = await this.createDatabaseConnection({
                        databaseConnection,
                        shouldAddToDefaultDatabase: false,
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
     * deleteDatabase: Removes the *.db file from the App-Group directory for iOS or the files directory on Android.
     * Also, it removes its entry in the 'servers' table from the DEFAULT database
     * @param  {string} serverUrl
     * @returns {Promise<boolean>}
     */
    deleteDatabase = async (serverUrl: string): Promise<boolean> => {
        try {
            const defaultDB = await this.getDefaultDatabase();
            let server: IServers;

            if (defaultDB) {
                const serversRecords = await defaultDB.collections.get(SERVERS).query(Q.where('url', serverUrl)).fetch() as IServers[];
                server = serversRecords?.[0] ?? undefined;

                if (server) {
                    // Perform a delete operation for this server record on the 'servers' table in default database
                    await defaultDB.action(async () => {
                        await server.destroyPermanently();
                    });

                    return true;
                }
                return false;
            }
            return false;
        } catch (e) {
            // console.log('An error occurred while trying to delete database with name ', databaseName);
            return false;
        }
    };

    /**
     * getAllServers : Retrieves all the servers registered in the default database
     * @returns {Promise<undefined | Servers[]>}
     */
    private getAllServers = async () => {
        // Retrieve all server records from the default db
        const defaultDatabase = await this.getDefaultDatabase();
        const allServers = defaultDatabase && await defaultDatabase.collections.get(MM_TABLES.DEFAULT.SERVERS).query().fetch() as IServers[];
        return allServers;
    };

    /**
     * setDefaultDatabase : Sets the default database.
     * @returns {Promise<DBInstance>}
     */
    private setDefaultDatabase = async (): Promise<DBInstance> => {
        this.defaultDatabase = await this.createDatabaseConnection({
            databaseConnection: {dbName: 'default'},
            shouldAddToDefaultDatabase: false,
        });
        return this.defaultDatabase;
    };

    /**
     * addServerToDefaultDatabase: Adds a record into the 'default' database - into the 'servers' table - for this new server connection
     * @param {string} databaseFilePath
     * @param {string} displayName
     * @param {string} serverUrl
     * @returns {Promise<void>}
     */
    private addServerToDefaultDatabase = async ({
        databaseFilePath,
        displayName,
        serverUrl,
    }: DefaultNewServer) => {
        try {
            const defaultDatabase = await this.getDefaultDatabase();
            const isServerPresent = await this.isServerPresent(serverUrl);

            if (defaultDatabase && !isServerPresent) {
                await defaultDatabase.action(async () => {
                    const serversCollection = defaultDatabase.collections.get('servers');
                    await serversCollection.create((server: IServers) => {
                        server.dbPath = databaseFilePath;
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
}

export default new DatabaseManager();
