// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import {IntlShape} from 'react-intl';

import DatabaseManager from '@database/manager';
import PushNotifications from '@init/push_notifications';
import {getCommonSystemValues} from '@app/queries/servers/system';
import {getSessions} from '@actions/remote/user';
import {Config} from '@typings/database/models/servers/config';

const sortByNewest = (a: Session, b: Session) => {
    if (a.create_at > b.create_at) {
        return -1;
    }

    return 1;
};

export const scheduleExpiredNotification = async (serverUrl: string, intl: IntlShape) => {
    const database = DatabaseManager.serverDatabases[serverUrl].database;
    const {currentUserId, config}: {currentUserId: string, config: Partial<Config>} = await getCommonSystemValues(database);

    if (config.ExtendSessionLengthWithActivity === 'true') {
        PushNotifications.cancelAllLocalNotifications();
        return null;
    }

    const timeOut = setTimeout(async () => {
        clearTimeout(timeOut);
        let sessions: Session[]|undefined;

        try {
            sessions = await getSessions(serverUrl, currentUserId);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('Failed to get user sessions', e);
            return;
        }

        if (!Array.isArray(sessions)) {
            return;
        }

        const session = sessions.sort(sortByNewest)[0];
        const expiresAt = session?.expires_at || 0;
        const expiresInDays = parseInt(String(Math.ceil(Math.abs(moment.duration(moment().diff(expiresAt)).asDays()))), 10);

        const message = intl.formatMessage(
            {
                id: 'mobile.session_expired',
                defaultMessage: 'Session Expired: Please log in to continue receiving notifications. Sessions for {siteName} are configured to expire every {daysCount, number} {daysCount, plural, one {day} other {days}}.'},
            {
                siteName: config.SiteName,
                daysCount: expiresInDays,
            },
        );

        if (expiresAt) {
            //@ts-expect-error: Does not need to set all Notification properties
            PushNotifications.scheduleNotification({
                fireDate: expiresAt,
                body: message,
                payload: {
                    userInfo: {
                        local: true,
                    },
                },
            });
        }
    }, 20000);

    return null;
};
