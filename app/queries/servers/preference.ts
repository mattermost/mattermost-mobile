// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q} from '@nozbe/watermelondb';

import {Preferences} from '@constants';
import {MM_TABLES} from '@constants/database';
import {getPreferenceValue} from '@helpers/api/preference';

import {getCurrentTeamId} from './system';
import {getIsCRTEnabled} from './thread';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {ServerDatabase} from '@typings/database/database';
import type PreferenceModel from '@typings/database/models/servers/preference';

const {SERVER: {PREFERENCE}} = MM_TABLES;
const {ADVANCED_SETTINGS, DISPLAY_SETTINGS, EMOJI, SAVED_POST, SIDEBAR_SETTINGS, THEME} = Preferences.CATEGORIES;

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
    const teamTheme = await queryPreferencesByCategoryAndName(database, THEME, currentTeamId).fetch();
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
            await database.operator.batchRecords(preparedModels, 'deletePreferences');
        }
        return true;
    } catch (error) {
        return false;
    }
}

export const differsFromLocalNameFormat = async (database: Database, preferences: PreferenceType[]) => {
    const displayPref = getPreferenceValue<string>(preferences, DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT);
    if (displayPref === '') {
        return false;
    }

    const currentPref = await queryDisplayNamePreferences(database, Preferences.NAME_NAME_FORMAT, displayPref).fetch();
    if (currentPref.length > 0) {
        return false;
    }

    return true;
};

export async function getHasCRTChanged(database: Database, preferences: PreferenceType[]): Promise<boolean> {
    const oldCRT = await getIsCRTEnabled(database);
    const newCRTPref = preferences.filter((p) => p.name === Preferences.COLLAPSED_REPLY_THREADS)?.[0];

    if (!newCRTPref) {
        return false;
    }

    const newCRT = newCRTPref.value === 'on';

    return oldCRT !== newCRT;
}

export const queryDisplayNamePreferences = (database: Database, name?: string, value?: string) => {
    return queryPreferencesByCategoryAndName(database, DISPLAY_SETTINGS, name, value);
};

export const querySavedPostsPreferences = (database: Database, postId?: string, value?: string) => {
    return queryPreferencesByCategoryAndName(database, SAVED_POST, postId, value);
};

export const queryThemePreferences = (database: Database, teamId?: string) => {
    return queryPreferencesByCategoryAndName(database, THEME, teamId);
};

export const querySidebarPreferences = (database: Database, name?: string) => {
    return queryPreferencesByCategoryAndName(database, SIDEBAR_SETTINGS, name);
};

export const queryEmojiPreferences = (database: Database, name: string) => {
    return queryPreferencesByCategoryAndName(database, EMOJI, name);
};

export const queryAdvanceSettingsPreferences = (database: Database, name?: string, value?: string) => {
    return queryPreferencesByCategoryAndName(database, ADVANCED_SETTINGS, name, value);
};
