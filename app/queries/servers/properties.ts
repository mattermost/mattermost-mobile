// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {CLASSIFICATIONS_GROUP_NAME, CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID} from '@constants/classification';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {querySystemValue} from '@queries/servers/system';
import {deriveChannelClassificationBanner, deriveClassificationBannerState} from '@utils/classification';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {SYSTEM}} = MM_TABLES;

// --- Async one-shot reads (used by remote actions and WS handlers for read-merge-write) ---

export const getPersistedPropertyFields = async (database: Database): Promise<Record<string, PropertyField[]>> => {
    try {
        const record = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.PROPERTY_FIELDS);
        return (record?.value as Record<string, PropertyField[]> | null) ?? {};
    } catch {
        return {};
    }
};

export const getPersistedPropertyValues = async (database: Database): Promise<Record<string, Array<PropertyValue<string>>>> => {
    try {
        const record = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.PROPERTY_VALUES);
        return (record?.value as Record<string, Array<PropertyValue<string>>> | null) ?? {};
    } catch {
        return {};
    }
};

export const getPersistedPropertyGroupNames = async (database: Database): Promise<Record<string, string>> => {
    try {
        const record = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES);
        return (record?.value as Record<string, string> | null) ?? {};
    } catch {
        return {};
    }
};

// --- Reactive observables (used by hooks for real-time UI updates) ---

export const observePropertyFields = (database: Database) => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.PROPERTY_FIELDS).observeWithColumns(['value']).pipe(
        switchMap((result) => of$(
            (result.length ? result[0].value : {}) as Record<string, PropertyField[]>,
        )),
    );
};

export const observePropertyValues = (database: Database) => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.PROPERTY_VALUES).observeWithColumns(['value']).pipe(
        switchMap((result) => of$(
            (result.length ? result[0].value : {}) as Record<string, Array<PropertyValue<string>>>,
        )),
    );
};

export const observePropertyGroupNames = (database: Database) => {
    return querySystemValue(database, SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES).observeWithColumns(['value']).pipe(
        switchMap((result) => of$(
            (result.length ? result[0].value : {}) as Record<string, string>,
        )),
    );
};

// --- Classification banner observables ---

export const observeClassificationBannerState = (database: Database) => {
    return combineLatest([
        observePropertyFields(database),
        observePropertyValues(database),
        observePropertyGroupNames(database),
    ]).pipe(
        map(([fields, values, groupNames]) => deriveClassificationBannerState(fields, values, groupNames)),
        distinctUntilChanged((a, b) => a.visible === b.visible && a.levelName === b.levelName && a.color === b.color),
    );
};

export const observeChannelClassificationBanner = (database: Database, channelId: string, nativeBannerText?: string) => {
    return combineLatest([
        observePropertyFields(database),
        observePropertyValues(database),
        observePropertyGroupNames(database),
    ]).pipe(
        map(([fields, values, groupNames]) => deriveChannelClassificationBanner(fields, values, groupNames, channelId, nativeBannerText)),
        distinctUntilChanged((a, b) => a.hasClassification === b.hasClassification &&
            a.classificationBanner?.text === b.classificationBanner?.text &&
            a.classificationBanner?.background_color === b.classificationBanner?.background_color),
    );
};

// --- Mutations ---

export async function clearClassificationData(operator: ServerDataOperator) {
    const {database} = operator;

    const [existingFields, existingValues, existingGroupNames] = await Promise.all([
        getPersistedPropertyFields(database),
        getPersistedPropertyValues(database),
        getPersistedPropertyGroupNames(database),
    ]);

    const groupId = existingGroupNames[CLASSIFICATIONS_GROUP_NAME];
    if (!groupId) {
        return;
    }

    const {[groupId]: _, ...remainingFields} = existingFields;
    const {[CLASSIFICATIONS_SYSTEM_VALUE_TARGET_ID]: __, ...remainingValues} = existingValues;
    const {[CLASSIFICATIONS_GROUP_NAME]: ___, ...remainingGroupNames} = existingGroupNames;

    await operator.handleSystem({
        systems: [
            {id: SYSTEM_IDENTIFIERS.PROPERTY_FIELDS, value: remainingFields},
            {id: SYSTEM_IDENTIFIERS.PROPERTY_VALUES, value: remainingValues},
            {id: SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES, value: remainingGroupNames},
        ],
        prepareRecordsOnly: false,
    });
}
