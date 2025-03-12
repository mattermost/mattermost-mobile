// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type {CustomProfileAttributeModel, CustomProfileFieldModel} from '@database/models/server';
import type Model from '@nozbe/watermelondb/Model';
import type {CustomProfileField, CustomProfileAttributeSimple} from '@typings/api/custom_profile_attributes';
import type {TransformerArgs} from '@typings/database/database';

const {CUSTOM_PROFILE_FIELD, CUSTOM_PROFILE_ATTRIBUTE} = MM_TABLES.SERVER;

/**
 * transformCustomProfileFieldRecord: Prepares a record of the SERVER database 'CustomProfileField' table for update or create actions.
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformCustomProfileFieldRecord = ({action, database, value}: TransformerArgs): Promise<Model> => {
    const raw = value.raw as unknown as CustomProfileField;
    const record = value.record as Model;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (field: CustomProfileFieldModel) => {
        field._raw.id = isCreateAction ? raw.id : record.id;
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
 * @param {TransformerArgs} operator
 * @param {Database} operator.database
 * @param {RecordPair} operator.value
 * @returns {Promise<Model>}
 */
export const transformCustomProfileAttributeRecord = ({action, database, value}: TransformerArgs): Promise<Model> => {
    const raw = value.raw as unknown as CustomProfileAttributeSimple;
    const record = value.record as Model;
    const isCreateAction = action === OperationType.CREATE;

    const fieldsMapper = (attribute: CustomProfileAttributeModel) => {
        attribute._raw.id = isCreateAction ? attribute.id : record.id;
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
