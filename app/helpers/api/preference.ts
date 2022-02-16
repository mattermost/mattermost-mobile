// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Database, Q} from '@nozbe/watermelondb';

import {General, Preferences} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';

import type PreferenceModel from '@typings/database/models/servers/preference';
import type SystemModel from '@typings/database/models/servers/system';

const {SERVER: {PREFERENCE, SYSTEM}} = MM_TABLES;

export function getPreferenceValue(preferences: PreferenceType[] | PreferenceModel[], category: string, name: string, defaultValue: unknown = '') {
    const pref = (preferences as PreferenceType[]).find((p) => p.category === category && p.name === name);

    return pref?.value || defaultValue;
}

export function getPreferenceAsBool(preferences: PreferenceType[] | PreferenceModel[], category: string, name: string, defaultValue = false) {
    const value = getPreferenceValue(preferences, category, name, defaultValue);
    if (typeof value === 'boolean') {
        return defaultValue;
    }

    return value !== 'false';
}

export function getPreferenceAsInt(preferences: PreferenceType[] | PreferenceModel[], category: string, name: string, defaultValue = 0) {
    const value = getPreferenceValue(preferences, category, name, defaultValue);
    if (value) {
        return parseInt(value as string, 10);
    }

    return defaultValue;
}

export function getTeammateNameDisplaySetting(preferences: PreferenceType[] | PreferenceModel[], config?: ClientConfig, license?: ClientLicense) {
    const useAdminTeammateNameDisplaySetting = license?.LockTeammateNameDisplay === 'true' && config?.LockTeammateNameDisplay === 'true';
    const preference = getPreferenceValue(preferences, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT, '') as string;
    if (preference && !useAdminTeammateNameDisplaySetting) {
        return preference;
    } else if (config?.TeammateNameDisplay) {
        return config.TeammateNameDisplay;
    }

    return General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME;
}

export function processIsCRTEnabled(preferences: PreferenceModel[], config?: ClientConfig): boolean {
    let preferenceDefault = Preferences.COLLAPSED_REPLY_THREADS_OFF;
    const configValue = config?.CollapsedThreads;
    if (configValue === 'default_on') {
        preferenceDefault = Preferences.COLLAPSED_REPLY_THREADS_ON;
    }
    const preference = getPreferenceValue(preferences, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.COLLAPSED_REPLY_THREADS, preferenceDefault);

    const isAllowed = config?.FeatureFlagCollapsedThreads === 'true' && config?.CollapsedThreads !== 'disabled';

    return isAllowed && (preference === Preferences.COLLAPSED_REPLY_THREADS_ON || config?.CollapsedThreads === 'always_on');
}

export async function getIsCRTEnabled(database: Database): Promise<boolean> {
    const {value: config} = await database.get<SystemModel>(SYSTEM).find(SYSTEM_IDENTIFIERS.CONFIG);
    const preferences = await database.get<PreferenceModel>(PREFERENCE).query(Q.where('category', Preferences.CATEGORY_DISPLAY_SETTINGS)).fetch();
    return processIsCRTEnabled(preferences, config);
}
