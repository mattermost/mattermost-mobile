// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

import {MM_TABLES} from '@constants/database';
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
import logger from '@nozbe/watermelondb/utils/common/logger';
import {
    ActiveServerDatabaseArgs,
    DatabaseConnectionArgs,
    DatabaseInstance,
    DatabaseInstances,
    DefaultNewServerArgs, GetDatabaseConnectionArgs,
    Models,
    RetrievedDatabase,
} from '@typings/database/database';
import {DatabaseType} from '@typings/database/enums';
import IServers from '@typings/database/servers';
import urlParse from 'url-parse';

const {SERVERS} = MM_TABLES.DEFAULT;
const DEFAULT_DATABASE = 'default';

if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    logger.silence();
}

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
      this.iOSAppGroupDatabase = null;
      this.androidFilesDirectory = null;
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
   * @param {DatabaseConfigs} databaseConnection
   * @param {boolean} shouldAddToDefaultDatabase
   *
   * @returns {Promise<DatabaseInstance>}
   */
  createDatabaseConnection = async ({configs, shouldAddToDefaultDatabase = true}: DatabaseConnectionArgs): Promise<DatabaseInstance> => {
      const {actionsEnabled = true, dbName = DEFAULT_DATABASE, dbType = DatabaseType.DEFAULT, serverUrl = undefined} = configs;

      try {
          const databaseName = dbType === DatabaseType.DEFAULT ? DEFAULT_DATABASE : dbName;

          // const databaseFilePath = this.getDatabaseDirectory(databaseName);
          const migrations = dbType === DatabaseType.DEFAULT ? DefaultMigration : ServerMigration;
          const modelClasses = dbType === DatabaseType.DEFAULT ? this.defaultModels : this.serverModels;
          const schema = dbType === DatabaseType.DEFAULT ? defaultSchema : serverSchema;

          const adapter = new LokiJSAdapter({
              dbName: databaseName,
              migrations,
              schema,
              useWebWorker: false,
              useIncrementalIndexedDB: true,
          });

          // Registers the new server connection into the DEFAULT database
          if (serverUrl && shouldAddToDefaultDatabase) {
              await this.addServerToDefaultDatabase({
                  databaseFilePath: databaseName,
                  displayName: dbName,
                  serverUrl,
              });
          }
          return new Database({adapter, actionsEnabled, modelClasses});
      } catch (e) {
          // eslint-disable-next-line no-console
          console.log('createDatabaseConnection ERROR:', e);
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
  isServerPresent = async (serverUrl: string) => {
      const allServers = await this.getAllServers([serverUrl]);
      return allServers?.length > 0;
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
   * @returns {Promise<RetrievedDatabase[] | null>}
   */
  retrieveDatabaseInstances = async (serverUrls: string[]): Promise<DatabaseInstances[] | null> => {
      // Retrieve all server records from the default db
      const allServers = await this.getAllServers(serverUrls);

      // Creates server database instances
      if (allServers.length) {
          const databasePromises = allServers.map(async (server: IServers) => {
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
              return {url, dbInstance, displayName};
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
              const serversRecords = (await defaultDB.collections.get(SERVERS).query(Q.where('url', serverUrl)).fetch()) as IServers[];
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
          return false;
      }
  };

  /**
   * getAllServers : Retrieves all the servers registered in the default database
   * @returns {Promise<undefined | Servers[]>}
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
          // eslint-disable-next-line no-console
          console.log('addServerToDefaultDatabase ERROR:', e);
      }
  };
}

export default new DatabaseManager();
