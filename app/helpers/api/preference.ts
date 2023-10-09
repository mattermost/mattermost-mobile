// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, Preferences} from '@constants';
import {CATEGORIES_TO_KEEP} from '@constants/preferences';

import type PreferenceModel from '@typings/database/models/servers/preference';

type Preference = PreferenceModel | PreferenceType;

const categoriesToKeep = new Set(Object.values(CATEGORIES_TO_KEEP));

export function getPreferenceValue<T>(preferences: Preference[], category: string, name: string, defaultValue = '' as unknown) {
    const pref = preferences.find((p) => p.category === category && p.name === name);

    return (pref?.value || defaultValue) as T;
}

export function getPreferenceAsBool(preferences: Preference[], category: string, name: string, defaultValue = false) {
    const value = getPreferenceValue<boolean|string>(preferences, category, name, defaultValue);
    if (typeof value === 'boolean') {
        return defaultValue;
    }

    return value !== 'false';
}

export function getTeammateNameDisplaySetting(preferences: Preference[], lockTeammateNameDisplay?: string, teammateNameDisplay?: string, license?: ClientLicense) {
    const useAdminTeammateNameDisplaySetting = license?.LockTeammateNameDisplay === 'true' && lockTeammateNameDisplay === 'true';
    const preference = getPreferenceValue<string>(preferences, Preferences.CATEGORIES.DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT, '');
    if (preference && !useAdminTeammateNameDisplaySetting) {
        return preference;
    } else if (teammateNameDisplay) {
        return teammateNameDisplay;
    }

    return General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME;
}

export function getAdvanceSettingPreferenceAsBool(preferences: Preference[], name: string, defaultValue = false) {
    return getPreferenceAsBool(preferences, Preferences.CATEGORIES.ADVANCED_SETTINGS, name, defaultValue);
}

export function getDisplayNamePreferenceAsBool(preferences: Preference[], name: string, defaultValue = false) {
    return getPreferenceAsBool(preferences, Preferences.CATEGORIES.DISPLAY_SETTINGS, name, defaultValue);
}

export function getDisplayNamePreference<T>(preferences: Preference[], name: string, defaultValue = '' as unknown) {
    return getPreferenceValue<T>(preferences, Preferences.CATEGORIES.DISPLAY_SETTINGS, name, defaultValue);
}

export function getSidebarPreferenceAsBool(preferences: Preference[], name: string, defaultValue = false) {
    return getPreferenceAsBool(preferences, Preferences.CATEGORIES.SIDEBAR_SETTINGS, name, defaultValue);
}

export function filterPreferences(preferences: PreferenceType[]) {
    if (!preferences.length) {
        return preferences;
    }

    return preferences.filter((p) => categoriesToKeep.has(p.category));
}
