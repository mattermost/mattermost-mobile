// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';

import {PreferenceTypes} from 'app/realm/action_types';
import {General, Preferences} from 'app/constants';
import {buildPreference} from 'app/realm/utils/preference';

import {getProfilesInChannel} from './channel';

export function savePreferences(userId, preferences) {
    return (dispatch) => {
        try {
            Client4.savePreferences(userId, preferences);

            dispatch({
                type: PreferenceTypes.RECEIVED_PREFERENCES,
                data: preferences,
            });

            return {data: preferences};
        } catch (error) {
            return {error};
        }
    };
}

export function makeGroupMessageVisibleIfNecessary(channelId) {
    return (dispatch, getState) => {
        const realm = getState();
        const preference = realm.objectForPrimaryKey('Preference', `${Preferences.CATEGORY_GROUP_CHANNEL_SHOW}-${channelId}`);
        if (!preference || preference.value === 'false') {
            const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
            const pref = buildPreference(Preferences.CATEGORY_GROUP_CHANNEL_SHOW, general.currentUserId, channelId);
            dispatch(getProfilesInChannel(channelId));
            dispatch(savePreferences(general.currentUserId, [pref]));
        }

        return {data: true};
    };
}
