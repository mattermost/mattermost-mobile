// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import {Class} from '@nozbe/watermelondb/utils/common';
import {Platform, DeviceEventEmitter, DeviceEventEmitterStatic} from 'react-native';
import {FileSystem} from 'react-native-unimodules';

import {MIGRATION_EVENTS, MM_TABLES} from '@constants/database';
import type {DefaultNewServer, MigrationEvents, MMDatabaseConnection} from '@typings/database/database';
import Server from '@typings/database/servers';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';

import DefaultMigration from '../default/migration';
import {App, Global, Servers} from '../default/models';
import {defaultSchema} from '../default/schema';
import ServerMigration from '../server/migration';
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
} from '../server/models';
import {serverSchema} from '../server/schema';

// TODO [x] : Initialize a db connection with default schema
// TODO [x] : handle migration
// TODO [x] : create server db
// TODO [x] : set active db

// TODO [] : delete server db and removes its record in default db
// TODO [] : factory reset - wipe every data on the phone

// TODO [] : retrieve all dbs or a subset via the url and it then returns db instances
// TODO [] : how do we track down if migration succeeded on all the instances of 'server db'

// TODO : should we sanitize the display name of databases ?

type Models = Class<Model>[]

export enum DatabaseType {
    DEFAULT,
    SERVER
}

class DatabaseManager {
    private activeDatabase: Database | undefined;

    private readonly defaultModels: Models;

    private readonly serverModels: Models;
    private emitter: DeviceEventEmitterStatic;

    constructor() {
        // Creates an event emitter
        this.emitter = new DeviceEventEmitter();
        this.defaultModels = [App, Global, Servers];
        this.serverModels = [Channel, ChannelInfo, ChannelMembership, CustomEmoji, Draft, File, Group, GroupMembership,
            GroupsInChannel, GroupsInTeam, MyChannel, MyChannelSettings, MyTeam, Post, PostMetadata, PostsInChannel,
            PostsInThread, Preference, Reaction, Role, SlashCommand, System, Team, TeamChannelHistory, TeamMembership,
            TeamSearchHistory, TermsOfService, User];
    }

    /**
     * Creates database connection and registers the new connection into the default database
     * @param {MMDatabaseConnection} databaseConnection
     * @returns {Database}
     */
    createDatabaseConnection = (databaseConnection: MMDatabaseConnection): Database => {
        const {
            actionsEnabled = true,
            dbName = 'default',
            dbType = DatabaseType.DEFAULT,
            serverUrl = undefined,
        } = databaseConnection;

        const databaseName = dbType === DatabaseType.DEFAULT ? 'default' : dbName;

        const dbFilePath = this.getDBDirectory({dbName: databaseName});
        const migrations = dbType === DatabaseType.DEFAULT ? DefaultMigration : ServerMigration;
        const modelClasses = dbType === DatabaseType.DEFAULT ? this.defaultModels : this.serverModels;
        const schema = dbType === DatabaseType.DEFAULT ? defaultSchema : serverSchema;

        const adapter = new SQLiteAdapter({
            dbName: dbFilePath,
            migrationEvents: this.buildMigrationCallbacks({dbName: databaseName}),
            migrations,
            schema,
        });

        const database = new Database({adapter, actionsEnabled, modelClasses});
        console.log(`Created ${dbName} database =>>`, database);

        // Registers the new server connection into the DEFAULT database
        if (serverUrl) {
            this.registerNewServer({dbFilePath, displayName: dbName, serverUrl});
        }
        return database;
    };

    /**
     * From the displayName and serverUrl, we set the new active server database.  For example, on switching to another
     * another server, in the component, we retrieve those values and call setActiveDatabase.
     * @param {string} displayName
     * @param {string} serverUrl
     */
    setActiveDatabase = ({displayName, serverUrl}: { displayName: string, serverUrl: string }) => {
        this.activeDatabase = this.createDatabaseConnection({
            actionsEnabled: true,
            dbName: displayName,
            dbType: DatabaseType.SERVER,
            serverUrl,
        });
    };

    /**
     * The DatabaseManager should be the only one setting the active database.  Hence, we have made the activeDatabase property private.
     * Use this getter method to retrieve the active database if it has been set in your code.
     * @returns { Database | undefined}
     */
     getActiveDatabase = () : Database | undefined => {
         return this.activeDatabase;
     }

    /**
     * Returns the default database.
     * @returns {Database} default database
     */
    getDefaultDatabase = (): Database => {
        return this.createDatabaseConnection({dbName: 'default'});
    };

    private registerNewServer = async ({
        dbFilePath,
        displayName,
        serverUrl,
    }: DefaultNewServer) => {
        const defaultDatabase = this.getDefaultDatabase();
        const serversCollection = defaultDatabase.collections.get(MM_TABLES.DEFAULT.SERVERS);

        await defaultDatabase.action(async () => {
            const newServer = serversCollection.create((server: Server) => {
                server.dbPath = dbFilePath;
                server.displayName = displayName;
                server.mentionCount = 0;
                server.unreadCount = 0;
                server.url = serverUrl;
            });
            console.log(newServer);
        });
    };

    /**
     * Creates a set of callbacks that can be used to monitor the migration process.
     * For example, we can display a processing spinner while we have a migration going on. Moreover, we can also
     * hook into those callbacks to assess how many of our servers successfully completed their migration.
     * @param {string} dbName
     * @returns {MigrationEvents}
     */
    private buildMigrationCallbacks = ({dbName}: { dbName: string }) => {
        const migrationEvents: MigrationEvents = {
            onSuccess: () => {
                return this.emitter.emit(MIGRATION_EVENTS.MIGRATION_SUCCESS, {dbName});
            },
            onStarted: () => {
                return this.emitter.emit(MIGRATION_EVENTS.MIGRATION_STARTED, {dbName});
            },
            onFailure: (error) => {
                return this.emitter.emit(MIGRATION_EVENTS.MIGRATION_ERROR, {dbName, error});
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
     * @returns {string}
     */
    private getDBDirectory = ({dbName}: { dbName: string }): string => {
        if (Platform.OS === 'ios') {
            return `${getIOSAppGroupDetails().appGroupDatabase}/${dbName}.db`;
        }
        return FileSystem.documentDirectory + `/databases/${dbName}.db`;
    };

    deleteDatabase = async ({dbName, serverUrl}: { dbName: string, serverUrl?: string }) => {
        if (serverUrl) {
            // TODO :  if we have a server url then we retrieve the display name from the default database and then we delete it
        }
        try {
            const filePath = this.getDBDirectory({dbName});
            const info = await FileSystem.getInfoAsync(filePath);

            console.log('File info ', info);

            // deleting the .db file directly at the filePath
            const isDBFileDeleted = await FileSystem.deleteAsync(filePath, {idempotent: true});

            console.log(`Database deleted at ${filePath}`, isDBFileDeleted);
        } catch (e) {
            console.log('An error occured while attempting to delete the .db file', e);
        }
        return null;
    };

    getAllServerDatabases = (serverUrls: string []) => {
        // sentence.includes(word)
        // FIXME : complete this method
        // Retrieve all server records from the default db
        const defaultDatabase = this.getDefaultDatabase();
        const serverCollections = defaultDatabase.collections.get(MM_TABLES.DEFAULT.SERVERS);

        const servers = serverCollections.query().fetch();

        console.log('all servers ', servers);

        return null;
    };
}

export default new DatabaseManager();
