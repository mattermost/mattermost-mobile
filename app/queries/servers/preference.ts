// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q} from '@nozbe/watermelondb';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import {getPreferenceValue} from '@helpers/api/preference';
import {ServerDatabase} from '@typings/database/database';

import {getCurrentTeamId} from './system';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type PreferenceModel from '@typings/database/models/servers/preference';

const {SERVER: {PREFERENCE}} = MM_TABLES;

export async function prepareMyPreferences(operator: ServerDataOperator, preferences: PreferenceType[], sync = false): Promise<PreferenceModel[]> {
    return operator.handlePreferences({
        prepareRecordsOnly: true,
        preferences,
        sync,
    });
}

export const queryPreferencesByCategoryAndName = (database: Database, category: string, name?: string, value?: string) => {
    const clauses = [Q.where('category', category)];
    if (name != null) {
        clauses.push(Q.where('name', name));
    }
    if (value != null) {
        clauses.push(Q.where('value', value));
    }
    return database.get<PreferenceModel>(PREFERENCE).query(...clauses);
};

export const getThemeForCurrentTeam = async (database: Database): Promise<Theme | undefined> => {
    const currentTeamId = await getCurrentTeamId(database);
    const teamTheme = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_THEME, currentTeamId).fetch();
    if (teamTheme.length) {
        try {
            return JSON.parse(teamTheme[0].value);
        } catch {
            return undefined;
        }
    }

    return undefined;
};

export async function deletePreferences(database: ServerDatabase, preferences: PreferenceType[]): Promise<Boolean> {
    try {
        const preparedModels: Model[] = [];
        for await (const pref of preferences) {
            const myPrefs = await queryPreferencesByCategoryAndName(database.database, pref.category, pref.name).fetch();
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
}

export const differsFromLocalNameFormat = async (database: Database, preferences: PreferenceType[]) => {
    const displayPref = getPreferenceValue(preferences, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT) as string;
    if (displayPref === '') {
        return false;
    }

    const currentPref = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT, displayPref).fetch();
    if (currentPref.length > 0) {
        return false;
    }

    return true;
};
