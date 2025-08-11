// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import logger from '@nozbe/watermelondb/utils/common/logger';
import {deleteAsync} from 'expo-file-system';
import {DeviceEventEmitter, Platform} from 'react-native';

import {DatabaseType, MIGRATION_EVENTS, MM_TABLES} from '@constants/database';
import AppDatabaseMigrations from '@database/migration/app';
import ServerDatabaseMigrations from '@database/migration/server';
import {InfoModel, GlobalModel, ServersModel} from '@database/models/app';
import {CategoryModel, CategoryChannelModel, ChannelModel, ChannelBookmarkModel, ChannelInfoModel, ChannelMembershipModel, ConfigModel, CustomEmojiModel, CustomProfileFieldModel, CustomProfileAttributeModel, DraftModel, FileModel,
    GroupModel, GroupChannelModel, GroupTeamModel, GroupMembershipModel, MyChannelModel, MyChannelSettingsModel, MyTeamModel,
    PostModel, PostsInChannelModel, PostsInThreadModel, PreferenceModel, ReactionModel, RoleModel,
    SystemModel, TeamModel, TeamChannelHistoryModel, TeamMembershipModel, TeamSearchHistoryModel,
    ThreadModel, ThreadParticipantModel, ThreadInTeamModel, TeamThreadsSyncModel, UserModel,
    ScheduledPostModel,
} from '@database/models/server';
import AppDataOperator from '@database/operator/app_data_operator';
import ServerDataOperator from '@database/operator/server_data_operator';
import {schema as appSchema} from '@database/schema/app';
import {serverSchema} from '@database/schema/server';
import {PlaybookRunModel, PlaybookChecklistModel, PlaybookChecklistItemModel} from '@playbooks/database/models';
import {deleteIOSDatabase} from '@utils/mattermost_managed';
import {urlSafeBase64Encode} from '@utils/security';
import {removeProtocol} from '@utils/url';

import type {AppDatabase, CreateServerDatabaseArgs, Models, RegisterServerDatabaseArgs, ServerDatabase, ServerDatabases} from '@typings/database/database';
import type ServerModel from '@typings/database/models/app/servers';

const {SERVERS} = MM_TABLES.APP;
const APP_DATABASE = 'app';

if (__DEV__) {

    // @ts-ignore
    logger.silence();
}

class DatabaseManagerSingleton {
    public appDatabase?: AppDatabase;
    public serverDatabases: ServerDatabases = {};
    private readonly appModels: Models;
    private readonly databaseDirectory: string | null;
    private readonly serverModels: Models;

    constructor() {
        this.appModels = [InfoModel, GlobalModel, ServersModel];
        this.serverModels = [
            CategoryModel, CategoryChannelModel, ChannelModel, ChannelBookmarkModel, ChannelInfoModel, ChannelMembershipModel, ConfigModel, CustomEmojiModel, CustomProfileFieldModel, CustomProfileAttributeModel, DraftModel, FileModel,
            GroupModel, GroupChannelModel, GroupTeamModel, GroupMembershipModel, MyChannelModel, MyChannelSettingsModel, MyTeamModel,
            PostModel, PostsInChannelModel, PostsInThreadModel, PreferenceModel, ReactionModel, RoleModel,
            ScheduledPostModel, SystemModel, TeamModel, TeamChannelHistoryModel, TeamMembershipModel, TeamSearchHistoryModel,
            ThreadModel, ThreadParticipantModel, ThreadInTeamModel, TeamThreadsSyncModel, UserModel,
            PlaybookRunModel, PlaybookChecklistModel, PlaybookChecklistItemModel,
        ];
        this.databaseDirectory = '';
    }

    public init = async (serverUrls: string[]): Promise<void> => {
        await this.createAppDatabase();
        for await (const serverUrl of serverUrls) {
            await this.destroyServerDatabase(serverUrl);
            await this.initServerDatabase(serverUrl);
        }
        this.appDatabase?.operator.handleInfo({
            info: [{
                build_number: '123',
                created_at: Date.now(),
                version_number: '2.0.0',
            }],
            prepareRecordsOnly: false,
        });
    };

