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
import AppDatabaseMigration from '@app/database/migration/app';
import {Info, Global, Servers} from '@app/database/models/app';
import {defaultSchema} from '@app/database/schema/app';
import ServerDatabaseMigration from '@database/migration/server';
import {Channel, ChannelInfo, ChannelMembership, CustomEmoji, Draft, File,
    Group, GroupMembership, GroupsInChannel, GroupsInTeam, MyChannel, MyChannelSettings, MyTeam,
    Post, PostMetadata, PostsInChannel, PostsInThread, Preference, Reaction, Role,
    SlashCommand, System, Team, TeamChannelHistory, TeamMembership, TeamSearchHistory,
    TermsOfService, User,
} from '@database/models/server';
import {serverSchema} from '@database/schema/server';
import {getServer} from '@queries/app/servers';
import {deleteIOSDatabase} from '@utils/mattermost_managed';
import {hashCode} from '@utils/security';

import type {AppDatabase, CreateDatabaseArgs, CreateServerDatabaseArgs, MigrationEvents, Models, ServerDatabase, ServerDatabases} from '@typings/database/database';
import {DatabaseType} from '@typings/database/enums';
import type IServers from '@typings/database/models/app/servers';

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
    private readonly defaultModels: Models;
    private readonly iOSAppGroupDatabase: string | null;
    private readonly androidFilesDirectory: string | null;
    private readonly serverModels: Models;

    constructor() {
        this.defaultModels = [Info, Global, Servers];
        this.serverModels = [
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
        ];
        this.iOSAppGroupDatabase = null;
        this.androidFilesDirectory = null;
    }

    public init = async (serverUrls: string[]): Promise<void> => {
        await this.initAppDatabase();
        for await (const serverUrl of serverUrls) {
            await this.initServerDatabase(serverUrl);
        }
    };

    private createDatabase = async ({config, shouldAddToAppDatabase = true}: CreateDatabaseArgs): Promise<Database|undefined> => {
        const {dbName = APP_DATABASE, dbType = DatabaseType.DEFAULT, serverUrl = undefined} = config;

        try {
            const databaseName = dbType === DatabaseType.DEFAULT ? APP_DATABASE : dbName;

            const databaseFilePath = this.getDatabaseFilePath(databaseName);
            const migrations = dbType === DatabaseType.DEFAULT ? AppDatabaseMigration : ServerDatabaseMigration;
            const modelClasses = dbType === DatabaseType.DEFAULT ? this.defaultModels : this.serverModels;
            const schema = dbType === DatabaseType.DEFAULT ? defaultSchema : serverSchema;

            const adapter = new LokiJSAdapter({dbName: databaseName, migrations, schema, useWebWorker: false, useIncrementalIndexedDB: true});

            // Registers the new server connection into the DEFAULT database
            if (serverUrl && shouldAddToAppDatabase) {
                await this.addServerToAppDatabase({
                    databaseFilePath,
                    displayName: dbName,
                    serverUrl,
                });
            }

            return new Database({adapter, actionsEnabled: true, modelClasses});
        } catch (e) {
            // TODO : report to sentry? Show something on the UI ?
        }

        return undefined;
    };

    public createServerDatabase = async ({config}: CreateDatabaseArgs): Promise<ServerDatabase|undefined> => {
        const {dbName, displayName, serverUrl} = config;

        if (serverUrl) {
            try {
                const databaseFilePath = this.getDatabaseFilePath(dbName);
                const migrations = ServerDatabaseMigration;
                const modelClasses = this.serverModels;
                const schema = serverSchema;

                const adapter = new LokiJSAdapter({dbName, migrations, schema, useWebWorker: false, useIncrementalIndexedDB: true});

                // Registers the new server connection into the DEFAULT database
                await this.addServerToAppDatabase({
                    databaseFilePath,
                    displayName: displayName || dbName,
                    serverUrl,
                });

                const database = new Database({adapter, actionsEnabled: true, modelClasses});
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

    private initAppDatabase = async (): Promise<void> => {
        const database = await this.createDatabase({
            config: {dbName: APP_DATABASE},
            shouldAddToAppDatabase: false,
        });

        if (database) {
            const operator = new AppDataOperator(database);
            this.appDatabase = {
                database,
                operator,
            };
        }
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

    private addServerToAppDatabase = async ({databaseFilePath, displayName, serverUrl}: CreateServerDatabaseArgs): Promise<void> => {
        try {
            const isServerPresent = await this.isServerPresent(serverUrl); // TODO: Use normalized serverUrl

            if (this.appDatabase?.database && !isServerPresent) {
                const appDatabase = this.appDatabase.database;
                await appDatabase.action(async () => {
                    const serversCollection = appDatabase.collections.get(SERVERS);
                    await serversCollection.create((server: IServers) => {
                        server.dbPath = databaseFilePath;
                        server.displayName = displayName;
                        server.mentionCount = 0;
                        server.unreadCount = 0;
                        server.url = serverUrl; // TODO: Use normalized serverUrl
                        server.isSecured = urlParse(serverUrl).protocol === 'https';
                        server.lastActiveAt = 0;
                    });
                });
            }
        } catch (e) {
        // TODO : report to sentry? Show something on the UI ?
        }
    };

    private isServerPresent = async (serverUrl: string): Promise<boolean> => {
        if (this.appDatabase?.database) {
            const servers = (await this.appDatabase.database.collections.get(SERVERS).query(Q.where('url', serverUrl)).fetch() as IServers[]);
            return Boolean(servers[0]);
        }

        return false;
    }

  public getActiveServerUrl = async (): Promise<string|null|undefined> => {
      const database = this.appDatabase?.database;
      const servers = (await database?.collections.get(MM_TABLES.APP.SERVERS).query().fetch()) as IServers[];

      try {
          const server = servers.reduce((a, b) => (b.lastActiveAt > a.lastActiveAt ? b : a));
          return server.url;
      } catch {
          return null;
      }
  }

 public getActiveServerDatabase = async (): Promise<Database|undefined> => {
     const database = this.appDatabase?.database;
     const servers = (await database?.collections.get(MM_TABLES.APP.SERVERS).query().fetch()) as IServers[];

     try {
         const server = servers.reduce((a, b) => (b.lastActiveAt > a.lastActiveAt ? b : a));
         return this.serverDatabases[server.url].database;
     } catch {
         return undefined;
     }
 }

    public setActiveServerDatabase = async (serverUrl: string): Promise<void> => {
        if (this.appDatabase?.database) {
            const database = this.appDatabase?.database;
            await database.action(async () => {
                const servers = await database.collections.get(SERVERS).query(Q.where('url', serverUrl)).fetch();
                if (servers.length) {
                    servers[0].update((server: Servers) => {
                        server.lastActiveAt = Date.now();
                    });
                }
            });
        }
    };

    public deleteServerDatabase = async (serverUrl: string): Promise<void> => {
        if (this.appDatabase?.database) {
            const database = this.appDatabase?.database;
            const server = await getServer(database, serverUrl);
            if (server) {
                database.action(() => {
                    server.update((record) => {
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
            const server = await getServer(database, serverUrl);
            if (server) {
                database.action(async () => {
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
        const androidFilesDir = `${this.androidFilesDirectory}databases/`;
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
            const androidFilesDir = `${FileSystem.documentDirectory}databases/`;
            await FileSystem.deleteAsync(androidFilesDir);
            return true;
        } catch (e) {
            return false;
        }
    };

    private buildMigrationCallbacks = (dbName: string) => {
        const migrationEvents: MigrationEvents = {
            onSuccess: () => {
                return DeviceEventEmitter.emit(MIGRATION_EVENTS.MIGRATION_SUCCESS, {
                    dbName,
                });
            },
            onStarted: () => {
                return DeviceEventEmitter.emit(MIGRATION_EVENTS.MIGRATION_STARTED, {
                    dbName,
                });
            },
            onFailure: (error) => {
                return DeviceEventEmitter.emit(MIGRATION_EVENTS.MIGRATION_ERROR, {
                    dbName,
                    error,
                });
            },
        };

        return migrationEvents;
    };

    private getDatabaseFilePath = (dbName: string): string => {
        return Platform.OS === 'ios' ? `${this.iOSAppGroupDatabase}/${dbName}.db` : `${FileSystem.documentDirectory}${dbName}.db`;
    };
}

export default new DatabaseManager();
