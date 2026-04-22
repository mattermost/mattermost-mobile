// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, OperationType} from '@constants/database';
import {prepareBaseRecord} from '@database/operator/server_data_operator/transformers/index';

import type {PropertyFieldModel, PropertyValueModel, ViewModel} from '@database/models/server';
import type {TransformerArgs} from '@typings/database/database';

const {VIEW, PROPERTY_FIELD, PROPERTY_VALUE} = MM_TABLES.SERVER;

/**
 * transformViewRecord: Prepares a record of the SERVER database 'BoardView' table for update or create actions.
 */
export const transformViewRecord = ({action, database, value}: TransformerArgs<ViewModel, View>): Promise<ViewModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    const fieldsMapper = (view: ViewModel) => {
        view._raw.id = isCreateAction ? (raw.id ?? view.id) : record!.id;
        view.channelId = raw.channel_id ?? record?.channelId ?? '';
        view.type = raw.type ?? record?.type ?? 'kanban';
        view.creatorId = raw.creator_id ?? record?.creatorId ?? '';
        view.title = raw.title ?? record?.title ?? '';
        view.description = raw.description ?? record?.description ?? null;
        view.sortOrder = raw.sort_order ?? record?.sortOrder ?? 0;
        view.props = raw.props ?? record?.props ?? null;
        view.createAt = raw.create_at ?? record?.createAt ?? 0;
        view.updateAt = raw.update_at ?? record?.updateAt ?? 0;
        view.deleteAt = raw.delete_at ?? record?.deleteAt ?? 0;
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: VIEW,
        value,
        fieldsMapper,
    });
};

/**
 * transformPropertyFieldRecord: Prepares a record of the SERVER database 'PropertyField' table for update or create actions.
 */
export const transformPropertyFieldRecord = ({action, database, value}: TransformerArgs<PropertyFieldModel, PropertyField>): Promise<PropertyFieldModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    const fieldsMapper = (field: PropertyFieldModel) => {
        field._raw.id = isCreateAction ? (raw.id ?? field.id) : record!.id;
        field.groupId = raw.group_id ?? record?.groupId ?? '';
        field.name = raw.name ?? record?.name ?? '';
        field.type = raw.type ?? record?.type ?? '';
        field.attrs = raw.attrs ?? record?.attrs ?? null;
        field.objectType = raw.object_type ?? record?.objectType ?? '';
        field.targetId = raw.target_id ?? record?.targetId ?? '';
        field.targetType = raw.target_type ?? record?.targetType ?? '';
        field.protected = raw.protected ?? record?.protected ?? false;
        field.permissionField = raw.permission_field ?? record?.permissionField ?? null;
        field.permissionValues = raw.permission_values ?? record?.permissionValues ?? null;
        field.permissionOptions = raw.permission_options ?? record?.permissionOptions ?? null;
        field.createAt = raw.create_at ?? record?.createAt ?? 0;
        field.updateAt = raw.update_at ?? record?.updateAt ?? 0;
        field.deleteAt = raw.delete_at ?? record?.deleteAt ?? 0;
        field.createdBy = raw.created_by ?? record?.createdBy ?? '';
        field.updatedBy = raw.updated_by ?? record?.updatedBy ?? '';
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: PROPERTY_FIELD,
        value,
        fieldsMapper,
    });
};

/**
 * transformPropertyValueRecord: Prepares a record of the SERVER database 'PropertyValue' table for update or create actions.
 */
export const transformPropertyValueRecord = ({action, database, value}: TransformerArgs<PropertyValueModel, PropertyValue>): Promise<PropertyValueModel> => {
    const raw = value.raw;
    const record = value.record;
    const isCreateAction = action === OperationType.CREATE;
    if (!isCreateAction && !record) {
        return Promise.reject(new Error('Record not found for non create action'));
    }

    const fieldsMapper = (propertyValue: PropertyValueModel) => {
        propertyValue._raw.id = isCreateAction ? (raw.id ?? propertyValue.id) : record!.id;
        propertyValue.fieldId = raw.field_id ?? record?.fieldId ?? '';
        propertyValue.targetId = raw.target_id ?? record?.targetId ?? '';
        propertyValue.targetType = raw.target_type ?? record?.targetType ?? '';
        propertyValue.groupId = raw.group_id ?? record?.groupId ?? '';
        const hasValueField = raw && 'value' in raw;
        propertyValue.value = hasValueField ? raw.value : (record?.value ?? null);
        propertyValue.createAt = raw.create_at ?? record?.createAt ?? 0;
        propertyValue.updateAt = raw.update_at ?? record?.updateAt ?? 0;
        propertyValue.deleteAt = raw.delete_at ?? record?.deleteAt ?? 0;
        propertyValue.createdBy = raw.created_by ?? record?.createdBy ?? '';
        propertyValue.updatedBy = raw.updated_by ?? record?.updatedBy ?? '';
    };

    return prepareBaseRecord({
        action,
        database,
        tableName: PROPERTY_VALUE,
        value,
        fieldsMapper,
    });
};
