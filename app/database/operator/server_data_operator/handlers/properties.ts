// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {
    transformPropertyFieldRecord,
    transformPropertyValueRecord,
} from '@database/operator/server_data_operator/transformers/properties';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {logWarning} from '@utils/log';

import type ServerDataOperatorBase from '.';
import type {PropertyFieldModel, PropertyValueModel} from '@database/models/server';
import type Model from '@nozbe/watermelondb/Model';
import type {
    HandleDeletePropertyFieldArgs,
    HandleDeletePropertyFieldsByNameArgs,
    HandlePropertyFieldsArgs,
    HandlePropertyFieldsByGroupIdArgs,
    HandlePropertyValuesArgs,
    HandlePropertyValuesByTargetIdArgs,
} from '@typings/database/database';

const {PROPERTY_FIELD, PROPERTY_VALUE} = MM_TABLES.SERVER;

export interface PropertiesHandlerMix {
    handlePropertyFields: ({fields, prepareRecordsOnly}: HandlePropertyFieldsArgs) => Promise<Model[]>;
    handlePropertyValues: ({values, prepareRecordsOnly}: HandlePropertyValuesArgs) => Promise<Model[]>;
    handlePropertyFieldsByGroupId: ({groupId, fields, prepareRecordsOnly}: HandlePropertyFieldsByGroupIdArgs) => Promise<Model[]>;
    handlePropertyValuesByTargetId: ({targetId, values, prepareRecordsOnly}: HandlePropertyValuesByTargetIdArgs) => Promise<Model[]>;
    handleDeletePropertyField: ({fieldId, prepareRecordsOnly}: HandleDeletePropertyFieldArgs) => Promise<Model[]>;
    handleDeletePropertyFieldsByName: ({names, prepareRecordsOnly}: HandleDeletePropertyFieldsByNameArgs) => Promise<Model[]>;
}

const PropertiesHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass {
    /**
     * handlePropertyFields: Handler responsible for the Create/Update operations on the PropertyField table.
     */
    handlePropertyFields = async ({fields, prepareRecordsOnly = true}: HandlePropertyFieldsArgs): Promise<Model[]> => {
        if (!fields?.length) {
            logWarning('An empty or undefined "fields" array has been passed to the handlePropertyFields method');
            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: fields, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformPropertyFieldRecord,
            createOrUpdateRawValues,
            tableName: PROPERTY_FIELD,
            prepareRecordsOnly,
        }, 'handlePropertyFields');
    };

    /**
     * handlePropertyValues: Handler responsible for the Create/Update operations on the PropertyValue table.
     */
    handlePropertyValues = async ({values, prepareRecordsOnly = true}: HandlePropertyValuesArgs): Promise<Model[]> => {
        if (!values?.length) {
            logWarning('An empty or undefined "values" array has been passed to the handlePropertyValues method');
            return [];
        }

        const createOrUpdateRawValues = getUniqueRawsBy({raws: values, key: 'id'});

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformPropertyValueRecord,
            createOrUpdateRawValues,
            tableName: PROPERTY_VALUE,
            prepareRecordsOnly,
        }, 'handlePropertyValues');
    };

    /**
     * handlePropertyFieldsByGroupId: Delete-aware sync for the PropertyField table scoped by group_id.
     * Upserts the active fields provided and removes any field in the group that is no longer present
     * (or has been soft-deleted). Fields belonging to other groups are left untouched.
     */
    handlePropertyFieldsByGroupId = async ({groupId, fields, prepareRecordsOnly = true}: HandlePropertyFieldsByGroupIdArgs): Promise<Model[]> => {
        const activeFields = fields.filter((f) => f.delete_at === 0);
        const activeIds = new Set(activeFields.map((f) => f.id));

        const models: Model[] = [];

        if (activeFields.length) {
            const upserts = await this.handleRecords({
                fieldName: 'id',
                transformer: transformPropertyFieldRecord,
                createOrUpdateRawValues: getUniqueRawsBy({raws: activeFields, key: 'id'}),
                tableName: PROPERTY_FIELD,
                prepareRecordsOnly: true,
            }, 'handlePropertyFieldsByGroupId');
            models.push(...upserts);
        }

        const existing = await this.database.collections.get<PropertyFieldModel>(PROPERTY_FIELD).query(Q.where('group_id', groupId)).fetch();
        for (const record of existing) {
            if (!activeIds.has(record.id)) {
                models.push(record.prepareDestroyPermanently());
            }
        }

        if (models.length && !prepareRecordsOnly) {
            await this.batchRecords(models, 'handlePropertyFieldsByGroupId');
        }

        return models;
    };

    /**
     * handlePropertyValuesByTargetId: Delete-aware sync for the PropertyValue table scoped by target_id.
     * Upserts the active values provided and removes any value for that target that is no longer present
     * (or has been soft-deleted). Values for other targets are left untouched.
     */
    handlePropertyValuesByTargetId = async ({targetId, values, prepareRecordsOnly = true}: HandlePropertyValuesByTargetIdArgs): Promise<Model[]> => {
        const activeValues = values.filter((v) => v.delete_at === 0);
        const activeIds = new Set(activeValues.map((v) => v.id));

        const models: Model[] = [];

        if (activeValues.length) {
            const upserts = await this.handleRecords({
                fieldName: 'id',
                transformer: transformPropertyValueRecord,
                createOrUpdateRawValues: getUniqueRawsBy({raws: activeValues, key: 'id'}),
                tableName: PROPERTY_VALUE,
                prepareRecordsOnly: true,
            }, 'handlePropertyValuesByTargetId');
            models.push(...upserts);
        }

        const existing = await this.database.collections.get<PropertyValueModel>(PROPERTY_VALUE).query(Q.where('target_id', targetId)).fetch();
        for (const record of existing) {
            if (!activeIds.has(record.id)) {
                models.push(record.prepareDestroyPermanently());
            }
        }

        if (models.length && !prepareRecordsOnly) {
            await this.batchRecords(models, 'handlePropertyValuesByTargetId');
        }

        return models;
    };

    /**
     * handleDeletePropertyField: Delete a single property field (and any values that belong to it) by id.
     * No-op when the field is not stored locally.
     */
    handleDeletePropertyField = async ({fieldId, prepareRecordsOnly = true}: HandleDeletePropertyFieldArgs): Promise<Model[]> => {
        let field: PropertyFieldModel;
        try {
            field = await this.database.collections.get<PropertyFieldModel>(PROPERTY_FIELD).find(fieldId);
        } catch {
            return [];
        }

        const values = await field.propertyValues.fetch();
        const models: Model[] = [
            field.prepareDestroyPermanently(),
            ...values.map((v) => v.prepareDestroyPermanently()),
        ];

        if (models.length && !prepareRecordsOnly) {
            await this.batchRecords(models, 'handleDeletePropertyField');
        }

        return models;
    };

    /**
     * handleDeletePropertyFieldsByName: Delete every property field matching the provided names (and their
     * values). Used to clear locally stored fields when there is no group_id available to scope by.
     */
    handleDeletePropertyFieldsByName = async ({names, prepareRecordsOnly = true}: HandleDeletePropertyFieldsByNameArgs): Promise<Model[]> => {
        const fields = await this.database.collections.get<PropertyFieldModel>(PROPERTY_FIELD).query(Q.where('name', Q.oneOf(names))).fetch();
        if (!fields.length) {
            return [];
        }

        const fieldIds = fields.map((f) => f.id);
        const values = await this.database.collections.get<PropertyValueModel>(PROPERTY_VALUE).query(Q.where('field_id', Q.oneOf(fieldIds))).fetch();

        const models: Model[] = [
            ...fields.map((f) => f.prepareDestroyPermanently()),
            ...values.map((v) => v.prepareDestroyPermanently()),
        ];

        if (models.length && !prepareRecordsOnly) {
            await this.batchRecords(models, 'handleDeletePropertyFieldsByName');
        }

        return models;
    };
};

export default PropertiesHandler;
