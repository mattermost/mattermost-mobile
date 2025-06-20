// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';
import {customProfileAttributeId} from '@utils/custom_profile_attribute';

import type {CustomProfileAttributeModel, CustomProfileFieldModel} from '@database/models/server';
import type {CustomProfileField, CustomProfileAttribute} from '@typings/api/custom_profile_attributes';
import type {TransformerArgs} from '@typings/database/database';

const {CUSTOM_PROFILE_FIELD, CUSTOM_PROFILE_ATTRIBUTE} = MM_TABLES.SERVER;

/**
 * transformCustomProfileFieldRecord: Prepares a record of the SERVER database 'CustomProfileField' table for update or create actions.
 * @param {TransformerArgs<CustomProfileFieldModel, CustomProfileField>} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<CustomProfileFieldModel>}
 */
export const transformCustomProfileFieldRecord = ({action, database, value}: TransformerArgs<CustomProfileFieldModel, CustomProfileField>): Promise<CustomProfileFieldModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        throw new Error('Record not found for non create action');
    }

    const fieldsMapper = (field: CustomProfileFieldModel) => {
        field._raw.id = isCreateAction ? raw.id : record!.id;
        field.groupId = raw.group_id;
        field.name = raw.name;
        field.type = raw.type;
        field.targetId = raw.target_id;
        field.targetType = raw.target_type;
        field.createAt = raw.create_at;
        field.updateAt = raw.update_at;
        field.deleteAt = raw.delete_at;
        field.attrs = raw.attrs || null;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CUSTOM_PROFILE_FIELD,
        value,
        fieldsMapper,
    });
};

/**
 * transformCustomProfileAttributeRecord: Prepares a record of the SERVER database 'CustomProfileAttribute' table for update or create actions.
 * @param {TransformerArgs<CustomProfileAttributeModel, CustomProfileAttribute>} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<CustomProfileAttributeModel>}
 */
export const transformCustomProfileAttributeRecord = ({action, database, value}: TransformerArgs<CustomProfileAttributeModel, CustomProfileAttribute>): Promise<CustomProfileAttributeModel> => {
    const raw = value.raw as CustomProfileAttribute;

    const fieldsMapper = (attribute: CustomProfileAttributeModel) => {
        attribute._raw.id = customProfileAttributeId(raw.field_id, raw.user_id);
        attribute.fieldId = raw.field_id;
        attribute.userId = raw.user_id;
        attribute.value = raw.value;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: CUSTOM_PROFILE_ATTRIBUTE,
        value,
        fieldsMapper,
    });
};
