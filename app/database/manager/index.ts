// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import logger from '@nozbe/watermelondb/utils/common/logger';
import {DeviceEventEmitter, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import FileSystem from 'react-native-fs';

import {MIGRATION_EVENTS, MM_TABLES} from '@constants/database';
import AppDatabaseMigrations from '@database/migration/app';
import ServerDatabaseMigrations from '@database/migration/server';
import {InfoModel, GlobalModel, ServersModel} from '@database/models/app';
import {CategoryModel, CategoryChannelModel, ChannelModel, ChannelInfoModel, ChannelMembershipModel, CustomEmojiModel, DraftModel, FileModel,
    GroupModel, GroupChannelModel, GroupTeamModel, GroupMembershipModel, MyChannelModel, MyChannelSettingsModel, MyTeamModel,
    PostModel, PostsInChannelModel, PostsInThreadModel, PreferenceModel, ReactionModel, RoleModel,
    SystemModel, TeamModel, TeamChannelHistoryModel, TeamMembershipModel, TeamSearchHistoryModel,
    ThreadModel, ThreadParticipantModel, ThreadInTeamModel, UserModel,
} from '@database/models/server';
import AppDataOperator from '@database/operator/app_data_operator';
import ServerDataOperator from '@database/operator/server_data_operator';
import {schema as appSchema} from '@database/schema/app';
import {serverSchema} from '@database/schema/server';
import {queryActiveServer, queryServer, queryServerByIdentifier} from '@queries/app/servers';
import {DatabaseType} from '@typings/database/enums';
import {emptyFunction} from '@utils/general';
import {deleteIOSDatabase, getIOSAppGroupDetails} from '@utils/mattermost_managed';
import {hashCode} from '@utils/security';
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
            CategoryModel, CategoryChannelModel, ChannelModel, ChannelInfoModel, ChannelMembershipModel, CustomEmojiModel, DraftModel, FileModel,
            GroupModel, GroupChannelModel, GroupTeamModel, GroupMembershipModel, MyChannelModel, MyChannelSettingsModel, MyTeamModel,
            PostModel, PostsInChannelModel, PostsInThreadModel, PreferenceModel, ReactionModel, RoleModel,
            SystemModel, TeamModel, TeamChannelHistoryModel, TeamMembershipModel, TeamSearchHistoryModel,
            ThreadModel, ThreadParticipantModel, ThreadInTeamModel, UserModel,
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
        for await (const serverUrl of serverUrls) {
            await this.initServerDatabase(serverUrl);
        }
        this.appDatabase?.operator.handleInfo({
            info: [{
                build_number: DeviceInfo.getBuildNumber(),
                created_at: Date.now(),
                version_number: DeviceInfo.getVersion(),
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
            // TODO : report to sentry? Show something on the UI ?
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
                const databaseName = hashCode(serverUrl);
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
                // TODO : report to sentry? Show something on the UI ?
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
                const isServerPresent = await this.isServerPresent(serverUrl);

                if (!isServerPresent) {
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
                } else if (identifier) {
                    await this.updateServerIdentifier(serverUrl, identifier, displayName);
                }
            }
        } catch (e) {
            // TODO : report to sentry? Show something on the UI ?
        }
    };

    public updateServerIdentifier = async (serverUrl: string, identifier: string, displayName?: string) => {
        const appDatabase = this.appDatabase?.database;
        if (appDatabase) {
            const server = await queryServer(appDatabase, serverUrl);
            await appDatabase.write(async () => {
                await server.update((record) => {
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
            const server = await queryServer(appDatabase, serverUrl);
            await appDatabase.write(async () => {
                await server.update((record) => {
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
        if (this.appDatabase?.database) {
            const server = await queryServer(this.appDatabase.database, serverUrl);
            return Boolean(server);
        }

        return false;
    };

    /**
    * getActiveServerUrl: Get the server url for active server database.
    * @returns {Promise<string|null|undefined>}
    */
    public getActiveServerUrl = async (): Promise<string|null|undefined> => {
        const database = this.appDatabase?.database;
        if (database) {
            const server = await queryActiveServer(database);
            return server?.url;
        }

        return null;
    };

    /**
    * getActiveServerDisplayName: Get the server display name for active server database.
    * @returns {Promise<string|null|undefined>}
    */
    public getActiveServerDisplayName = async (): Promise<string|null|undefined> => {
        const database = this.appDatabase?.database;
        if (database) {
            const server = await queryActiveServer(database);
            return server?.displayName;
        }

        return null;
    };

    public getServerUrlFromIdentifier = async (identifier: string): Promise<string|undefined> => {
        const database = this.appDatabase?.database;
        if (database) {
            const server = await queryServerByIdentifier(database, identifier);
            return server?.url;
        }

        return undefined;
    };

    /**
    * getActiveServerDatabase: Get the record for active server database.
    * @returns {Promise<Database|undefined>}
    */
    public getActiveServerDatabase = async (): Promise<Database|undefined> => {
        const database = this.appDatabase?.database;
        if (database) {
            const server = await queryActiveServer(database);
            if (server?.url) {
                return this.serverDatabases[server.url]?.database;
            }
        }

        return undefined;
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
        if (this.appDatabase?.database) {
            const database = this.appDatabase?.database;
            const server = await queryServer(database, serverUrl);
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
        if (this.appDatabase?.database) {
            const database = this.appDatabase?.database;
            const server = await queryServer(database, serverUrl);
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
        const databaseName = hashCode(serverUrl);

        if (Platform.OS === 'ios') {
            // On iOS, we'll delete the *.db file under the shared app-group/databases folder
            deleteIOSDatabase({databaseName});
            return;
        }

        // On Android, we'll delete the *.db, the *.db-shm and *.db-wal files
        const androidFilesDir = this.databaseDirectory;
        const databaseFile = `${androidFilesDir}${databaseName}.db`;
        const databaseShm = `${androidFilesDir}${databaseName}.db-shm`;
        const databaseWal = `${androidFilesDir}${databaseName}.db-wal`;

        FileSystem.unlink(databaseFile).catch(emptyFunction);
        FileSystem.unlink(databaseShm).catch(emptyFunction);
        FileSystem.unlink(databaseWal).catch(emptyFunction);
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
                return DeviceEventEmitter.emit(MIGRATION_EVENTS.MIGRATION_SUCCESS, {
                    dbName,
                });
            },
            onStart: () => {
                return DeviceEventEmitter.emit(MIGRATION_EVENTS.MIGRATION_STARTED, {
                    dbName,
                });
            },
            onError: (error: Error) => {
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
        return Platform.OS === 'ios' ? `${this.databaseDirectory}/${dbName}.db` : `${this.databaseDirectory}/${dbName}.db`;
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
