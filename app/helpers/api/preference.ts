// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function getPreferenceValue(preferences: PreferenceType[], category: string, name: string, defaultValue: unknown = '') {
    const pref = preferences.find((p) => p.category === category && p.name === name);

    return pref?.value || defaultValue;
}

export function getPreferenceAsBool(preferences: PreferenceType[], category: string, name: string, defaultValue = false) {
    const value = getPreferenceValue(preferences, category, name, defaultValue);
    if (typeof value === 'boolean') {
        return defaultValue;
    }

    return value !== 'false';
}

export function getPreferenceAsInt(preferences: PreferenceType[], category: string, name: string, defaultValue = 0) {
    const value = getPreferenceValue(preferences, category, name, defaultValue);
    if (value) {
        return parseInt(value as string, 10);
    }

    return defaultValue;
}
