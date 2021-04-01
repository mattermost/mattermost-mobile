// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import logger from '@nozbe/watermelondb/utils/common/logger';
import {DeviceEventEmitter, Platform} from 'react-native';
import {FileSystem} from 'react-native-unimodules';

import {MIGRATION_EVENTS, MM_TABLES} from '@constants/database';
import DefaultMigration from '@database/default/migration';
import {App, Global, Servers} from '@database/default/models';
import {defaultSchema} from '@database/default/schema';
import ServerMigration from '@database/server/migration';
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
} from '@database/server/models';
import {serverSchema} from '@database/server/schema';
import type {
    ActiveServerDatabaseArgs,
    DatabaseConnectionArgs,
    DatabaseInstance,
    DatabaseInstances,
    DefaultNewServerArgs,
    MigrationEvents,
    Models,
} from '@typings/database/database';
import {DatabaseType} from '@typings/database/enums';
import IServers from '@typings/database/servers';
import {deleteIOSDatabase, getIOSAppGroupDetails} from '@utils/mattermost_managed';

const {SERVERS} = MM_TABLES.DEFAULT;

class DatabaseManager {
  private activeDatabase: DatabaseInstance;
  private defaultDatabase: DatabaseInstance;
  private readonly defaultModels: Models;
  private readonly iOSAppGroupDatabase: string | null;
  private readonly androidFilesDirectory: string | null;
  private readonly serverModels: Models;

  constructor() {
      this.defaultModels = [App, Global, Servers];
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

      this.iOSAppGroupDatabase = Platform.OS === 'ios' ? getIOSAppGroupDetails().appGroupDatabase : null;
      this.androidFilesDirectory = Platform.OS === 'android' ? FileSystem.documentDirectory : null;
  }

  /**
   * createDatabaseConnection: Creates database connection and registers the new connection into the default database.  However,
   * if a database connection could not be created, it will return undefined.
   * @param {MMDatabaseConnection} databaseConnection
   * @param {boolean} shouldAddToDefaultDatabase
   *
   * @returns {Promise<DatabaseInstance>}
   */
  createDatabaseConnection = async ({configs, shouldAddToDefaultDatabase = true}: DatabaseConnectionArgs): Promise<DatabaseInstance> => {
      const {
          actionsEnabled = true,
          dbName = 'default',
          dbType = DatabaseType.DEFAULT,
          serverUrl = undefined,
      } = configs;

      try {
          const databaseName = dbType === DatabaseType.DEFAULT ? 'default' : dbName;
          const databaseFilePath = this.getDatabaseDirectory(databaseName);
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
          if (serverUrl && shouldAddToDefaultDatabase) {
              await this.addServerToDefaultDatabase({
                  databaseFilePath,
                  displayName: dbName,
                  serverUrl,
              });
          }

          return new Database({adapter, actionsEnabled, modelClasses});
      } catch (e) {
          // TODO : report to sentry? Show something on the UI ?
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
  setActiveServerDatabase = async ({displayName, serverUrl}: ActiveServerDatabaseArgs) => {
      const isServerPresent = await this.isServerPresent(serverUrl);

      this.activeDatabase = await this.createDatabaseConnection({
          configs: {
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
  private isServerPresent = async (serverUrl: String) => {
      const allServers = await this.getAllServers();

      const existingServer = allServers?.filter((server) => {
          return server.url === serverUrl;
      });

      return existingServer && existingServer?.length > 0;
  };

  /**
   * getActiveServerDatabase: The DatabaseManager should be the only one setting the active database.  Hence, we have made the activeDatabase property private.
   * Use this getter method to retrieve the active database if it has been set in your code.
   * @returns {DatabaseInstance}
   */
  getActiveServerDatabase = (): DatabaseInstance => {
      return this.activeDatabase;
  };

  /**
   * getDefaultDatabase : Returns the default database.
   * @returns {Database} default database
   */
  getDefaultDatabase = async (): Promise<DatabaseInstance> => {
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
   * @returns {Promise<{url: string, dbInstance: DatabaseInstance}[] | null>}
   */
  retrieveDatabaseInstances = async (serverUrls?: string[]): Promise<DatabaseInstances[] | null> => {
      if (serverUrls?.length) {
          // Retrieve all server records from the default db
          const allServers = await this.getAllServers();

          // Filter only those servers that are present in the serverUrls array
          const servers = allServers!.filter((server: IServers) => {
              return serverUrls.includes(server.url);
          });

          // Creates server database instances
          if (servers.length) {
              const databasePromises = await servers.map(async (server: IServers) => {
                  const {displayName, url} = server;

                  // Since we are retrieving existing URL ( and so database connections ) from the 'DEFAULT' database, shouldAddToDefaultDatabase is set to false
                  const dbInstance = await this.createDatabaseConnection({
                      configs: {
                          actionsEnabled: true,
                          dbName: displayName,
                          dbType: DatabaseType.SERVER,
                          serverUrl: url,
                      },
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
              const serversRecords = (await defaultDB.collections.
                  get(SERVERS).
                  query(Q.where('url', serverUrl)).
                  fetch()) as IServers[];
              server = serversRecords?.[0] ?? undefined;

              if (server) {
                  // Perform a delete operation for this server record on the 'servers' table in default database
                  await defaultDB.action(async () => {
                      await server.destroyPermanently();
                  });

                  const databaseName = server.displayName;

                  if (Platform.OS === 'ios') {
                      // On iOS, we'll delete the *.db file under the shared app-group/databases folder
                      deleteIOSDatabase({databaseName});
                      return true;
                  }

                  // On Android, we'll delete both the *.db file and the *.db-journal file
                  const androidFilesDir = `${this.androidFilesDirectory}databases/`;
                  const databaseFile = `${androidFilesDir}${databaseName}.db`;
                  const databaseJournal = `${androidFilesDir}${databaseName}.db-journal`;

                  await FileSystem.deleteAsync(databaseFile);
                  await FileSystem.deleteAsync(databaseJournal);

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
      // console.log('An error occurred while trying to delete the databases directory);
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
      const allServers = defaultDatabase && ((await defaultDatabase.collections.get(MM_TABLES.DEFAULT.SERVERS).query().fetch()) as IServers[]);
      return allServers;
  };

  /**
   * setDefaultDatabase : Sets the default database.
   * @returns {Promise<DatabaseInstance>}
   */
  private setDefaultDatabase = async (): Promise<DatabaseInstance> => {
      this.defaultDatabase = await this.createDatabaseConnection({
          configs: {dbName: 'default'},
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
  private addServerToDefaultDatabase = async ({databaseFilePath, displayName, serverUrl}: DefaultNewServerArgs) => {
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
          // TODO : report to sentry? Show something on the UI ?
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
   * getDatabaseDirectory: Using the database name, this method will return the database directory for each platform.
   * On iOS, it will point towards the AppGroup shared directory while on Android, it will point towards the Files Directory.
   * Please note that in each case, the *.db files will be created/grouped under a 'databases' sub-folder.
   * iOS Simulator : appGroup => /Users/{username}/Library/Developer/CoreSimulator/Devices/DA6F1C73/data/Containers/Shared/AppGroup/ACA65327/databases"}
   * Android Device: file:///data/user/0/com.mattermost.rnbeta/files/databases
   *
   * @param {string} dbName
   * @returns {string}
   */
  private getDatabaseDirectory = (dbName: string): string => {
      return Platform.OS === 'ios' ? `${this.iOSAppGroupDatabase}/${dbName}.db` : `${FileSystem.documentDirectory}${dbName}.db`;
  };
}

if (!__DEV__) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    logger.silence();
}

export default new DatabaseManager();
