// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';

import {PreferenceTypes} from 'app/action_types';

export function savePreferences(userId, preferences) {
    return async (dispatch) => {
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
