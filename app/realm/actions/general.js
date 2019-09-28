// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';

import {GeneralTypes} from 'app/realm/action_types';
import {General} from 'app/constants';
import PushNotifications from 'app/push_notifications';
import EphemeralStore from 'app/store/ephemeral_store';
import {t} from 'app/utils/i18n';
import {recordTime} from 'app/utils/segment';

import {forceLogoutIfNecessary, FormattedError} from './helpers';

// TODO: Remove redux compatibility
import {reduxStore} from 'app/store';
import {loadConfigAndLicense as loadConfigAndLicenseRedux} from 'app/actions/views/root';

export function pingServer(url) {
    return async () => {
        let data;
        try {
            Client4.setUrl(url);
            data = await Client4.ping();
            if (data.status !== 'OK') {
                // successful ping but not the right return {data}
                return {
                    error: new FormattedError(
                        'mobile.server_ping_failed',
                        'Cannot connect to the server. Please check your server URL and internet connection.'
                    ),
                };
            }
        } catch (error) { // Client4Error
            return {error};
        }

        return {data};
    };
}

export function loadConfigAndLicense(save = true) {
    return async (dispatch, getState) => {
        reduxStore.dispatch(loadConfigAndLicenseRedux()); // TODO: Remove redux compatibility
        try {
            const general = getState().objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
            const [config, license] = await Promise.all([
                Client4.getClientConfigOld(),
                Client4.getClientLicenseOld(),
            ]);

            let dataRetentionPolicy;

            if (general?.currentUser) {
                if (config?.DataRetentionEnableMessageDeletion && config?.DataRetentionEnableMessageDeletion === 'true' &&
                    license?.IsLicensed === 'true' && license?.DataRetention === 'true') {
                    try {
                        dataRetentionPolicy = await Client4.getDataRetentionPolicy();
                    } catch (e) {
                        forceLogoutIfNecessary(e);
                    }
                }
            }

            const data = {
                config,
                license,
                dataRetentionPolicy,
                serverVersion: Client4.getServerVersion(),
                deviceToken: EphemeralStore.deviceToken,
            };

            if (save) {
                dispatch({
                    type: GeneralTypes.RECEIVED_GENERAL_UPDATE,
                    data,
                });
            }

            return data;
        } catch (e) {
            return {error: e};
        }
    };
}

export function saveConfigAndLicense(config, license) {
    return async (dispatch) => {
        dispatch({
            type: GeneralTypes.RECEIVED_GENERAL_UPDATE,
            data: {
                config,
                license,
                serverVersion: Client4.getServerVersion(),
                deviceToken: EphemeralStore.deviceToken,
            },
        });
    };
}

export function scheduleExpiredNotification(intl) {
    return () => {
        if (EphemeralStore.deviceToken) {
            // Once the user logs in we are going to wait for 10 seconds
            // before retrieving the session that belongs to this device
            // to ensure that we get the actual session without issues
            // then we can schedule the local notification for the session expired
            setTimeout(async () => {
                let sessions;
                try {
                    sessions = await Client4.getSessions('me');
                } catch (e) {
                    console.warn('Failed to get current session', e); // eslint-disable-line no-console
                    return;
                }

                if (!Array.isArray(sessions.data)) {
                    return;
                }

                const session = sessions.data.find((s) => s.device_id === EphemeralStore.deviceToken);
                const expiresAt = session?.expires_at || 0; //eslint-disable-line camelcase

                if (expiresAt) {
                    const message = intl.formatMessage({
                        id: t('mobile.session_expired'),
                        defaultMessage: 'Session Expired: Please log in to continue receiving notifications.',
                    });

                    PushNotifications.localNotificationSchedule({
                        date: new Date(expiresAt),
                        message,
                        userInfo: {
                            localNotification: true,
                        },
                    });
                }
            }, 10000);
        }
    };
}

export function sendPasswordResetEmail(email) {
    return async () => {
        let data = null;
        try {
            data = await Client4.sendPasswordResetEmail(email);
        } catch (error) {
            return {error};
        }

        return {data};
    };
}

export function recordLoadTime(screenName, category) {
    return async (dispatch, getState) => {
        const general = getState().objectForPrimaryKey('General', General.REALM_SCHEMA_ID);

        recordTime(screenName, category, general.currentUserId);
    };
}
