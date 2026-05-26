// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import type {Database} from '@nozbe/watermelondb';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {SYSTEM}} = MM_TABLES;

export const getPersistedPropertyFields = async (database: Database): Promise<Record<string, PropertyField[]> | undefined> => {
    try {
        const record = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.PROPERTY_FIELDS);
        return (record?.value as Record<string, PropertyField[]> | null) ?? {};
    } catch {
        return undefined;
    }
};

export const getPersistedPropertyValues = async (database: Database): Promise<Record<string, Array<PropertyValue<string>>> | undefined> => {
    try {
        const record = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.PROPERTY_VALUES);
        return (record?.value as Record<string, Array<PropertyValue<string>>> | null) ?? {};
    } catch {
        return undefined;
    }
};

export const getPersistedPropertyGroupNames = async (database: Database): Promise<Record<string, string> | undefined> => {
    try {
        const record = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.PROPERTY_GROUP_NAMES);
        return (record?.value as Record<string, string> | null) ?? {};
    } catch {
        return undefined;
    }
};
