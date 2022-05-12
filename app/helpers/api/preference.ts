// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, Preferences} from '@constants';

import type PreferenceModel from '@typings/database/models/servers/preference';

export function getPreferenceValue(preferences: Array<PreferenceType | PreferenceModel>, category: string, name: string, defaultValue: unknown = '') {
    const pref = preferences.find((p) => p.category === category && p.name === name);

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
