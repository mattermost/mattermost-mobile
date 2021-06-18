// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import BaseDataOperator, {BaseDataOperatorType} from '@database/operator/base_data_operator';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import {
    isRecordCustomEmojiEqualToRaw,
    isRecordRoleEqualToRaw,
    isRecordSystemEqualToRaw,
    isRecordTermsOfServiceEqualToRaw,
} from '@database/operator/server_data_operator/comparators';
import {
    transformCustomEmojiRecord,
    transformRoleRecord,
    transformSystemRecord,
    transformTermsOfServiceRecord,
} from '@database/operator/server_data_operator/transformers/general';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {HandleCustomEmojiArgs, HandleRoleArgs, HandleSystemArgs, HandleTOSArgs, OperationArgs} from '@typings/database/database';
import System from '@typings/database/system';
import TermsOfService from '@typings/database/terms_of_service';

export interface ServerDataOperatorMix extends BaseDataOperatorType {
    handleRole : (args: HandleRoleArgs) => Promise<Role[]>,
    handleCustomEmojis : (args: HandleCustomEmojiArgs) => Promise<CustomEmoji[]>,
    handleSystem : (args: HandleSystemArgs) => Promise<System[]>,
    handleTermOfService : (args: HandleTOSArgs) => Promise<TermsOfService[]>,
    execute: ({createRaws, transformer, tableName, updateRaws}: OperationArgs) => Promise<void>;
}

const {SERVER: {CUSTOM_EMOJI, ROLE, SYSTEM, TERMS_OF_SERVICE}} = MM_TABLES;

export default class ServerDataOperator extends BaseDataOperator {
    handleRole = async ({roles, prepareRecordsOnly = true}: HandleRoleArgs) => {
        if (!roles.length) {
            throw new DataOperatorException(
                `An empty "values" array has been passed to the handleIsolatedEntity method for entity ${ROLE}`,
            );
        }

        const records = await this.handleEntityRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordRoleEqualToRaw,
            transformer: transformRoleRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: roles, key: 'id'}),
            deleteRawValues: [],
            tableName: ROLE,
        });

        return records;
    }

    handleCustomEmojis = async ({emojis, prepareRecordsOnly = true}: HandleCustomEmojiArgs) => {
        if (!emojis.length) {
            throw new DataOperatorException(
                `An empty "values" array has been passed to the handleIsolatedEntity method for entity ${CUSTOM_EMOJI}`,
            );
        }

        const records = await this.handleEntityRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordCustomEmojiEqualToRaw,
            transformer: transformCustomEmojiRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: emojis, key: 'id'}),
            deleteRawValues: [],
            tableName: CUSTOM_EMOJI,
        });

        return records;
    }

    handleSystem = async ({systems, prepareRecordsOnly = true}: HandleSystemArgs) => {
        if (!systems.length) {
            throw new DataOperatorException(
                `An empty "values" array has been passed to the handleIsolatedEntity method for entity ${SYSTEM}`,
            );
        }

        const records = await this.handleEntityRecords({
            fieldName: 'name',
            findMatchingRecordBy: isRecordSystemEqualToRaw,
            transformer: transformSystemRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: systems, key: 'name'}),
            deleteRawValues: [],
            tableName: SYSTEM,
        });

        return records;
    }

    handleTermOfService = async ({termOfService, prepareRecordsOnly = true}: HandleTOSArgs) => {
        if (!termOfService.length) {
            throw new DataOperatorException(
                `An empty "values" array has been passed to the handleIsolatedEntity method for entity ${TERMS_OF_SERVICE}`,
            );
        }

        const records = await this.handleEntityRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordTermsOfServiceEqualToRaw,
            transformer: transformTermsOfServiceRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: termOfService, key: 'id'}),
            deleteRawValues: [],
            tableName: TERMS_OF_SERVICE,
        });

        return records;
    }

  /**
   * execute: Handles the Create/Update operations on an entity.
   * @param {OperationArgs} executeInDatabase
   * @param {string} executeInDatabase.tableName
   * @param {RecordValue[]} executeInDatabase.createRaws
   * @param {RecordValue[]} executeInDatabase.updateRaws
   * @param {(TransformerArgs) => Promise<Model>} executeInDatabase.recordOperator
   * @returns {Promise<void>}
   */
  execute = async ({createRaws, transformer, tableName, updateRaws}: OperationArgs) => {
      const models = await this.prepareRecords({
          tableName,
          createRaws,
          updateRaws,
          transformer,
      });

      if (models?.length > 0) {
          await this.batchRecords(models);
      }
  };
}
