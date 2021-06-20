// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import logger from '@nozbe/watermelondb/utils/common/logger';
import {DeviceEventEmitter, Platform} from 'react-native';
import {FileSystem} from 'react-native-unimodules';
import urlParse from 'url-parse';

import {MIGRATION_EVENTS, MM_TABLES} from '@constants/database';
import AppDataOperator from '@database/operator/app_data_operator';
import DefaultMigration from '@app/database/migration/app';
import {Info, Global, Servers} from '@app/database/models/app';
import {defaultSchema} from '@app/database/schema/app';
import ServerMigration from '@database/migration/server';
import {Channel, ChannelInfo, ChannelMembership, CustomEmoji, Draft, File,
    Group, GroupMembership, GroupsInChannel, GroupsInTeam, MyChannel, MyChannelSettings, MyTeam,
    Post, PostMetadata, PostsInChannel, PostsInThread, Preference, Reaction, Role,
    SlashCommand, System, Team, TeamChannelHistory, TeamMembership, TeamSearchHistory,
    TermsOfService, User,
} from '@database/models/server';
import {serverSchema} from '@database/schema/server';
import {getServer} from '@queries/app/servers';
import {deleteIOSDatabase, getIOSAppGroupDetails} from '@utils/mattermost_managed';
import {hashCode} from '@utils/security';

import type {AppDatabase, CreateDatabaseArgs, CreateServerDatabaseArgs, MigrationEvents, Models, ServerDatabase, ServerDatabases} from '@typings/database/database';
import {DatabaseType} from '@typings/database/enums';
import type IServers from '@typings/database/models/app/servers';

import ServerDataOperator from '../operator/server_data_operator';

const {SERVERS} = MM_TABLES.APP;
const APP_DATABASE = 'app';

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
          Channel, ChannelInfo, ChannelMembership, CustomEmoji, Draft, File,
          Group, GroupMembership, GroupsInChannel, GroupsInTeam, MyChannel, MyChannelSettings, MyTeam,
          Post, PostMetadata, PostsInChannel, PostsInThread, Preference, Reaction, Role,
          SlashCommand, System, Team, TeamChannelHistory, TeamMembership, TeamSearchHistory,
          TermsOfService, User,
      ];

      this.iOSAppGroupDatabase = Platform.OS === 'ios' ? getIOSAppGroupDetails().appGroupDatabase : null;
      this.androidFilesDirectory = Platform.OS === 'android' ? FileSystem.documentDirectory : null;
  }

  /**
  * init : Retrieves all the servers registered in the default database
  * @param {string[]} serverUrls
  * @returns {Promise<void>}
  */
  public init = async (serverUrls: string[]): Promise<void> => {
      await this.initAppDatabase();
      for await (const serverUrl of serverUrls) {
          await this.initServerDatabase(serverUrl);
      }
  };

  /**
   * createDatabase: Creates a database. If the database is of type SERVER it registers the the server in the app database. However,
   * if a database could not be created, it will return undefined.
   * @param {CreateDatabaseArgs} createDatabaseArgs
   *
   * @returns {Promise<Database|undefined>}
   */
  private createDatabase = async ({config, shouldAddToAppDatabase = true}: CreateDatabaseArgs): Promise<Database|undefined> => {
      const {dbName = APP_DATABASE, dbType = DatabaseType.DEFAULT, serverUrl = undefined} = config;

      try {
          const databaseName = dbType === DatabaseType.DEFAULT ? APP_DATABASE : hashCode(dbName);

          const databaseFilePath = this.getDatabaseFilePath(databaseName);
          const migrations = dbType === DatabaseType.DEFAULT ? DefaultMigration : ServerMigration;
          const modelClasses = dbType === DatabaseType.DEFAULT ? this.defaultModels : this.serverModels;
          const schema = dbType === DatabaseType.DEFAULT ? defaultSchema : serverSchema;

          const adapter = new SQLiteAdapter({
              dbName: databaseFilePath,
              migrationEvents: this.buildMigrationCallbacks(databaseName),
              migrations,
              schema,
          });

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

  /**
   * createServerDatabase: Creates a server database and registers the the server in the app database. However,
   * if a database connection could not be created, it will return undefined.
   * @param {CreateDatabaseArgs} createDatabaseArgs
   *
   * @returns {Promise<ServerDatabase|undefined>}
   */
   public createServerDatabase = async ({config}: CreateDatabaseArgs): Promise<ServerDatabase|undefined> => {
       const {dbName, displayName, serverUrl} = config;

       if (serverUrl) {
           try {
               const databaseName = hashCode(dbName);
               const databaseFilePath = this.getDatabaseFilePath(databaseName);
               const migrations = ServerMigration;
               const modelClasses = this.serverModels;
               const schema = serverSchema;

               const adapter = new SQLiteAdapter({
                   dbName: databaseFilePath,
                   migrationEvents: this.buildMigrationCallbacks(databaseName),
                   migrations,
                   schema,
               });

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

  /**
  * initAppDatabase : initializes the app database.
  * @returns {Promise<void>}
  */
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
  * @returns {Promise<void>}
  */
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

  /**
  * isServerPresent : Confirms if the current serverUrl does not already exist in the database
  * @param {String} serverUrl
  * @returns {Promise<boolean>}
  */
  private isServerPresent = async (serverUrl: string): Promise<boolean> => {
      if (this.appDatabase?.database) {
          const servers = (await this.appDatabase.database.collections.get(SERVERS).query(Q.where('url', serverUrl)).fetch() as IServers[]);
          return Boolean(servers[0]);
      }

      return false;
  }

  /**
   * getActiveServerUrl: Get the record for active server database.
   * @returns {Promise<string|null|undefined>}
   */
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

  /**
   * getActiveServerDatabase: Get the record for active server database.
   * @returns {Promise<Database|undefined>}
   */
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

  /**
   * setActiveServerDatabase: Set the new active server database.
   * This method should be called when switching to another server.
   * @param {string} serverUrl
   * @returns {Promise<void>}
   */
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

  /**
   * deleteServerDatabase: Removes the *.db file from the App-Group directory for iOS or the files directory on Android.
   * Also, it sets the last_active_at to '0' entry in the 'servers' table from the APP database
   * @param  {string} serverUrl
   * @returns {Promise<boolean>}
   */
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

  /**
   * destroyServerDatabase: Removes the *.db file from the App-Group directory for iOS or the files directory on Android.
   * Also, removes the entry in the 'servers' table from the APP database
   * @param  {string} serverUrl
   * @returns {Promise<boolean>}
   */
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

      // On Android, we'll delete both the *.db file and the *.db-journal file
      const androidFilesDir = `${this.androidFilesDirectory}databases/`;
      const databaseFile = `${androidFilesDir}${databaseName}.db`;
      const databaseJournal = `${androidFilesDir}${databaseName}.db-journal`;

      await FileSystem.deleteAsync(databaseFile);
      await FileSystem.deleteAsync(databaseJournal);
  }

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
          const androidFilesDir = `${FileSystem.documentDirectory}databases/`;
          await FileSystem.deleteAsync(androidFilesDir);
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
      return Platform.OS === 'ios' ? `${this.iOSAppGroupDatabase}/${dbName}.db` : `${FileSystem.documentDirectory}${dbName}.db`;
  };
}

if (!__DEV__) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    logger.silence();
}

export default new DatabaseManager();
