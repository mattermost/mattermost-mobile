// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$, combineLatest, type Observable} from 'rxjs';
import {distinctUntilChanged, switchMap, map} from 'rxjs/operators';

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import type PlaybookRunPropertyFieldModel from '@playbooks/types/database/models/playbook_run_attribute';
import type PlaybookRunPropertyValueModel from '@playbooks/types/database/models/playbook_run_attribute_value';

const {PLAYBOOK_RUN_ATTRIBUTE, PLAYBOOK_RUN_ATTRIBUTE_VALUE} = PLAYBOOK_TABLES;

/**
 * Get all property fields for a run (by target_id = runId and target_type = 'run')
 * @param database - The database instance
 * @param runId - The run ID
 * @returns Observable of property field models
 */
export const observePlaybookRunPropertyFields = (database: Database, runId: string): Observable<PlaybookRunPropertyFieldModel[]> => {
    return database.get<PlaybookRunPropertyFieldModel>(PLAYBOOK_RUN_ATTRIBUTE).query(
        Q.where('target_id', runId),
        Q.where('target_type', 'run'),
        Q.where('delete_at', 0),
    ).observeWithColumns(['update_at', 'delete_at']).pipe(
        distinctUntilChanged(),
    );
};

/**
 * Get a specific property field by ID
 * @param database - The database instance
 * @param fieldId - The property field ID
 * @returns The property field model or undefined
 */
export const getPlaybookRunPropertyFieldById = async (database: Database, fieldId: string): Promise<PlaybookRunPropertyFieldModel | undefined> => {
    try {
        const fieldRecord = await database.get<PlaybookRunPropertyFieldModel>(PLAYBOOK_RUN_ATTRIBUTE).find(fieldId);
        return fieldRecord;
    } catch {
        return undefined;
    }
};

/**
 * Get all property values for a run (by run_id)
 * @param database - The database instance
 * @param runId - The run ID
 * @returns Observable of property value models
 */
export const observePlaybookRunPropertyValues = (database: Database, runId: string): Observable<PlaybookRunPropertyValueModel[]> => {
    return database.get<PlaybookRunPropertyValueModel>(PLAYBOOK_RUN_ATTRIBUTE_VALUE).query(
        Q.where('run_id', runId),
    ).observeWithColumns(['value', 'update_at']).pipe(
        distinctUntilChanged(),
    );
};

/**
 * Get property value by field ID (attributeId in DB) and run_id
 * @param database - The database instance
 * @param fieldId - The property field ID (maps to attribute_id in DB)
 * @param runId - The run ID
 * @returns Observable of the property value model or undefined
 */
export const observePlaybookRunPropertyValue = (database: Database, fieldId: string, runId: string): Observable<PlaybookRunPropertyValueModel | undefined> => {
    return database.get<PlaybookRunPropertyValueModel>(PLAYBOOK_RUN_ATTRIBUTE_VALUE).query(
        Q.where('attribute_id', fieldId),
        Q.where('run_id', runId),
        Q.take(1),
    ).observe().pipe(
        switchMap((result) => (result.length ? result[0].observe() : of$(undefined))),
    );
};

/**
 * Get property fields with their values joined
 * @param database - The database instance
 * @param runId - The run ID
 * @returns Observable of array of objects containing propertyField and optional value
 */
export const observePlaybookRunPropertyFieldsWithValues = (
    database: Database,
    runId: string,
): Observable<Array<{propertyField: PlaybookRunPropertyFieldModel; value?: PlaybookRunPropertyValueModel}>> => {
    const propertyFields$ = observePlaybookRunPropertyFields(database, runId);
    const propertyValues$ = observePlaybookRunPropertyValues(database, runId);

    return combineLatest([propertyFields$, propertyValues$]).pipe(
        map(([propertyFields, propertyValues]) => {
            // Create a map of values by attribute_id for quick lookup
            const valuesMap = new Map<string, PlaybookRunPropertyValueModel>();
            propertyValues.forEach((value) => {
                valuesMap.set(value.attributeId, value);
            });

            // Join property fields with their values
            return propertyFields.map((propertyField) => ({
                propertyField,
                value: valuesMap.get(propertyField.id),
            }));
        }),
    );
};
