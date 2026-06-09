// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {querySystemValue} from '@queries/servers/system';

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
