// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import BaseDataOperator from '@database/operator/base_data_operator';
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

const {SERVER: {CUSTOM_EMOJI, ROLE, SYSTEM, TERMS_OF_SERVICE}} = MM_TABLES;

export default class ServerDataOperatorBase extends BaseDataOperator {
    handleRole = async ({roles, prepareRecordsOnly = true}: HandleRoleArgs) => {
        if (!roles.length) {
            throw new DataOperatorException(
                'An empty "values" array has been passed to the handleRole',
            );
        }

        const records = await this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordRoleEqualToRaw,
            transformer: transformRoleRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: roles, key: 'id'}),
            tableName: ROLE,
        });

        return records;
    }

    handleCustomEmojis = async ({emojis, prepareRecordsOnly = true}: HandleCustomEmojiArgs) => {
        if (!emojis.length) {
            throw new DataOperatorException(
                'An empty "values" array has been passed to the handleCustomEmojis',
            );
        }

        const records = await this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordCustomEmojiEqualToRaw,
            transformer: transformCustomEmojiRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: emojis, key: 'id'}),
            tableName: CUSTOM_EMOJI,
        });

        return records;
    }

    handleSystem = async ({systems, prepareRecordsOnly = true}: HandleSystemArgs) => {
        if (!systems.length) {
            throw new DataOperatorException(
                'An empty "values" array has been passed to the handleSystem',
            );
        }

        const records = await this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordSystemEqualToRaw,
            transformer: transformSystemRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: systems, key: 'id'}),
            tableName: SYSTEM,
        });

        return records;
    }

    handleTermOfService = async ({termOfService, prepareRecordsOnly = true}: HandleTOSArgs) => {
        if (!termOfService.length) {
            throw new DataOperatorException(
                'An empty "values" array has been passed to the handleTermOfService',
            );
        }

        const records = await this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordTermsOfServiceEqualToRaw,
            transformer: transformTermsOfServiceRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: termOfService, key: 'id'}),
            tableName: TERMS_OF_SERVICE,
        });

        return records;
    }

  /**
   * execute: Handles the Create/Update operations on an table.
   * @param {OperationArgs} execute
   * @param {string} execute.tableName
   * @param {RecordValue[]} execute.createRaws
   * @param {RecordValue[]} execute.updateRaws
   * @param {(TransformerArgs) => Promise<Model>} execute.recordOperator
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
