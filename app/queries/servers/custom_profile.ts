// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {MM_TABLES} from '@constants/database';

import type CustomProfileAttributeModel from 'app/database/models/server/custom_profile_attribute';
import type CustomProfileFieldModel from 'app/database/models/server/custom_profile_field';

const {CUSTOM_PROFILE_FIELD, CUSTOM_PROFILE_ATTRIBUTE} = MM_TABLES.SERVER;

/**
 * Observe a custom profile field
 * @param database - The database instance
 * @param fieldId - The field ID
 * @returns Observable of the custom profile field
 */
export const observeCustomProfileField = (database: Database, fieldId: string) => {
    return database.get<CustomProfileFieldModel>(CUSTOM_PROFILE_FIELD).query(
        Q.where('id', fieldId),
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
export const observeCustomProfileAttributesByUserId = (database: Database, userId: string) => {
    return database.get<CustomProfileAttributeModel>(CUSTOM_PROFILE_ATTRIBUTE).query(
        Q.where('user_id', userId),
    ).observe().pipe(
        distinctUntilChanged(),
    );
};

/**
 * Observe all custom profile attributes for multiple fields
 * @param database - The database instance
 * @param fieldIds - Array of field IDs
 * @returns Observable of the custom profile attributes
 */
export const observeCustomProfileAttributesByFieldIds = (database: Database, fieldIds: string[]) => {
    return database.get<CustomProfileAttributeModel>(CUSTOM_PROFILE_ATTRIBUTE).query(
        Q.where('field_id', Q.oneOf(fieldIds)),
    ).observe().pipe(
        distinctUntilChanged(),
    );
};

/**
 * Query to fetch all custom profile fields
 * @param database - The database instance
 * @returns Query for custom profile fields
 */
export const queryCustomProfileFields = (database: Database) => {
    return database.get<CustomProfileFieldModel>(CUSTOM_PROFILE_FIELD).query();
};

/**
 * Query to fetch custom profile fields by IDs
 * @param database - The database instance
 * @param fieldIds - Array of field IDs to fetch
 * @returns Query for custom profile fields
 */
export const queryCustomProfileFieldsByIds = (database: Database, fieldIds: string[]) => {
    return database.get<CustomProfileFieldModel>(CUSTOM_PROFILE_FIELD).query(
        Q.where('id', Q.oneOf(fieldIds)),
    );
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
 * Query to fetch custom profile attributes for multiple users
 * @param database - The database instance
 * @param userIds - Array of user IDs
 * @returns Query for custom profile attributes
 */
export const queryCustomProfileAttributesByUserIds = (database: Database, userIds: string[]) => {
    return database.get<CustomProfileAttributeModel>(CUSTOM_PROFILE_ATTRIBUTE).query(
        Q.where('user_id', Q.oneOf(userIds)),
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
 * Query to fetch custom profile attributes by field IDs
 * @param database - The database instance
 * @param fieldIds - Array of field IDs
 * @returns Query for custom profile attributes
 */
export const queryCustomProfileAttributesByFieldIds = (database: Database, fieldIds: string[]) => {
    return database.get<CustomProfileAttributeModel>(CUSTOM_PROFILE_ATTRIBUTE).query(
        Q.where('field_id', Q.oneOf(fieldIds)),
    );
};

/**
 * Query to fetch custom profile attributes by user ID and field IDs
 * @param database - The database instance
 * @param userId - The user ID
 * @param fieldIds - Array of field IDs
 * @returns Query for custom profile attributes
 */
export const queryCustomProfileAttributesByUserIdAndFieldIds = (database: Database, userId: string, fieldIds: string[]) => {
    return database.get<CustomProfileAttributeModel>(CUSTOM_PROFILE_ATTRIBUTE).query(
        Q.where('user_id', userId),
        Q.where('field_id', Q.oneOf(fieldIds)),
    );
};
