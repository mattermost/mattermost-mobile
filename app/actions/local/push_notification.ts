// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import {createIntl} from 'react-intl';

import {getSessions} from '@actions/remote/session';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import PushNotifications from '@init/push_notifications';
import {sortByNewest} from '@utils/general';

export const scheduleExpiredNotification = async (serverUrl: string, config: Partial<ClientConfig>, userId: string, locale = DEFAULT_LOCALE) => {
    if (config.ExtendSessionLengthWithActivity === 'true') {
        PushNotifications.cancelAllLocalNotifications();
        return null;
    }

    const timeOut = setTimeout(async () => {
        clearTimeout(timeOut);
        let sessions: Session[]|undefined;

        try {
            sessions = await getSessions(serverUrl, userId);
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
        const expiresInDays = Math.ceil(Math.abs(moment.duration(moment().diff(moment(expiresAt))).asDays()));
        const intl = createIntl({locale, messages: getTranslations(locale)});
        const body = intl.formatMessage({
            id: 'mobile.session_expired',
            defaultMessage: 'Session Expired: Please log in to continue receiving notifications. Sessions for {siteName} are configured to expire every {daysCount, number} {daysCount, plural, one {day} other {days}}.',
        }, {siteName: config.SiteName, daysCount: expiresInDays});

        if (expiresAt && body) {
            //@ts-expect-error: Does not need to set all Notification properties
            PushNotifications.scheduleNotification({
                fireDate: expiresAt,
                body,
                payload: {
                    userInfo: {
                        local: true,
                    },
                },
            });
        }
    }, 1000);

    return null;
};
