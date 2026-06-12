// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {
    queryClassificationFields,
    queryPropertyFieldsByGroupId,
    queryPropertyValuesByTargetId,
} from '@queries/servers/properties';

import type {PropertyValueModel} from '@database/models/server';
import type Model from '@nozbe/watermelondb/Model';

const {SERVER: {PROPERTY_VALUE}} = MM_TABLES;

/**
 * Sync the property fields for a group: upsert the active fields provided and
 * remove any field in the group that is no longer present (or has been
 * soft-deleted). Scoped by group_id so fields belonging to other groups in the
 * same table are left untouched.
 */
export async function syncPropertyFieldsByGroupId(serverUrl: string, groupId: string, fields: PropertyField[]) {
    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    const activeFields = fields.filter((f) => f.delete_at === 0);
    const activeIds = new Set(activeFields.map((f) => f.id));

    const prepared = activeFields.length ? await operator.handlePropertyFields({fields: activeFields, prepareRecordsOnly: true}) : [];

    const existing = await queryPropertyFieldsByGroupId(database, groupId).fetch();
    const stale = existing.
        filter((r) => !activeIds.has(r.id)).
        map((r) => r.prepareDestroyPermanently());

    const batch = [...prepared, ...stale];
    if (batch.length) {
        await operator.batchRecords(batch, 'syncPropertyFieldsByGroupId');
    }
}

/**
 * Sync the property values for a target: upsert the active values provided and
 * remove any value for that target that is no longer present (or has been
 * soft-deleted). Scoped by target_id so values for other targets are left
 * untouched.
 */
export async function syncPropertyValuesByTargetId(serverUrl: string, targetId: string, values: Array<PropertyValue<string>>) {
    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    const activeValues = values.filter((v) => v.delete_at === 0);
    const activeIds = new Set(activeValues.map((v) => v.id));

    const prepared = activeValues.length ? await operator.handlePropertyValues({values: activeValues, prepareRecordsOnly: true}) : [];

    const existing = await queryPropertyValuesByTargetId(database, targetId).fetch();
    const stale = existing.
        filter((r) => !activeIds.has(r.id)).
        map((r) => r.prepareDestroyPermanently());

    const batch = [...prepared, ...stale];
    if (batch.length) {
        await operator.batchRecords(batch, 'syncPropertyValuesByTargetId');
    }
}

/**
 * Remove all locally stored classification fields and their values. Used when
 * the feature flag is disabled or the server reports no classification fields.
 */
export async function clearClassificationData(serverUrl: string) {
    const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

    const fields = await queryClassificationFields(database).fetch();
    const fieldIds = fields.map((f) => f.id);

    const values = fieldIds.length ? await database.get<PropertyValueModel>(PROPERTY_VALUE).query(Q.where('field_id', Q.oneOf(fieldIds))).fetch() : [];

    const batch: Model[] = [
        ...fields.map((f) => f.prepareDestroyPermanently()),
        ...values.map((v) => v.prepareDestroyPermanently()),
    ];

    if (batch.length) {
        await operator.batchRecords(batch, 'clearClassificationData');
    }
}
