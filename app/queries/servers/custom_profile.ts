// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$, type Observable} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';
import {customProfileAttributeId} from '@utils/custom_profile_attribute';

import type CustomProfileAttributeModel from 'app/database/models/server/custom_profile_attribute';
import type CustomProfileFieldModel from 'app/database/models/server/custom_profile_field';

const {CUSTOM_PROFILE_FIELD, CUSTOM_PROFILE_ATTRIBUTE} = MM_TABLES.SERVER;

/**
 * Get a custom profile field by ID
 * @param database - The database instance
 * @param fieldId - The field ID
 * @returns The custom profile field or undefined
 */
export const getCustomProfileFieldById = async (database: Database, fieldId: string) => {
    try {
        const fieldRecord = await database.get<CustomProfileFieldModel>(CUSTOM_PROFILE_FIELD).find(fieldId);
        return fieldRecord;
    } catch {
        return undefined;
    }
};

/**
 * Observe a custom profile field
 * @param database - The database instance
 * @returns Observable of the custom profile field
 */
export const observeCustomProfileFields = (database: Database) => {
    return queryCustomProfileFields(database).observeWithColumns(['update_at', 'delete_at']).pipe(
        distinctUntilChanged(),
    );
};

/**
 * Get a custom profile attribute by field ID and user ID
 * @param database - The database instance
 * @param fieldId - The field ID
 * @param userId - The user ID
 * @returns The custom profile attribute or undefined
 */
export const getCustomProfileAttribute = async (database: Database, fieldId: string, userId: string) => {
    try {
        const attributeRecord = await database.get<CustomProfileAttributeModel>(CUSTOM_PROFILE_ATTRIBUTE).query(
            Q.where('id', customProfileAttributeId(fieldId, userId)),
            Q.take(1),
        ).fetch();
        return attributeRecord[0];
    } catch {
        return undefined;
    }
};

/**
 * Observe a custom profile attribute
 * @param database - The database instance
 * @param fieldId - The field ID
 * @param userId - The user ID
 * @returns Observable of the custom profile attribute
 */
export const observeCustomProfileAttribute = (database: Database, fieldId: string, userId: string) => {
    return database.get<CustomProfileAttributeModel>(CUSTOM_PROFILE_ATTRIBUTE).query(
        Q.where('id', customProfileAttributeId(fieldId, userId)),
        Q.take(1),
    ).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(undefined))),
    );
};

/**
 * Observe all custom profile attributes for a user
 * @param database - The database instance
 * @param userId - The user ID
 * @returns Observable of the custom profile attributes
 */
export const observeCustomProfileAttributesByUserId = (database: Database, userId: string): Observable<CustomProfileAttributeModel[]> => {
    return queryCustomProfileAttributesByUserId(database, userId).observeWithColumns(['value']).pipe(distinctUntilChanged());
};

/**
 * Query to fetch all custom profile fields
 * @param database - The database instance
 * @returns Query for custom profile fields
 */
export const queryCustomProfileFields = (database: Database) => {
    return database.get<CustomProfileFieldModel>(CUSTOM_PROFILE_FIELD).query(Q.where('delete_at', 0));
};

/**
 * Query to fetch custom profile attributes for a user
 * @param database - The database instance
 * @param userId - The user ID
 * @returns Query for custom profile attributes
 */
export const queryCustomProfileAttributesByUserId = (database: Database, userId: string) => {
    return database.get<CustomProfileAttributeModel>(CUSTOM_PROFILE_ATTRIBUTE).query(
        Q.where('user_id', userId),
    );
};

/**
 * Query to fetch custom profile attributes by field ID
 * @param database - The database instance
 * @param fieldId - The field ID
 * @returns Query for custom profile attributes
 */
export const queryCustomProfileAttributesByFieldId = (database: Database, fieldId: string) => {
    return database.get<CustomProfileAttributeModel>(CUSTOM_PROFILE_ATTRIBUTE).query(
        Q.where('field_id', fieldId),
    );
};

/**
 * Delete custom profile attributes by field ID with batching support
 * @param database - The database instance
 * @param fieldId - The field ID
 * @param batchSize - Number of records to delete in each batch (defaults to 100)
 * @returns Promise that resolves when the deletion is complete
 */
export const deleteCustomProfileAttributesByFieldId = async (database: Database, fieldId: string, batchSize = 100) => {
    const attributes = await prepareCustomProfileAttributesForDeletionByFieldId(database, fieldId);

    if (!attributes.length) {
        return;
    }

    // Process attributes in batches to avoid performance issues with large datasets
    const promises = [];
    for (let i = 0; i < attributes.length; i += batchSize) {
        const batchPromise = database.write(async () => {
            await database.batch(...(attributes.slice(i, i + batchSize)));
        }, `deleteCustomProfileAttributesByFieldId:${fieldId}:batch:${i}`);

        promises.push(batchPromise);
    }

    await Promise.all(promises);
};

export const prepareCustomProfileAttributesForDeletionByFieldId = async (database: Database, fieldId: string) => {
    const field = await getCustomProfileFieldById(database, fieldId);
    if (!field) {
        return [];
    }
    const attributes = await field.customProfileAttributes.fetch();
    if (attributes.length === 0) {
        return [];
    }
    return attributes.map((attribute) => attribute.prepareDestroyPermanently());
};
