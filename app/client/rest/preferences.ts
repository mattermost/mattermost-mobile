// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {PreferenceType} from '@mm-redux/types/preferences';

export interface ClientPreferencesMix {
    savePreferences: (userId: string, preferences: PreferenceType[]) => Promise<any>;
    deletePreferences: (userId: string, preferences: PreferenceType[]) => Promise<any>;
    getMyPreferences: () => Promise<PreferenceType>;
}

const ClientPreferences = (superclass: any) => class extends superclass {
    savePreferences = async (userId: string, preferences: PreferenceType[]) => {
        return this.doFetch(
            `${this.getPreferencesRoute(userId)}`,
            {method: 'put', body: JSON.stringify(preferences)},
        );
    };

    getMyPreferences = async () => {
        return this.doFetch(
            `${this.getPreferencesRoute('me')}`,
            {method: 'get'},
        );
    };

    deletePreferences = async (userId: string, preferences: PreferenceType[]) => {
        return this.doFetch(
            `${this.getPreferencesRoute(userId)}/delete`,
            {method: 'post', body: JSON.stringify(preferences)},
        );
    };
};

export default ClientPreferences;
