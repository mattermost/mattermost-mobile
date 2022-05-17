// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import {createIntl, IntlShape} from 'react-intl';
import {Alert, DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import PushNotifications from '@init/push_notifications';
import {popToRoot} from '@screens/navigation';
import {sortByNewest} from '@utils/general';

export const convertToNotificationData = (notification: Notification, tapped = true): NotificationWithData => {
    if (!notification.payload) {
        return notification;
    }

    const {payload} = notification;
    const notificationData: NotificationWithData = {
        ...notification,
        payload: {
            ack_id: payload.ack_id,
            channel_id: payload.channel_id,
            channel_name: payload.channel_name,
            identifier: payload.identifier || notification.identifier,
            from_webhook: payload.from_webhook,
            message: ((payload.type === 'message') ? payload.message || notification.body : undefined),
            override_icon_url: payload.override_icon_url,
            override_username: payload.override_username,
            post_id: payload.post_id,
            root_id: payload.root_id,
            sender_id: payload.sender_id,
            sender_name: payload.sender_name,
            server_id: payload.server_id,
            server_url: payload.server_url,
            team_id: payload.team_id,
            type: payload.type,
            use_user_icon: payload.use_user_icon,
            version: payload.version,
        },
        userInteraction: tapped,
        foreground: false,
    };

    return notificationData;
};

export const notificationError = (intl: IntlShape, type: 'Team' | 'Channel') => {
    const title = intl.formatMessage({id: 'notification.message_not_found', defaultMessage: 'Message not found'});
    let message;
    switch (type) {
        case 'Channel':
            message = intl.formatMessage({
                id: 'notification.not_channel_member',
                defaultMessage: 'This message belongs to a channel where you are not a member.',
            });
            break;
        case 'Team':
            message = intl.formatMessage({
                id: 'notification.not_team_member',
                defaultMessage: 'This message belongs to a team where you are not a member.',
            });
            break;
    }

    Alert.alert(title, message);
    popToRoot();
};

export const emitNotificationError = (type: 'Team' | 'Channel') => {
    const req = setTimeout(() => {
        DeviceEventEmitter.emit(Events.NOTIFICATION_ERROR, type);
        clearTimeout(req);
    }, 500);
};

export const scheduleExpiredNotification = async (sessions: Session[], siteName: string, locale = DEFAULT_LOCALE) => {
    const session = sessions.sort(sortByNewest)[0];
    const expiresAt = session?.expires_at || 0;
    const expiresInDays = Math.ceil(Math.abs(moment.duration(moment().diff(moment(expiresAt))).asDays()));
    const intl = createIntl({locale, messages: getTranslations(locale)});
    const body = intl.formatMessage({
        id: 'mobile.session_expired',
        defaultMessage: 'Session Expired: Please log in to continue receiving notifications. Sessions for {siteName} are configured to expire every {daysCount, number} {daysCount, plural, one {day} other {days}}.',
    }, {siteName, daysCount: expiresInDays});

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
};
