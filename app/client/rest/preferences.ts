// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from './base';

export interface ClientPreferencesMix {
    savePreferences: (userId: string, preferences: PreferenceType[], groupLabel?: RequestGroupLabel) => Promise<any>;
    deletePreferences: (userId: string, preferences: PreferenceType[]) => Promise<any>;
    getMyPreferences: (groupLabel?: RequestGroupLabel) => Promise<PreferenceType[]>;
}

const ClientPreferences = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    savePreferences = async (userId: string, preferences: PreferenceType[], groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getPreferencesRoute(userId)}`,
            {method: 'put', body: preferences, groupLabel},
        );
    };

    getMyPreferences = async (groupLabel?: RequestGroupLabel) => {
        return this.doFetch(
            `${this.getPreferencesRoute('me')}`,
            {method: 'get', groupLabel},
        );
    };

    deletePreferences = async (userId: string, preferences: PreferenceType[]) => {
        return this.doFetch(
            `${this.getPreferencesRoute(userId)}/delete`,
            {method: 'post', body: preferences},
        );
    };
};

export default ClientPreferences;
