// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import BaseDataOperator from '@database/operator/base_data_operator';
import {
    transformCustomEmojiRecord,
    transformRoleRecord,
    transformSystemRecord,
} from '@database/operator/server_data_operator/transformers/general';
import {getUniqueRawsBy} from '@database/operator/utils/general';

import type {Model} from '@nozbe/watermelondb';
import type {HandleCustomEmojiArgs, HandleRoleArgs, HandleSystemArgs, OperationArgs} from '@typings/database/database';
import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type RoleModel from '@typings/database/models/servers/role';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {CUSTOM_EMOJI, ROLE, SYSTEM}} = MM_TABLES;

export default class ServerDataOperatorBase extends BaseDataOperator {
    handleRole = async ({roles, prepareRecordsOnly = true}: HandleRoleArgs) => {
        if (!roles?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "roles" array has been passed to the handleRole',
            );
            return [];
        }

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformRoleRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: roles, key: 'id'}),
            tableName: ROLE,
        }) as Promise<RoleModel[]>;
    };

    handleCustomEmojis = async ({emojis, prepareRecordsOnly = true}: HandleCustomEmojiArgs) => {
        if (!emojis?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "emojis" array has been passed to the handleCustomEmojis',
            );
            return [];
        }

        return this.handleRecords({
            fieldName: 'name',
            transformer: transformCustomEmojiRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: emojis, key: 'name'}),
            tableName: CUSTOM_EMOJI,
        }) as Promise<CustomEmojiModel[]>;
    };

    handleSystem = async ({systems, prepareRecordsOnly = true}: HandleSystemArgs) => {
        if (!systems?.length) {
            // eslint-disable-next-line no-console
            console.warn(
                'An empty or undefined "systems" array has been passed to the handleSystem',
            );
            return [];
        }

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformSystemRecord,
            prepareRecordsOnly,
            createOrUpdateRawValues: getUniqueRawsBy({raws: systems, key: 'id'}),
            tableName: SYSTEM,
        }) as Promise<SystemModel[]>;
    };

    /**
     * execute: Handles the Create/Update operations on an table.
     * @param {OperationArgs} execute
     * @param {string} execute.tableName
     * @param {RecordValue[]} execute.createRaws
     * @param {RecordValue[]} execute.updateRaws
     * @param {(TransformerArgs) => Promise<Model>} execute.recordOperator
     * @returns {Promise<void>}
     */
    async execute({createRaws, transformer, tableName, updateRaws}: OperationArgs): Promise<Model[]> {
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
    }
}
