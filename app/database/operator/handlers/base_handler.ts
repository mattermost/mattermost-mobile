// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import Model from '@nozbe/watermelondb/Model';

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import DatabaseConnectionException from '@database/exceptions/database_connection_exception';
import DatabaseManager from '@database/manager';
import {
    isRecordAppEqualToRaw,
    isRecordCustomEmojiEqualToRaw,
    isRecordGlobalEqualToRaw,
    isRecordRoleEqualToRaw,
    isRecordServerEqualToRaw,
    isRecordSystemEqualToRaw,
    isRecordTermsOfServiceEqualToRaw,
} from '@database/operator/comparators';
import {
    prepareAppRecord,
    prepareCustomEmojiRecord,
    prepareGlobalRecord,
    prepareRoleRecord,
    prepareServersRecord,
    prepareSystemRecord,
    prepareTermsOfServiceRecord,
} from '@database/operator/prepareRecords/general';
import {
    getRangeOfValues,
    getRawRecordPairs,
    getUniqueRawsBy,
    getValidRecordsForUpdate,
    retrieveRecords,
} from '@database/operator/utils/general';
import {
    BatchOperationsArgs,
    DatabaseInstance,
    HandleEntityRecordsArgs,
    HandleIsolatedEntityArgs,
    PrepareForDatabaseArgs,
    PrepareRecordsArgs,
    ProcessInputsArgs,
    RawValue,
    RecordPair,
} from '@typings/database/database';
import {IsolatedEntities, OperationType} from '@typings/database/enums';

export interface BaseHandlerMix {
  activeDatabase: Database;
  getActiveDatabase: () => DatabaseInstance;
  setActiveDatabase: (database: Database) => void;
  handleIsolatedEntity: ({tableName, values, prepareRecordsOnly}: HandleIsolatedEntityArgs) => Model[];
  handleEntityRecords: ({findMatchingRecordBy, fieldName, operator, rawValues, tableName, prepareRecordsOnly}: HandleEntityRecordsArgs) => Promise<null | Model[]>;
  processInputs: ({rawValues, tableName, findMatchingRecordBy, fieldName}: ProcessInputsArgs) => Promise<{ createRaws: RecordPair[]; updateRaws: RecordPair[] }>;
  batchOperations: ({database, models}: BatchOperationsArgs) => Promise<void>;
  prepareRecords: ({database, tableName, createRaws, updateRaws, recordOperator}: PrepareRecordsArgs) => Promise<Model[]>;
  executeInDatabase: ({createRaws, recordOperator, tableName, updateRaws}: PrepareForDatabaseArgs) => Promise<void>;
  getDatabase: (tableName: string) => Database;
  getDefaultDatabase: () => Promise<Database>;
  getServerDatabase: () => Promise<Database>;
}

class BaseHandler {
  /**
   * activeDatabase : In a multi-server configuration, this connection will be used by WebSockets and other parties to update databases other than the active one.
   * @type {DatabaseInstance}
   */
  activeDatabase: DatabaseInstance;

  constructor(serverDatabase: Database) {
      this.activeDatabase = serverDatabase;
  }

  /**
   * getActiveDatabase : getter for the activeDatabase
   * @returns {DatabaseInstance}
   */
  getActiveDatabase = () => this.activeDatabase;

  /**
   * setActiveDatabase: setter for the activeDatabase
   * @param {} database
   */
  setActiveDatabase = (database: Database) => {
      this.activeDatabase = database;
  };

