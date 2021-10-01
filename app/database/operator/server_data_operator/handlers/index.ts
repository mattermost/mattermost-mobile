// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import DataOperatorException from '@database/exceptions/data_operator_exception';
import BaseDataOperator from '@database/operator/base_data_operator';
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

import type {Model} from '@nozbe/watermelondb';
import type {HandleCustomEmojiArgs, HandleRoleArgs, HandleSystemArgs, HandleTOSArgs, OperationArgs} from '@typings/database/database';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type RoleModel from '@typings/database/models/servers/role';
import type SystemModel from '@typings/database/models/servers/system';
import type TermsOfServiceModel from '@typings/database/models/servers/terms_of_service';

const {SERVER: {CUSTOM_EMOJI, ROLE, SYSTEM, TERMS_OF_SERVICE}} = MM_TABLES;

export default class ServerDataOperatorBase extends BaseDataOperator {
    handleRole = ({roles, prepareRecordsOnly = true}: HandleRoleArgs) => {
        if (!roles.length) {
            throw new DataOperatorException(
                'An empty "values" array has been passed to the handleRole',
            );
        }

        return this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordRoleEqualToRaw,
            transformer: transformRoleRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: roles, key: 'id'}),
            tableName: ROLE,
        }) as Promise<RoleModel[]>;
    }

    handleCustomEmojis = ({emojis, prepareRecordsOnly = true}: HandleCustomEmojiArgs) => {
        if (!emojis.length) {
            throw new DataOperatorException(
                'An empty "values" array has been passed to the handleCustomEmojis',
            );
        }

        return this.handleRecords({
            fieldName: 'name',
            findMatchingRecordBy: isRecordCustomEmojiEqualToRaw,
            transformer: transformCustomEmojiRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: emojis, key: 'name'}),
            tableName: CUSTOM_EMOJI,
        }) as Promise<CustomEmojiModel[]>;
    }

    handleSystem = ({systems, prepareRecordsOnly = true}: HandleSystemArgs) => {
        if (!systems.length) {
            throw new DataOperatorException(
                'An empty "values" array has been passed to the handleSystem',
            );
        }

        return this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordSystemEqualToRaw,
            transformer: transformSystemRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: systems, key: 'id'}),
            tableName: SYSTEM,
        }) as Promise<SystemModel[]>;
    }

    handleTermOfService = ({termOfService, prepareRecordsOnly = true}: HandleTOSArgs) => {
        if (!termOfService.length) {
            throw new DataOperatorException(
                'An empty "values" array has been passed to the handleTermOfService',
            );
        }

        return this.handleRecords({
            fieldName: 'id',
            findMatchingRecordBy: isRecordTermsOfServiceEqualToRaw,
            transformer: transformTermsOfServiceRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: termOfService, key: 'id'}),
            tableName: TERMS_OF_SERVICE,
        }) as Promise<TermsOfServiceModel[]>;
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
  execute = async ({createRaws, transformer, tableName, updateRaws}: OperationArgs): Promise<Model[]> => {
      const models = await this.prepareRecords({
          tableName,
          createRaws,
          updateRaws,
          transformer,
      });

      if (models?.length > 0) {
          await this.batchRecords(models);
      }

      return models;
  };
}
