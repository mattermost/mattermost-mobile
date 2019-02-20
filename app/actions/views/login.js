// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getDataRetentionPolicy} from 'mattermost-redux/actions/general';
import {GeneralTypes} from 'mattermost-redux/action_types';
import {getSessions} from 'mattermost-redux/actions/users';
import {autoUpdateTimezone} from 'mattermost-redux/actions/timezone';
import {Client4} from 'mattermost-redux/client';
import {getConfig, getLicense} from 'mattermost-redux/selectors/entities/general';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';

import {ViewTypes} from 'app/constants';
import {app} from 'app/mattermost';
import PushNotifications from 'app/push_notifications';
import {getDeviceTimezone, isTimezoneEnabled} from 'app/utils/timezone';

export function handleLoginIdChanged(loginId) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.LOGIN_ID_CHANGED,
            loginId,
        }, getState);
    };
}

export function handlePasswordChanged(password) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.PASSWORD_CHANGED,
            password,
        }, getState);
    };
}

export function handleSuccessfulLogin() {
    return async (dispatch, getState) => {
        const state = getState();
        const config = getConfig(state);
        const license = getLicense(state);
        const token = Client4.getToken();
        const url = Client4.getUrl();
        const deviceToken = state.entities.general.deviceToken;
        const currentUserId = getCurrentUserId(state);

        app.setAppCredentials(deviceToken, currentUserId, token, url);

        const enableTimezone = isTimezoneEnabled(state);
        if (enableTimezone) {
            dispatch(autoUpdateTimezone(getDeviceTimezone()));
        }

        dispatch({
            type: GeneralTypes.RECEIVED_APP_CREDENTIALS,
            data: {
                url,
                token,
            },
        });

        if (config.DataRetentionEnableMessageDeletion && config.DataRetentionEnableMessageDeletion === 'true' &&
            license.IsLicensed === 'true' && license.DataRetention === 'true') {
            dispatch(getDataRetentionPolicy());
        } else {
            dispatch({type: GeneralTypes.RECEIVED_DATA_RETENTION_POLICY, data: {}});
        }

        return true;
    };
}

export function scheduleExpiredNotification(intl) {
    return (dispatch, getState) => {
        const state = getState();
        const {currentUserId} = state.entities.users;
        const {deviceToken} = state.entities.general;
        const message = intl.formatMessage({
            id: 'mobile.session_expired',
            defaultMessage: 'Session Expired: Please log in to continue receiving notifications.',
        });

        // Once the user logs in we are going to wait for 10 seconds
        // before retrieving the session that belongs to this device
        // to ensure that we get the actual session without issues
        // then we can schedule the local notification for the session expired
        setTimeout(async () => {
            let sessions;
            try {
                sessions = await dispatch(getSessions(currentUserId));
            } catch (e) {
                console.warn('Failed to get current session', e); // eslint-disable-line no-console
                return;
            }

            if (!Array.isArray(sessions.data)) {
                return;
            }

            const session = sessions.data.find((s) => s.device_id === deviceToken);
            const expiresAt = session?.expires_at || 0; //eslint-disable-line camelcase

            if (expiresAt) {
                PushNotifications.localNotificationSchedule({
                    date: new Date(expiresAt),
                    message,
                    userInfo: {
                        localNotification: true,
                    },
                });
            }
        }, 10000);
    };
}

export default {
    handleLoginIdChanged,
    handlePasswordChanged,
    handleSuccessfulLogin,
    scheduleExpiredNotification,
};
