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
    HandlePropertyFieldsArgs,
    HandlePropertyValuesArgs,
} from '@typings/database/database';

const {PROPERTY_FIELD, PROPERTY_VALUE} = MM_TABLES.SERVER;

export interface PropertiesHandlerMix {
    handlePropertyFields: (args: HandlePropertyFieldsArgs) => Promise<Model[]>;
    handlePropertyValues: (args: HandlePropertyValuesArgs) => Promise<Model[]>;
}

const PropertiesHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass {
    /**
     * handlePropertyFields: Syncs the PropertyField table from a list of fields. Each field's
     * `delete_at` decides whether it is upserted (0) or deleted (non-zero); deleting a field also
     * removes its property values. When `groupId` is provided the list is treated as the
     * authoritative set for that group, so stored fields missing from it are pruned as well.
     */
    handlePropertyFields = async ({fields = [], groupId, prepareRecordsOnly = true}: HandlePropertyFieldsArgs): Promise<Model[]> => {
        if (!fields.length && !groupId) {
            logWarning('An empty or undefined "fields" array has been passed to the handlePropertyFields method');
            return [];
        }

        const activeFields = fields.filter((f) => f.delete_at === 0);
        const activeIds = new Set(activeFields.map((f) => f.id));
        const deleteIds = new Set(fields.filter((f) => f.delete_at !== 0).map((f) => f.id));

        if (groupId) {
            const existing = await this.database.collections.get<PropertyFieldModel>(PROPERTY_FIELD).query(Q.where('group_id', groupId)).fetch();
            for (const record of existing) {
                if (!activeIds.has(record.id)) {
                    deleteIds.add(record.id);
                }
            }
        }

        const models: Model[] = [];

        if (activeFields.length) {
            const upserts = await this.handleRecords({
                fieldName: 'id',
                transformer: transformPropertyFieldRecord,
                createOrUpdateRawValues: getUniqueRawsBy({raws: activeFields, key: 'id'}),
                tableName: PROPERTY_FIELD,
                prepareRecordsOnly: true,
            }, 'handlePropertyFields');
            models.push(...upserts);
        }

        if (deleteIds.size) {
            const ids = [...deleteIds];
            const [fieldsToDelete, valuesToDelete] = await Promise.all([
                this.database.collections.get<PropertyFieldModel>(PROPERTY_FIELD).query(Q.where('id', Q.oneOf(ids))).fetch(),
                this.database.collections.get<PropertyValueModel>(PROPERTY_VALUE).query(Q.where('field_id', Q.oneOf(ids))).fetch(),
            ]);
            models.push(
                ...fieldsToDelete.map((f) => f.prepareDestroyPermanently()),
                ...valuesToDelete.map((v) => v.prepareDestroyPermanently()),
            );
        }

        if (models.length && !prepareRecordsOnly) {
            await this.batchRecords(models, 'handlePropertyFields');
        }

        return models;
    };

    /**
     * handlePropertyValues: Syncs the PropertyValue table from a list of values. Each value's
     * `delete_at` decides whether it is upserted (0) or deleted (non-zero). When `targetId` is
     * provided the list is treated as the authoritative set for that target, so stored values
     * missing from it are pruned as well.
     */
    handlePropertyValues = async ({values = [], targetId, prepareRecordsOnly = true}: HandlePropertyValuesArgs): Promise<Model[]> => {
        if (!values.length && !targetId) {
            logWarning('An empty or undefined "values" array has been passed to the handlePropertyValues method');
            return [];
        }

        const activeValues = values.filter((v) => v.delete_at === 0);
        const activeIds = new Set(activeValues.map((v) => v.id));
        const deleteIds = new Set(values.filter((v) => v.delete_at !== 0).map((v) => v.id));

        if (targetId) {
            const existing = await this.database.collections.get<PropertyValueModel>(PROPERTY_VALUE).query(Q.where('target_id', targetId)).fetch();
            for (const record of existing) {
                if (!activeIds.has(record.id)) {
                    deleteIds.add(record.id);
                }
            }
        }

        const models: Model[] = [];

        if (activeValues.length) {
            const upserts = await this.handleRecords({
                fieldName: 'id',
                transformer: transformPropertyValueRecord,
                createOrUpdateRawValues: getUniqueRawsBy({raws: activeValues, key: 'id'}),
                tableName: PROPERTY_VALUE,
                prepareRecordsOnly: true,
            }, 'handlePropertyValues');
            models.push(...upserts);
        }

        if (deleteIds.size) {
            const valuesToDelete = await this.database.collections.get<PropertyValueModel>(PROPERTY_VALUE).query(Q.where('id', Q.oneOf([...deleteIds]))).fetch();
            models.push(...valuesToDelete.map((v) => v.prepareDestroyPermanently()));
        }

        if (models.length && !prepareRecordsOnly) {
            await this.batchRecords(models, 'handlePropertyValues');
        }

        return models;
    };
};

export default PropertiesHandler;
