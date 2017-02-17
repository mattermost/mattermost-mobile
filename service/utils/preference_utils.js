// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

export function getPreferenceKey(category, name) {
    return `${category}--${name}`;
}

export function getPreferencesByCategory(myPreferences, category) {
    const prefix = `${category}--`;
    const preferences = new Map();
    Object.keys(myPreferences).forEach((key) => {
        if (key.startsWith(prefix)) {
            preferences.set(key.substring(prefix.length), myPreferences[key]);
        }
    });

    return preferences;
}
