// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {updateMe} from 'mattermost-redux/actions/users';
import {Preferences} from 'mattermost-redux/constants';
import {savePreferences} from 'mattermost-redux/actions/preferences';

export function handleUpdateUserNotifyProps(notifyProps) {
    return async (dispatch, getState) => {
        const state = getState();
        const config = state.entities.general.config;
        const {currentUserId} = state.entities.users;

        const {interval, user_id: userId, ...otherProps} = notifyProps;

        const email = notifyProps.email;
        if (config.EnableEmailBatching === 'true' && email !== 'false') {
            const emailInterval = [{
                user_id: userId,
                category: Preferences.CATEGORY_NOTIFICATIONS,
                name: Preferences.EMAIL_INTERVAL,
                value: interval,
            }];

            savePreferences(currentUserId, emailInterval)(dispatch, getState);
        }

        const props = {...otherProps, email};
        try {
            await updateMe({notify_props: props})(dispatch, getState);
        } catch (error) {
            // do nothing
        }
    };
}
