// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import logger from '@nozbe/watermelondb/utils/common/logger';
import {DeviceEventEmitter, Platform} from 'react-native';
import {FileSystem} from 'react-native-unimodules';
import urlParse from 'url-parse';

import {MIGRATION_EVENTS, MM_TABLES} from '@constants/database';
import AppDataOperator from '@database/operator/app_data_operator';
import AppDatabaseMigrations from '@app/database/migration/app';
import {InfoModel, GlobalModel, ServersModel} from '@database/models/app';
import {schema as appSchema} from '@app/database/schema/app';
import ServerDatabaseMigrations from '@database/migration/server';
import {ChannelModel, ChannelInfoModel, ChannelMembershipModel, CustomEmojiModel, DraftModel, FileModel,
    GroupModel, GroupMembershipModel, GroupsChannelModel, GroupsTeamModel, MyChannelModel, MyChannelSettingsModel, MyTeamModel,
    PostModel, PostMetadataModel, PostsInChannelModel, PostsInThreadModel, PreferenceModel, ReactionModel, RoleModel,
    SlashCommandModel, SystemModel, TeamModel, TeamChannelHistoryModel, TeamMembershipModel, TeamSearchHistoryModel,
    TermsOfServiceModel, UserModel,
} from '@database/models/server';
import {serverSchema} from '@database/schema/server';
import {queryActiveServer, queryServer} from '@queries/app/servers';
import {deleteIOSDatabase} from '@utils/mattermost_managed';
import {hashCode} from '@utils/security';

import type {AppDatabase, CreateServerDatabaseArgs, Models, RegisterServerDatabaseArgs, ServerDatabase, ServerDatabases} from '@typings/database/database';
import {DatabaseType} from '@typings/database/enums';

import ServerDataOperator from '../../operator/server_data_operator';

const {SERVERS} = MM_TABLES.APP;
const APP_DATABASE = 'app';

if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    logger.silence();
}

class DatabaseManager {
    public appDatabase?: AppDatabase;
    public serverDatabases: ServerDatabases = {};
    private readonly appModels: Models;
    private readonly databaseDirectory: string | null;
    private readonly serverModels: Models;

    constructor() {
        this.appModels = [InfoModel, GlobalModel, ServersModel];
        this.serverModels = [
            ChannelModel, ChannelInfoModel, ChannelMembershipModel, CustomEmojiModel, DraftModel, FileModel,
            GroupModel, GroupMembershipModel, GroupsChannelModel, GroupsTeamModel, MyChannelModel, MyChannelSettingsModel, MyTeamModel,
            PostModel, PostMetadataModel, PostsInChannelModel, PostsInThreadModel, PreferenceModel, ReactionModel, RoleModel,
            SlashCommandModel, SystemModel, TeamModel, TeamChannelHistoryModel, TeamMembershipModel, TeamSearchHistoryModel,
            TermsOfServiceModel, UserModel,
        ];
        this.databaseDirectory = '';
    }

    public init = async (serverUrls: string[]): Promise<void> => {
        await this.createAppDatabase();
        for await (const serverUrl of serverUrls) {
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

            const adapter = new LokiJSAdapter({dbName: APP_DATABASE, migrations: AppDatabaseMigrations, schema, useWebWorker: false, useIncrementalIndexedDB: true});

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
        const {dbName, displayName, serverUrl} = config;

        if (serverUrl) {
            try {
                const databaseFilePath = this.getDatabaseFilePath(dbName);
                const migrations = ServerDatabaseMigrations;
                const modelClasses = this.serverModels;
                const schema = serverSchema;

                const adapter = new LokiJSAdapter({dbName, migrations, schema, useWebWorker: false, useIncrementalIndexedDB: true});

                // Registers the new server connection into the DEFAULT database
                await this.addServerToAppDatabase({
                    databaseFilePath,
                    displayName: displayName || dbName,
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
                dbName: hashCode(serverUrl),
                dbType: DatabaseType.SERVER,
                serverUrl,
            },
        });
    };

    private addServerToAppDatabase = async ({databaseFilePath, displayName, serverUrl}: RegisterServerDatabaseArgs): Promise<void> => {
        try {
            const isServerPresent = await this.isServerPresent(serverUrl);

            if (this.appDatabase?.database && !isServerPresent) {
                const appDatabase = this.appDatabase.database;
                await appDatabase.write(async () => {
                    const serversCollection = appDatabase.collections.get(SERVERS);
                    await serversCollection.create((server: ServersModel) => {
                        server.dbPath = databaseFilePath;
                        server.displayName = displayName;
                        server.mentionCount = 0;
                        server.unreadCount = 0;
                        server.url = serverUrl;
                        server.isSecured = urlParse(serverUrl).protocol === 'https';
                        server.lastActiveAt = 0;
                    });
                });
            }
        } catch (e) {
            // do nothing
        }
    };

    private isServerPresent = async (serverUrl: string): Promise<boolean> => {
        if (this.appDatabase?.database) {
            const server = await queryServer(this.appDatabase.database, serverUrl);
            return Boolean(server);
        }

        return false;
    }

    public getActiveServerUrl = async (): Promise<string|null|undefined> => {
        const database = this.appDatabase?.database;
        if (database) {
            const server = await queryActiveServer(database);
            return server?.url;
        }

        return null;
    }

    public getActiveServerDatabase = async (): Promise<Database|undefined> => {
        const database = this.appDatabase?.database;
        if (database) {
            const server = await queryActiveServer(database);
            if (server?.url) {
                return this.serverDatabases[server.url].database;
            }
        }

        return undefined;
    }

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
        if (this.appDatabase?.database) {
            const database = this.appDatabase?.database;
            const server = await queryServer(database, serverUrl);
            if (server) {
                database.write(async () => {
                    await server.update((record) => {
                        record.lastActiveAt = 0;
                    });
                });

                delete this.serverDatabases[serverUrl];
                this.deleteServerDatabaseFiles(serverUrl);
            }
        }
    }

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
    }

    private deleteServerDatabaseFiles = async (serverUrl: string): Promise<void> => {
        const databaseName = hashCode(serverUrl);

        if (Platform.OS === 'ios') {
        // On iOS, we'll delete the *.db file under the shared app-group/databases folder
            deleteIOSDatabase({databaseName});
            return;
        }

        // On Android, we'll delete both the *.db file and the *.db-journal file
        const androidFilesDir = `${this.databaseDirectory}databases/`;
        const databaseFile = `${androidFilesDir}${databaseName}.db`;
        const databaseJournal = `${androidFilesDir}${databaseName}.db-journal`;

        await FileSystem.deleteAsync(databaseFile);
        await FileSystem.deleteAsync(databaseJournal);
    }

    factoryReset = async (shouldRemoveDirectory: boolean): Promise<boolean> => {
        try {
        //On iOS, we'll delete the databases folder under the shared AppGroup folder
            if (Platform.OS === 'ios') {
                deleteIOSDatabase({shouldRemoveDirectory});
                return true;
            }

            // On Android, we'll remove the databases folder under the Document Directory
            const androidFilesDir = `${this.databaseDirectory}databases/`;
            await FileSystem.deleteAsync(androidFilesDir);
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
}

export default new DatabaseManager();
