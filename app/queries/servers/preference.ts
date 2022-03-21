// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q} from '@nozbe/watermelondb';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import {ServerDatabase} from '@typings/database/database';

import {queryCurrentTeamId} from './system';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type PreferenceModel from '@typings/database/models/servers/preference';

const {SERVER: {PREFERENCE}} = MM_TABLES;

export const prepareMyPreferences = (operator: ServerDataOperator, preferences: PreferenceType[], sync = false) => {
    try {
        return operator.handlePreferences({
            prepareRecordsOnly: true,
            preferences,
            sync,
        });
    } catch {
        return undefined;
    }
};

export const queryPreferencesByCategoryAndName = (database: Database, category: string, name: string) => {
    return database.
        get<PreferenceModel>(MM_TABLES.SERVER.PREFERENCE).
        query(
            Q.where('category', category),
            Q.where('name', name),
        ).
        fetch();
};

export const queryThemeForCurrentTeam = async (database: Database) => {
    const currentTeamId = await queryCurrentTeamId(database);
    const teamTheme = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_THEME, currentTeamId);
    if (teamTheme.length) {
        try {
            return JSON.parse(teamTheme[0].value) as Theme;
        } catch {
            return undefined;
        }
    }

    return undefined;
};

export const deletePreferences = async (database: ServerDatabase, preferences: PreferenceType[]): Promise<Boolean> => {
    try {
        const preparedModels: Model[] = [];
        for await (const pref of preferences) {
            const myPrefs = await queryPreferencesByCategoryAndName(database.database, pref.category, pref.name);
            for (const p of myPrefs) {
                preparedModels.push(p.prepareDestroyPermanently());
            }
        }
        if (preparedModels.length) {
            await database.operator.batchRecords(preparedModels);
        }
        return true;
    } catch (error) {
        return false;
    }
};

export const queryPreferencesByCategory = (database: Database, category: string, name?: string, value?: string) => {
    const clauses = [Q.where('category', category)];

    if (typeof name === 'string') {
        clauses.push(Q.where('name', name));
    }

    if (typeof value === 'string') {
        clauses.push(Q.where('value', value));
    }

    return database.get<PreferenceModel>(PREFERENCE).query(...clauses);
};
