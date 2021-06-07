// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import {IntlShape} from 'react-intl';

import {Client4} from '@client/rest';
import PushNotifications from '@init/push_notifications';
import {getCommonSystemValues} from '@queries/system';
import {getSessions} from '@requests/remote/user';
import {Config} from '@typings/database/config';
import {getActiveServerDatabase} from '@utils/database';
import {isMinimumServerVersion} from '@utils/helpers';

const MAJOR_VERSION = 5;
const MINOR_VERSION = 24;

const sortByNewest = (a: any, b: any) => {
    if (a.create_at > b.create_at) {
        return -1;
    }

    return 1;
};

export const scheduleExpiredNotification = async (intl: IntlShape) => {
    const {activeServerDatabase: database, error} = await getActiveServerDatabase();
    if (!database) {
        return {error};
    }

    const {currentUserId, config}: {currentUserId: string, config: Partial<Config>} = await getCommonSystemValues(database);

    if (isMinimumServerVersion(Client4.serverVersion, MAJOR_VERSION, MINOR_VERSION) && config.ExtendSessionLengthWithActivity === 'true') {
        PushNotifications.cancelAllLocalNotifications();
        return null;
    }

    const timeOut = setTimeout(async () => {
        clearTimeout(timeOut);
        let sessions: any;

        try {
            sessions = await getSessions(currentUserId);
        } catch (e) {
            // console.warn('Failed to get current session', e);
            return;
        }

        if (!Array.isArray(sessions?.data)) {
            return;
        }

        const session = sessions.data.sort(sortByNewest)[0];
        const expiresAt = session?.expires_at || 0; //eslint-disable-line camelcase
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
            PushNotifications.scheduleNotification({
                fireDate: expiresAt,
                body: message,
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                userInfo: {
                    local: true,
                },
            });
        }
    }, 20000);

    return null;
};