  /**
   * handleIsolatedEntity: Handler responsible for the Create/Update operations on the isolated entities as described
   * by the IsolatedEntities enum
   * @param {HandleIsolatedEntityArgs} isolatedEntityArgs
   * @param {IsolatedEntities} isolatedEntityArgs.tableName
   * @param {boolean} isolatedEntityArgs.prepareRecordsOnly
   * @param {RawValue} isolatedEntityArgs.values
   * @throws DataOperatorException
   * @returns {Model[]}
   */
  handleIsolatedEntity = async ({tableName, values, prepareRecordsOnly = true}: HandleIsolatedEntityArgs) => {
      let findMatchingRecordBy;
      let fieldName;
      let operator;
      let rawValues;
      let records: Model[] = [];

      if (!values.length) {
          throw new DataOperatorException(
              `An empty "values" array has been passed to the handleIsolatedEntity method for entity ${tableName}`,
          );
      }

      switch (tableName) {
          case IsolatedEntities.APP: {
              findMatchingRecordBy = isRecordAppEqualToRaw;
              fieldName = 'version_number';
              operator = prepareAppRecord;
              rawValues = getUniqueRawsBy({raws: values, key: 'version_number'});
              break;
          }
          case IsolatedEntities.CUSTOM_EMOJI: {
              findMatchingRecordBy = isRecordCustomEmojiEqualToRaw;
              fieldName = 'id';
              operator = prepareCustomEmojiRecord;
              rawValues = getUniqueRawsBy({raws: values, key: 'id'});
              break;
          }
          case IsolatedEntities.GLOBAL: {
              findMatchingRecordBy = isRecordGlobalEqualToRaw;
              fieldName = 'name';
              operator = prepareGlobalRecord;
              rawValues = getUniqueRawsBy({raws: values, key: 'name'});
              break;
          }
          case IsolatedEntities.ROLE: {
              findMatchingRecordBy = isRecordRoleEqualToRaw;
              fieldName = 'id';
              operator = prepareRoleRecord;
              rawValues = getUniqueRawsBy({raws: values, key: 'id'});
              break;
          }
          case IsolatedEntities.SERVERS: {
              findMatchingRecordBy = isRecordServerEqualToRaw;
              fieldName = 'url';
              operator = prepareServersRecord;
              rawValues = getUniqueRawsBy({raws: values, key: 'display_name'});
              break;
          }
          case IsolatedEntities.SYSTEM: {
              findMatchingRecordBy = isRecordSystemEqualToRaw;
              fieldName = 'name';
              operator = prepareSystemRecord;
              rawValues = getUniqueRawsBy({raws: values, key: 'name'});
              break;
          }
          case IsolatedEntities.TERMS_OF_SERVICE: {
              findMatchingRecordBy = isRecordTermsOfServiceEqualToRaw;
              fieldName = 'id';
              operator = prepareTermsOfServiceRecord;
              rawValues = getUniqueRawsBy({raws: values, key: 'id'});
              break;
          }
          default: {
              throw new DataOperatorException(
                  `handleIsolatedEntity was called with an invalid table name ${tableName}`,
              );
          }
      }

      if (fieldName && findMatchingRecordBy) {
          records = await this.handleEntityRecords({
              fieldName,
              findMatchingRecordBy,
              operator,
              prepareRecordsOnly,
              rawValues,
              tableName,
          });

          return records;
      }

      return records;
  };

  /**
   * handleEntityRecords : Utility that processes some entities' data against values already present in the database so as to avoid duplicity.
   * @param {HandleEntityRecordsArgs} handleEntityArgs
   * @param {(existing: Model, newElement: RawValue) => boolean} handleEntityArgs.findMatchingRecordBy
   * @param {string} handleEntityArgs.fieldName
   * @param {(DataFactoryArgs) => Promise<Model>} handleEntityArgs.operator
   * @param {RawValue[]} handleEntityArgs.rawValues
   * @param {string} handleEntityArgs.tableName
   * @returns {Promise<Model[]>}
   */
  handleEntityRecords = async ({findMatchingRecordBy, fieldName, operator, rawValues, tableName, prepareRecordsOnly = true}: HandleEntityRecordsArgs) => {
      if (!rawValues.length) {
          throw new DataOperatorException(
              `An empty "rawValues" array has been passed to the handleEntityRecords method for tableName ${tableName}`,
          );
      }
      const {createRaws, updateRaws} = await this.processInputs({
          rawValues,
          tableName,
          findMatchingRecordBy,
          fieldName,
      });

      const database = await this.getDatabase(tableName);

      let models: Model[] = [];
      models = await this.prepareRecords({
          database,
          tableName,
          createRaws,
          updateRaws,
          recordOperator: operator,
      });

      if (prepareRecordsOnly) {
          return models;
      }

      if (models?.length > 0) {
          await this.batchOperations({database, models});
      }

      return models;
  };

  /**
   * processInputs: This method weeds out duplicates entries.  It may happen that we do multiple inserts for
   * the same value.  Hence, prior to that we query the database and pick only those values that are  'new' from the 'Raw' array.
   * @param {ProcessInputsArgs} inputsArg
   * @param {RawValue[]} inputsArg.rawValues
   * @param {string} inputsArg.tableName
   * @param {string} inputsArg.fieldName
   * @param {(existing: Model, newElement: RawValue) => boolean} inputsArg.findMatchingRecordBy
   * @returns {Promise<{createRaws: RecordPair[], updateRaws: RecordPair[]} | {createRaws: RecordPair[], updateRaws: RecordPair[]}>}
   */
  processInputs = async ({rawValues, tableName, findMatchingRecordBy, fieldName}: ProcessInputsArgs) => {
      // We will query an entity where one of its fields can match a range of values.  Hence, here we are extracting all those potential values.
      const columnValues: string[] = getRangeOfValues({
          fieldName,
          raws: rawValues,
      });

      const database = await this.getDatabase(tableName);

      const existingRecords = await retrieveRecords({
          database,
          tableName,
          condition: Q.where(fieldName, Q.oneOf(columnValues)),
      });

      const createRaws: RecordPair[] = [];
      const updateRaws: RecordPair[] = [];

      if (existingRecords.length > 0) {
          rawValues.forEach((newElement: RawValue) => {
              const findIndex = existingRecords.findIndex((existing) => {
                  return findMatchingRecordBy(existing, newElement);
              });

              // We found a record in the database that matches this element; hence, we'll proceed for an UPDATE operation
              if (findIndex > -1) {
                  const existingRecord = existingRecords[findIndex];

                  // Some raw value has an update_at field.  We'll proceed to update only if the update_at value is different from the record's value in database
                  const updateRecords = getValidRecordsForUpdate({
                      tableName,
                      existingRecord,
                      newValue: newElement,
                  });

                  return updateRaws.push(updateRecords);
              }

              // This RawValue is not present in the database; hence, we need to create it
              return createRaws.push({record: undefined, raw: newElement});
          });

          return {
              createRaws,
              updateRaws,
          };
      }

      return {
          createRaws: getRawRecordPairs(rawValues),
          updateRaws,
      };
  };