    private createAppDatabase = async (): Promise<AppDatabase|undefined> => {
        try {
            const modelClasses = this.appModels;
            const schema = appSchema;

            // autosave uses a timeout that doesn't get cleared when we close the database in tests
            // disabling it makes it so the tests don't leak memory
            const adapter = new LokiJSAdapter({dbName: APP_DATABASE, migrations: AppDatabaseMigrations, schema, useWebWorker: false, useIncrementalIndexedDB: true, extraLokiOptions: {autosave: false}});

            const database = new Database({adapter, modelClasses});
            const operator = new AppDataOperator(database);

            this.appDatabase = {
                database,
                operator,
            };
            return this.appDatabase;
        } catch (e) {
            // do nothing
        }

        return undefined;
    };

    public createServerDatabase = async ({config}: CreateServerDatabaseArgs): Promise<ServerDatabase|undefined> => {
        const {dbName, displayName, identifier, serverUrl} = config;

        if (serverUrl) {
            try {
                const databaseFilePath = this.getDatabaseFilePath(dbName);
                const migrations = ServerDatabaseMigrations;
                const modelClasses = this.serverModels;
                const schema = serverSchema;

                // autosave uses a timeout that doesn't get cleared when we close the database in tests
                // disabling it makes it so the tests don't leak memory
                const adapter = new LokiJSAdapter({dbName, migrations, schema, useWebWorker: false, useIncrementalIndexedDB: true, extraLokiOptions: {autosave: false}});

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
                // do nothing
            }
        }

        return undefined;
    };

    private initServerDatabase = async (serverUrl: string): Promise<void> => {
        await this.createServerDatabase({
            config: {
                dbName: urlSafeBase64Encode(serverUrl),
                dbType: DatabaseType.SERVER,
                serverUrl,
            },
        });
    };

