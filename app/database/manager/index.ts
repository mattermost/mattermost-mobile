// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import logger from '@nozbe/watermelondb/utils/common/logger';
import {DeviceEventEmitter, Platform} from 'react-native';
import {FileSystem} from 'react-native-unimodules';

import {MIGRATION_EVENTS, MM_TABLES} from '@constants/database';
import DefaultMigration from '@database/migration/default';
import {App, Global, Servers} from '@database/models/default';
import {defaultSchema} from '@database/schema/default';
import ServerMigration from '@database/migration/server';
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
} from '@database/models/server';
import {serverSchema} from '@database/schema/server';
import {
    ActiveServerDatabaseArgs,
    DatabaseConnectionArgs,
    DatabaseInstance,
    DatabaseInstances,
    DefaultNewServerArgs,
    GetDatabaseConnectionArgs,
    MigrationEvents,
    Models,
    RetrievedDatabase,
} from '@typings/database/database';
import {DatabaseType} from '@typings/database/enums';
import IServers from '@typings/database/servers';
import {deleteIOSDatabase, getIOSAppGroupDetails} from '@utils/mattermost_managed';
import urlParse from 'url-parse';

const {SERVERS} = MM_TABLES.DEFAULT;
const DEFAULT_DATABASE = 'default';

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
     * getDatabaseConnection: Given a server url (serverUrl) and a flag (setAsActiveDatabase), this method will attempt
     * to retrieve an existing database connection previously created for that url.  If not found, it will create a new connection and register it in the DEFAULT_DATABASE
     * @param {string} serverUrl
     * @param {boolean} setAsActiveDatabase
     * @returns {Promise<DatabaseInstance>}
     */
  getDatabaseConnection = async ({serverUrl, setAsActiveDatabase}: GetDatabaseConnectionArgs) => {
      // We potentially already have this server registered; so we'll try to retrieve it if it is present under DEFAULT_DATABASE/GLOBAL entity
      const existingServers = await this.retrieveDatabaseInstances([serverUrl]) as RetrievedDatabase[];

      // Since we only passed one serverUrl, we'll expect only one value in the array
      const serverDatabase = existingServers?.[0];

      let connection: DatabaseInstance;
      let databaseName: string;

      if (serverDatabase) {
          // This serverUrl has previously been registered on the app
          databaseName = serverDatabase.displayName;
          connection = serverDatabase.dbInstance;
      } else {
          // Or, it might be that the user has this server on the web-app but not mobile-app; so we'll need to create a new entry for this new serverUrl
          databaseName = urlParse(serverUrl).hostname;
          connection = await this.createDatabaseConnection({
              shouldAddToDefaultDatabase: true,
              configs: {
                  actionsEnabled: true,
                  dbName: databaseName,
                  dbType: DatabaseType.SERVER,
                  serverUrl,
              },
          });
      }

      if (setAsActiveDatabase) {
          await this.setActiveServerDatabase({serverUrl, displayName: databaseName});
      }

      return connection;
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
      const {actionsEnabled = true, dbName = DEFAULT_DATABASE, dbType = DatabaseType.DEFAULT, serverUrl = undefined} = configs;

      try {
          const databaseName = dbType === DatabaseType.DEFAULT ? DEFAULT_DATABASE : dbName;

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

      //fixme: use a 'flag' under the GLOBAL entity called 'recentlyUsedServer'. This flag will contain an array of recently connected servers and the server at index 0 will be the last server visited/viewed
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
  private isServerPresent = async (serverUrl: string) => {
      const allServers = await this.getAllServers([serverUrl]);

      // const existingServer = allServers?.filter((server) => {
      //     return server.url === serverUrl;
      // });

      return allServers?.length > 0;
  };

  /**
   * getActiveServerDatabase: The DatabaseManager should be the only one setting the active database.  Hence, we have made the activeDatabase property private.
   * Use this getter method to retrieve the active database if it has been set in your code.
   * @returns {DatabaseInstance}
   */
  getActiveServerDatabase = (): DatabaseInstance => {
      //fixme: read index 0 from 'flag' from GLOBAL entity  and return it.
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
   * @returns {Promise<RetrievedDatabase[] | null>}
   */
  retrieveDatabaseInstances = async (serverUrls: string[]): Promise<DatabaseInstances[] | null> => {
      // Retrieve all server records from the default db
      const allServers = await this.getAllServers(serverUrls);

      // Creates server database instances
      if (allServers.length) {
          const databasePromises = await allServers.map(async (server: IServers) => {
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

              return {dbInstance, displayName, url};
          });
          const databaseInstances = await Promise.all(databasePromises);
          return databaseInstances;
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
              // NOTE: We are deleting this 'database' entry in the SERVERS entity on the DEFAULT database; for that we retrieve its record first.
              const serversRecords = (await defaultDB.collections.get(SERVERS).query(Q.where('url', serverUrl)).fetch()) as IServers[];
              server = serversRecords?.[0] ?? undefined;

              if (server) {
                  const databaseName = server.displayName;

                  // Perform a delete operation for this server record on the 'servers' table in default database
                  await defaultDB.action(async () => {
                      await server.destroyPermanently();
                  });

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
          return false;
      }
  };

  /**
   * getAllServers : Retrieves all the servers registered in the default database
   * @returns {Promise<Servers[]>}
   */
  private getAllServers = async (serverUrls: string[]) => {
      // Retrieve all server records from the default db
      const defaultDatabase = await this.getDefaultDatabase();

      if (defaultDatabase) {
          const allServers = (await defaultDatabase.collections.get(SERVERS).query(Q.where('url', Q.oneOf(serverUrls))).fetch() as IServers[]);
          return allServers;
      }

      return [];
  };

  /**
   * setDefaultDatabase : Sets the default database.
   * @returns {Promise<DatabaseInstance>}
   */
  private setDefaultDatabase = async (): Promise<DatabaseInstance> => {
      this.defaultDatabase = await this.createDatabaseConnection({
          configs: {dbName: DEFAULT_DATABASE},
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
                  const serversCollection = defaultDatabase.collections.get(SERVERS);
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