  /**
   * batchOperations: Accepts an instance of Database (either Default or Server) and an array of
   * prepareCreate/prepareUpdate 'models' and executes the actions on the database.
   * @param {BatchOperationsArgs} operation
   * @param {Database} operation.database
   * @param {Array} operation.models
   * @throws {DataOperatorException}
   * @returns {Promise<void>}
   */
  batchOperations = async ({database, models}: BatchOperationsArgs) => {
      try {
          if (models.length > 0) {
              await database.action(async () => {
                  await database.batch(...models);
              });
          }
      } catch (e) {
          throw new DataOperatorException('batchOperations error ', e);
      }
  };

  /**
   * prepareRecords: Utility method that actually calls the operators for the handlers
   * @param {PrepareRecordsArgs} prepareRecord
   * @param {Database} prepareRecord.database
   * @param {string} prepareRecord.tableName
   * @param {RawValue[]} prepareRecord.createRaws
   * @param {RawValue[]} prepareRecord.updateRaws
   * @param {(DataFactoryArgs) => Promise<Model>;} prepareRecord.recordOperator
   * @throws {DataOperatorException}
   * @returns {Promise<Model[]>}
   */
  prepareRecords = async ({database, tableName, createRaws, updateRaws, recordOperator}: PrepareRecordsArgs) => {
      if (!database) {
          throw new DataOperatorException(
              'prepareRecords accepts only rawPosts of type RawValue[] or valid database connection',
          );
      }

      let preparedRecords: Promise<Model>[] = [];

      // create operation
      if (createRaws?.length) {
          const recordPromises = createRaws.map(
              (createRecord: RecordPair) => {
                  return recordOperator({
                      database,
                      tableName,
                      value: createRecord,
                      action: OperationType.CREATE,
                  });
              },
          );

          preparedRecords = preparedRecords.concat(recordPromises);
      }

      // update operation
      if (updateRaws?.length) {
          const recordPromises = updateRaws.map(
              (updateRecord: RecordPair) => {
                  return recordOperator({
                      database,
                      tableName,
                      value: updateRecord,
                      action: OperationType.UPDATE,
                  });
              },
          );

          preparedRecords = preparedRecords.concat(recordPromises);
      }

      const results = await Promise.all(preparedRecords);
      return results;
  };

  /**
   * executeInDatabase: Handles the Create/Update operations on an entity.
   * @param {PrepareForDatabaseArgs} executeInDatabase
   * @param {string} executeInDatabase.tableName
   * @param {RecordValue[]} executeInDatabase.createRaws
   * @param {RecordValue[]} executeInDatabase.updateRaws
   * @param {(DataFactoryArgs) => Promise<Model>} executeInDatabase.recordOperator
   * @returns {Promise<void>}
   */
  executeInDatabase = async ({createRaws, recordOperator, tableName, updateRaws}: PrepareForDatabaseArgs) => {
      const database = await this.getDatabase(tableName);

      const models = await this.prepareRecords({
          database,
          tableName,
          createRaws,
          updateRaws,
          recordOperator,
      });

      if (models?.length > 0) {
          await this.batchOperations({database, models});
      }
  };

  /**
   * getDatabase: Based on the table's name, it will return a database instance either from the 'DEFAULT' database or
   * the 'SERVER' database
   * @param {string} tableName
   * @returns {Promise<Database>}
   */
  getDatabase = async (tableName: string) => {
      const isDefaultConnection = Object.values(MM_TABLES.DEFAULT).some((tbName) => {
          return tableName === tbName;
      });

      const promise = isDefaultConnection ? this.getDefaultDatabase : this.getServerDatabase;
      const connection = await promise();

      return connection;
  };

  /**
   * getDefaultDatabase: Returns the default database
   * @throws {DatabaseConnectionException}
   * @returns {Promise<Database>}
   */
  getDefaultDatabase = async () => {
      const databaseManagerClient = new DatabaseManager();
      const connection = await databaseManagerClient.getDefaultDatabase();
      if (connection === undefined) {
          throw new DatabaseConnectionException(
              'An error occurred while retrieving the default database',
              '',
          );
      }
      return connection;
  };

  /**
   * getServerDatabase: Returns the current active server database (multi-server support)
   * @throws {DatabaseConnectionException}
   * @returns {Promise<Database>}
   */
  getServerDatabase = async () => {
      // Third parties trying to update the database
      if (this.activeDatabase) {
          return this.activeDatabase;
      }

      throw new DatabaseConnectionException(
          "This operator client didn't have its activeDatabase set",
          '',
      );
  };
}

export default BaseHandler;
