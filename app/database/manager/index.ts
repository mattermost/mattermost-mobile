// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import logger from '@nozbe/watermelondb/utils/common/logger';
import {DeviceEventEmitter, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import FileSystem from 'react-native-fs';

import {DatabaseType, MIGRATION_EVENTS, MM_TABLES} from '@constants/database';
import AppDatabaseMigrations from '@database/migration/app';
import ServerDatabaseMigrations from '@database/migration/server';
import {InfoModel, GlobalModel, ServersModel} from '@database/models/app';
import {CategoryModel, CategoryChannelModel, ChannelModel, ChannelInfoModel, ChannelMembershipModel, CustomEmojiModel, DraftModel, FileModel,
    GroupModel, GroupChannelModel, GroupTeamModel, GroupMembershipModel, MyChannelModel, MyChannelSettingsModel, MyTeamModel,
    PostModel, PostsInChannelModel, PostsInThreadModel, PreferenceModel, ReactionModel, RoleModel,
    SystemModel, TeamModel, TeamChannelHistoryModel, TeamMembershipModel, TeamSearchHistoryModel,
    ThreadModel, ThreadParticipantModel, ThreadInTeamModel, TeamThreadsSyncModel, UserModel, ConfigModel,
} from '@database/models/server';
import AppDataOperator from '@database/operator/app_data_operator';
import ServerDataOperator from '@database/operator/server_data_operator';
import {schema as appSchema} from '@database/schema/app';
import {serverSchema} from '@database/schema/server';
import {beforeUpgrade} from '@helpers/database/upgrade';
import {getActiveServer, getServer, getServerByIdentifier} from '@queries/app/servers';
import {emptyFunction} from '@utils/general';
import {logDebug, logError} from '@utils/log';
import {deleteIOSDatabase, getIOSAppGroupDetails, renameIOSDatabase} from '@utils/mattermost_managed';
import {urlSafeBase64Encode} from '@utils/security';
import {removeProtocol} from '@utils/url';

import type {AppDatabase, CreateServerDatabaseArgs, RegisterServerDatabaseArgs, Models, ServerDatabase, ServerDatabases} from '@typings/database/database';

const {SERVERS} = MM_TABLES.APP;
const APP_DATABASE = 'app';

class DatabaseManager {
    public appDatabase?: AppDatabase;
    public serverDatabases: ServerDatabases = {};
    private readonly appModels: Models;
    private readonly databaseDirectory: string | null;
    private readonly serverModels: Models;

    constructor() {
        this.appModels = [InfoModel, GlobalModel, ServersModel];
        this.serverModels = [
            CategoryModel, CategoryChannelModel, ChannelModel, ChannelInfoModel, ChannelMembershipModel, ConfigModel, CustomEmojiModel, DraftModel, FileModel,
            GroupModel, GroupChannelModel, GroupTeamModel, GroupMembershipModel, MyChannelModel, MyChannelSettingsModel, MyTeamModel,
            PostModel, PostsInChannelModel, PostsInThreadModel, PreferenceModel, ReactionModel, RoleModel,
            SystemModel, TeamModel, TeamChannelHistoryModel, TeamMembershipModel, TeamSearchHistoryModel,
            ThreadModel, ThreadParticipantModel, ThreadInTeamModel, TeamThreadsSyncModel, UserModel,
        ];

        this.databaseDirectory = Platform.OS === 'ios' ? getIOSAppGroupDetails().appGroupDatabase : `${FileSystem.DocumentDirectoryPath}/databases/`;
    }

    /**
    * init : Retrieves all the servers registered in the default database
    * @param {string[]} serverUrls
    * @returns {Promise<void>}
    */
    public init = async (serverUrls: string[]): Promise<void> => {
        await this.createAppDatabase();
        const buildNumber = DeviceInfo.getBuildNumber();
        const versionNumber = DeviceInfo.getVersion();
        await beforeUpgrade.call(this, serverUrls, versionNumber, buildNumber);
        for await (const serverUrl of serverUrls) {
            await this.initServerDatabase(serverUrl);
        }
        this.appDatabase?.operator.handleInfo({
            info: [{
                build_number: buildNumber,
                created_at: Date.now(),
                version_number: versionNumber,
            }],
            prepareRecordsOnly: false,
        });
    };

    /**
    * createAppDatabase: Creates the App database. However,
    * if a database could not be created, it will return undefined.
    * @returns {Promise<AppDatabase|undefined>}
    */
    private createAppDatabase = async (): Promise<AppDatabase|undefined> => {
        try {
            const databaseName = APP_DATABASE;

            if (Platform.OS === 'android') {
                await FileSystem.mkdir(this.databaseDirectory!);
            }
            const databaseFilePath = this.getDatabaseFilePath(databaseName);
            const modelClasses = this.appModels;
            const schema = appSchema;

            const adapter = new SQLiteAdapter({
                dbName: databaseFilePath,
                migrationEvents: this.buildMigrationCallbacks(databaseName),
                migrations: AppDatabaseMigrations,
                jsi: true,
                schema,
            });

            const database = new Database({adapter, modelClasses});
            const operator = new AppDataOperator(database);

            this.appDatabase = {
                database,
                operator,
            };

            return this.appDatabase;
        } catch (e) {
            logError('Unable to create the App Database!!', e);
        }

        return undefined;
    };

    /**
    * createServerDatabase: Creates a server database and registers the the server in the app database. However,
    * if a database connection could not be created, it will return undefined.
    * @param {CreateServerDatabaseArgs} createServerDatabaseArgs
    *
    * @returns {Promise<ServerDatabase|undefined>}
    */
    public createServerDatabase = async ({config}: CreateServerDatabaseArgs): Promise<ServerDatabase|undefined> => {
        const {dbName, displayName, identifier, serverUrl} = config;

        if (serverUrl) {
            try {
                const databaseName = urlSafeBase64Encode(serverUrl);
                const databaseFilePath = this.getDatabaseFilePath(databaseName);
                const migrations = ServerDatabaseMigrations;
                const modelClasses = this.serverModels;
                const schema = serverSchema;

                const adapter = new SQLiteAdapter({
                    dbName: databaseFilePath,
                    migrationEvents: this.buildMigrationCallbacks(databaseName),
                    migrations,
                    jsi: true,
                    schema,
                });

                // Registers the new server connection into the DEFAULT database
                await this.addServerToAppDatabase({
                    databaseFilePath,
                    displayName: displayName || dbName,
                    identifier,
                    serverUrl,
                });

                const database = new Database({adapter, modelClasses});
                const operator = new ServerDataOperator(database);
                const serverDatabase = {database, operator};

                this.serverDatabases[serverUrl] = serverDatabase;

                return serverDatabase;
            } catch (e) {
                logError('Error initializing database', e);
            }
        }

        return undefined;
    };

    /**
    * initServerDatabase : initializes the server database.
    * @param {string} serverUrl
    * @returns {Promise<void>}
    */
    private initServerDatabase = async (serverUrl: string): Promise<void> => {
        await this.createServerDatabase({
            config: {
                dbName: serverUrl,
                dbType: DatabaseType.SERVER,
                serverUrl,
            },
        });
    };

    /**
    * addServerToAppDatabase: Adds a record in the 'app' database - into the 'servers' table - for this new server connection
    * @param {string} databaseFilePath
    * @param {string} displayName
    * @param {string} serverUrl
    * @param {string} identifier
    * @returns {Promise<void>}
    */
    private addServerToAppDatabase = async ({databaseFilePath, displayName, serverUrl, identifier = ''}: RegisterServerDatabaseArgs): Promise<void> => {
        try {
            const appDatabase = this.appDatabase?.database;
            if (appDatabase) {
                const serverModel = await getServer(serverUrl);

                if (!serverModel) {
                    await appDatabase.write(async () => {
                        const serversCollection = appDatabase.collections.get(SERVERS);
                        await serversCollection.create((server: ServersModel) => {
                            server.dbPath = databaseFilePath;
                            server.displayName = displayName;
                            server.url = serverUrl;
                            server.identifier = identifier;
                            server.lastActiveAt = 0;
                        });
                    });
                } else if (serverModel.dbPath !== databaseFilePath) {
                    await appDatabase.write(async () => {
                        await serverModel.update((s) => {
                            s.dbPath = databaseFilePath;
                        });
                    });
                } else if (identifier) {
                    await this.updateServerIdentifier(serverUrl, identifier, displayName);
                }
            }
        } catch (e) {
            logError('Error adding server to App database', e);
        }
    };

    public updateServerIdentifier = async (serverUrl: string, identifier: string, displayName?: string) => {
        const appDatabase = this.appDatabase?.database;
        if (appDatabase) {
            const server = await getServer(serverUrl);
            await appDatabase.write(async () => {
                await server?.update((record) => {
                    record.identifier = identifier;
                    if (displayName) {
                        record.displayName = displayName;
                    }
                });
            });
        }
    };

    public updateServerDisplayName = async (serverUrl: string, displayName: string) => {
        const appDatabase = this.appDatabase?.database;
        if (appDatabase) {
            const server = await getServer(serverUrl);
            await appDatabase.write(async () => {
                await server?.update((record) => {
                    record.displayName = displayName;
                });
            });
        }
    };

    /**
    * isServerPresent : Confirms if the current serverUrl does not already exist in the database
    * @param {String} serverUrl
    * @returns {Promise<boolean>}
    */
    private isServerPresent = async (serverUrl: string): Promise<boolean> => {
        const server = await getServer(serverUrl);
        return Boolean(server);
    };

    /**
    * getActiveServerUrl: Get the server url for active server database.
    * @returns {Promise<string|undefined>}
    */
    public getActiveServerUrl = async (): Promise<string|undefined> => {
        const server = await getActiveServer();
        return server?.url;
    };

    /**
    * getActiveServerDisplayName: Get the server display name for active server database.
    * @returns {Promise<string|undefined>}
    */
    public getActiveServerDisplayName = async (): Promise<string|undefined> => {
        const server = await getActiveServer();
        return server?.displayName;
    };

    public getServerUrlFromIdentifier = async (identifier: string): Promise<string|undefined> => {
        const server = await getServerByIdentifier(identifier);
        return server?.url;
    };

    /**
    * getActiveServerDatabase: Get the record for active server database.
    * @returns {Promise<Database|undefined>}
    */
    public getActiveServerDatabase = async (): Promise<Database|undefined> => {
        const server = await getActiveServer();
        if (server?.url) {
            return this.serverDatabases[server.url]?.database;
        }

        return undefined;
    };

    /**
     * getAppDatabaseAndOperator: Helper function that returns App the database and operator.
     * use within a try/catch block
     * @returns AppDatabase
     * @throws Error
     */
    public getAppDatabaseAndOperator = () => {
        const app = this.appDatabase;
        if (!app) {
            throw new Error('App database not found');
        }

        return app;
    };

    /**
     * getServerDatabaseAndOperator: Helper function that returns the database and operator
     * for a specific server.
     * use within a try/catch block
     * @param serverUrl the url of the server
     * @returns ServerDatabase
     * @throws Error
     */
    public getServerDatabaseAndOperator = (serverUrl: string) => {
        const server = this.serverDatabases[serverUrl];
        if (!server) {
            throw new Error(`${serverUrl} database not found`);
        }

        return server;
    };

    /**
    * setActiveServerDatabase: Set the new active server database.
    * This method should be called when switching to another server.
    * @param {string} serverUrl
    * @returns {Promise<void>}
    */
    public setActiveServerDatabase = async (serverUrl: string): Promise<void> => {
        if (this.appDatabase?.database) {
            const database = this.appDatabase?.database;
            await database.write(async () => {
                const servers = await database.collections.get(SERVERS).query(Q.where('url', serverUrl)).fetch();
                if (servers.length) {
                    servers[0].update((server: ServersModel) => {
                        server.lastActiveAt = Date.now();
                    });
                }
            });
        }
    };

    /**
    * deleteServerDatabase: Removes the *.db file from the App-Group directory for iOS or the files directory on Android.
    * Also, it sets the last_active_at to '0' entry in the 'servers' table from the APP database
    * @param  {string} serverUrl
    * @returns {Promise<boolean>}
    */
    public deleteServerDatabase = async (serverUrl: string): Promise<void> => {
        const database = this.appDatabase?.database;
        if (database) {
            const server = await getServer(serverUrl);
            if (server) {
                database.write(async () => {
                    await server.update((record) => {
                        record.lastActiveAt = 0;
                        record.identifier = '';
                    });
                });

                delete this.serverDatabases[serverUrl];
                this.deleteServerDatabaseFiles(serverUrl);
            }
        }
    };

    /**
    * destroyServerDatabase: Removes the *.db file from the App-Group directory for iOS or the files directory on Android.
    * Also, removes the entry in the 'servers' table from the APP database
    * @param  {string} serverUrl
    * @returns {Promise<boolean>}
    */
    public destroyServerDatabase = async (serverUrl: string): Promise<void> => {
        const database = this.appDatabase?.database;
        if (database) {
            const server = await getServer(serverUrl);
            if (server) {
                database.write(async () => {
                    await server.destroyPermanently();
                });

                delete this.serverDatabases[serverUrl];
                this.deleteServerDatabaseFiles(serverUrl);
            }
        }
    };

    /**
    * deleteServerDatabaseFiles: Removes the *.db file from the App-Group directory for iOS or the files directory on Android.
    * @param  {string} serverUrl
    * @returns {Promise<void>}
    */
    private deleteServerDatabaseFiles = async (serverUrl: string): Promise<void> => {
        const databaseName = urlSafeBase64Encode(serverUrl);
        return this.deleteServerDatabaseFilesByName(databaseName);
    };

    /**
    * deleteServerDatabaseFilesByName: Removes the *.db file from the App-Group directory for iOS or the files directory for Android, given the database name
    * @param {string} databaseName
    * @returns {Promise<void>}
    */
    private deleteServerDatabaseFilesByName = async (databaseName: string): Promise<void> => {
        if (Platform.OS === 'ios') {
            // On iOS, we'll delete the *.db file under the shared app-group/databases folder
            await deleteIOSDatabase({databaseName});
            return;
        }

        // On Android, we'll delete the *.db, the *.db-shm and *.db-wal files
        const androidFilesDir = this.databaseDirectory;
        const databaseFile = `${androidFilesDir}${databaseName}.db`;
        const databaseShm = `${androidFilesDir}${databaseName}.db-shm`;
        const databaseWal = `${androidFilesDir}${databaseName}.db-wal`;

        await FileSystem.unlink(databaseFile).catch(emptyFunction);
        await FileSystem.unlink(databaseShm).catch(emptyFunction);
        await FileSystem.unlink(databaseWal).catch(emptyFunction);
    };

    /**
    * renameDatabase: Renames the *.db file from the App-Group directory for iOS or the files directory for Android
    * @param {string} databaseName
    * @param {string} newDBName
    * @returns {Promise<void>}
    */
    private renameDatabase = async (databaseName: string, newDBName: string): Promise<void> => {
        if (Platform.OS === 'ios') {
            // On iOS, we'll move the *.db file under the shared app-group/databases folder
            renameIOSDatabase(databaseName, newDBName);
            return;
        }

        // On Android, we'll move the *.db, the *.db-shm and *.db-wal files
        const androidFilesDir = this.databaseDirectory;
        const databaseFile = `${androidFilesDir}${databaseName}.db`;
        const databaseShm = `${androidFilesDir}${databaseName}.db-shm`;
        const databaseWal = `${androidFilesDir}${databaseName}.db-wal`;

        const newDatabaseFile = `${androidFilesDir}${newDBName}.db`;
        const newDatabaseShm = `${androidFilesDir}${newDBName}.db-shm`;
        const newDatabaseWal = `${androidFilesDir}${newDBName}.db-wal`;

        if (await FileSystem.exists(newDatabaseFile)) {
            // Already renamed, do not try
            return;
        }

        if (!await FileSystem.exists(databaseFile)) {
            // Nothing to rename, do not try
            return;
        }

        try {
            await FileSystem.moveFile(databaseFile, newDatabaseFile);
            await FileSystem.moveFile(databaseShm, newDatabaseShm);
            await FileSystem.moveFile(databaseWal, newDatabaseWal);
        } catch (error) {
            // Do nothing
        }
    };

    /**
    * factoryReset: Removes the databases directory and all its contents on the respective platform
    * @param {boolean} shouldRemoveDirectory
    * @returns {Promise<boolean>}
    */
    factoryReset = async (shouldRemoveDirectory: boolean): Promise<boolean> => {
        try {
            //On iOS, we'll delete the databases folder under the shared AppGroup folder
            if (Platform.OS === 'ios') {
                deleteIOSDatabase({shouldRemoveDirectory});
                return true;
            }

            // On Android, we'll remove the databases folder under the Document Directory
            const androidFilesDir = `${this.databaseDirectory}databases/`;
            await FileSystem.unlink(androidFilesDir);
            return true;
        } catch (e) {
            return false;
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
        const migrationEvents = {
            onSuccess: () => {
                logDebug('DB Migration success', dbName);
                return DeviceEventEmitter.emit(MIGRATION_EVENTS.MIGRATION_SUCCESS, {
                    dbName,
                });
            },
            onStart: () => {
                logDebug('DB Migration start', dbName);
                return DeviceEventEmitter.emit(MIGRATION_EVENTS.MIGRATION_STARTED, {
                    dbName,
                });
            },
            onError: (error: Error) => {
                logDebug('DB Migration error', dbName);
                return DeviceEventEmitter.emit(MIGRATION_EVENTS.MIGRATION_ERROR, {
                    dbName,
                    error,
                });
            },
        };

        return migrationEvents;
    };

    /**
    * getDatabaseFilePath: Using the database name, this method will return the database file path for each platform.
    * On iOS, it will point towards the AppGroup shared directory while on Android, it will point towards the Files Directory.
    * Please note that in each case, the *.db files will be created/grouped under a 'databases' sub-folder.
    * iOS Simulator : appGroup => /Users/{username}/Library/Developer/CoreSimulator/Devices/DA6F1C73/data/Containers/Shared/AppGroup/ACA65327/databases"}
    * Android Device: file:///data/user/0/com.mattermost.rnbeta/files/databases
    *
    * @param {string} dbName
    * @returns {string}
    */
    private getDatabaseFilePath = (dbName: string): string => {
        return Platform.OS === 'ios' ? `${this.databaseDirectory}/${dbName}.db` : `${this.databaseDirectory}${dbName}.db`;
    };

    /**
     * searchUrl returns the serverUrl that matches the passed string among the servers currently loaded.
     * Returns undefined if none found.
     *
     * @param {string} toFind
     * @returns {string|undefined}
     */
    public searchUrl = (toFind: string): string | undefined => {
        const toFindWithoutProtocol = removeProtocol(toFind);
        return Object.keys(this.serverDatabases).find((k) => removeProtocol(k) === toFindWithoutProtocol);
    };
}

if (!__DEV__) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    logger.silence();
}

export default new DatabaseManager();