    private addServerToAppDatabase = async ({databaseFilePath, displayName, identifier = '', serverUrl}: RegisterServerDatabaseArgs): Promise<void> => {
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
                    await this.updateServerIdentifier(serverUrl, identifier);
                }
            }
        } catch (e) {
            // do nothing
        }
    };

    public updateServerIdentifier = async (serverUrl: string, identifier: string) => {
        const appDatabase = this.appDatabase?.database;
        if (appDatabase) {
            const server = await this.getServer(serverUrl);
            await appDatabase.write(async () => {
                await server?.update((record) => {
                    record.identifier = identifier;
                });
            });
        }
    };

    public updateServerDisplayName = async (serverUrl: string, displayName: string) => {
        const appDatabase = this.appDatabase?.database;
        if (appDatabase) {
            const server = await this.getServer(serverUrl);
            await appDatabase.write(async () => {
                await server?.update((record) => {
                    record.displayName = displayName;
                });
            });
        }
    };

    private isServerPresent = async (serverUrl: string): Promise<boolean> => {
        const server = await this.getServer(serverUrl);
        return Boolean(server);
    };

    public getActiveServerUrl = async (): Promise<string|undefined> => {
        const server = await this.getActiveServer();
        return server?.url;
    };

    public getActiveServerDisplayName = async (): Promise<string|undefined> => {
        const server = await this.getActiveServer();
        return server?.displayName;
    };

    public getServerUrlFromIdentifier = async (identifier: string): Promise<string|undefined> => {
        const server = await this.getServerByIdentifier(identifier);
        return server?.url;
    };

    public getAppDatabaseAndOperator = () => {
        const app = this.appDatabase;
        if (!app) {
            throw new Error('App database not found');
        }

        return app;
    };

    public getServerDatabaseAndOperator = (serverUrl: string) => {
        const server = this.serverDatabases[serverUrl];
        if (!server) {
            throw new Error(`${serverUrl} database not found`);
        }

        return server;
    };

    public getActiveServerDatabase = async (): Promise<Database|undefined> => {
        const server = await this.getActiveServer();
        if (server?.url) {
            return this.serverDatabases[server.url]!.database;
        }

        return undefined;
    };

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

    public deleteServerDatabase = async (serverUrl: string): Promise<void> => {
        const database = this.appDatabase?.database;
        if (database) {
            const server = await this.getServer(serverUrl);
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

    public destroyServerDatabase = async (serverUrl: string): Promise<void> => {
        const database = this.appDatabase?.database;
        if (database) {
            const server = await this.getServer(serverUrl);
            if (server) {
                database.write(async () => {
                    await server.destroyPermanently();
                });

                delete this.serverDatabases[serverUrl];
                this.deleteServerDatabaseFiles(serverUrl);
            }
        }
    };

    private deleteServerDatabaseFiles = async (serverUrl: string): Promise<void> => {
        const databaseName = urlSafeBase64Encode(serverUrl);

        if (Platform.OS === 'ios') {
        // On iOS, we'll delete the *.db file under the shared app-group/databases folder
            deleteIOSDatabase({databaseName});
            return;
        }

        // On Android, we'll delete both the *.db file and the *.db-journal file
        const androidFilesDir = `${this.databaseDirectory}databases/`;
        const databaseFile = `${androidFilesDir}${databaseName}.db`;
        const databaseJournal = `${androidFilesDir}${databaseName}.db-journal`;

        try {
            await deleteAsync(databaseFile);
        } catch {
            // do nothing
        }

        try {
            await deleteAsync(databaseJournal);
        } catch {
            // do nothing
        }
    };

    factoryReset = async (shouldRemoveDirectory: boolean): Promise<boolean> => {
        try {
        //On iOS, we'll delete the databases folder under the shared AppGroup folder
            if (Platform.OS === 'ios') {
                deleteIOSDatabase({shouldRemoveDirectory});
                return true;
            }

            // On Android, we'll remove the databases folder under the Document Directory
            const androidFilesDir = `${this.databaseDirectory}databases/`;
            await deleteAsync(androidFilesDir);
            return true;
        } catch (e) {
            return false;
        }
    };

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

    private getDatabaseFilePath = (dbName: string): string => {
        return Platform.OS === 'ios' ? `${this.databaseDirectory}/${dbName}.db` : `${this.databaseDirectory}${dbName}.db`;
    };

    public searchUrl = (toFind: string): string | undefined => {
        const toFindWithoutProtocol = removeProtocol(toFind);
        return Object.keys(this.serverDatabases).find((k) => removeProtocol(k) === toFindWithoutProtocol);
    };

    // This actions already exists but the mock fails when using them cause of cyclic requires
    private getServer = async (serverUrl: string) => {
        try {
            const {database} = this.getAppDatabaseAndOperator();
            const servers = (await database.get<ServerModel>(SERVERS).query(Q.where('url', serverUrl)).fetch());
            return servers?.[0];
        } catch {
            return undefined;
        }
    };

    private getAllServers = async () => {
        try {
            const {database} = this.getAppDatabaseAndOperator();
            return database.get<ServerModel>(MM_TABLES.APP.SERVERS).query().fetch();
        } catch {
            return [];
        }
    };

    private getActiveServer = async () => {
        try {
            const servers = await this.getAllServers();
            const server = servers?.filter((s) => s.identifier)?.reduce((a, b) => (b.lastActiveAt > a.lastActiveAt ? b : a));
            return server;
        } catch {
            return undefined;
        }
    };

    private getServerByIdentifier = async (identifier: string) => {
        try {
            const {database} = this.getAppDatabaseAndOperator();
            const servers = (await database.get<ServerModel>(SERVERS).query(Q.where('identifier', identifier)).fetch());
            return servers?.[0];
        } catch {
            return undefined;
        }
    };
}

const DatabaseManager = new DatabaseManagerSingleton();
export default DatabaseManager;
