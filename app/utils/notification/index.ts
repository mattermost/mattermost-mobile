// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import {createIntl, type IntlShape} from 'react-intl';
import {Alert, DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';
import {NOTIFICATION_TYPE} from '@constants/push_notification';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import PushNotifications from '@init/push_notifications';
import {popToRoot} from '@screens/navigation';

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
            message: ((payload.type === NOTIFICATION_TYPE.MESSAGE) ? payload.message || notification.body : payload.body),
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
            sub_type: payload.sub_type,
            use_user_icon: payload.use_user_icon,
            version: payload.version,
            isCRTEnabled: typeof payload.is_crt_enabled === 'string' ? payload.is_crt_enabled === 'true' : Boolean(payload.is_crt_enabled),
            data: payload.data,
        },
        userInteraction: tapped,
        foreground: false,
    };

    return notificationData;
};

export const notificationError = (intl: IntlShape, type: 'Team' | 'Channel' | 'Connection' | 'Post') => {
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
        case 'Post':
            message = intl.formatMessage({
                id: 'notification.no_post',
                defaultMessage: 'The message has not been found.',
            });
            break;
        case 'Connection':
            message = intl.formatMessage({
                id: 'notification.no_connection',
                defaultMessage: 'The server is unreachable and it was not possible to retrieve the specific message information for the notification.',
            });
            break;
    }

    Alert.alert(title, message);
    popToRoot();
};

export const emitNotificationError = (type: 'Team' | 'Channel' | 'Post' | 'Connection') => {
    const req = setTimeout(() => {
        DeviceEventEmitter.emit(Events.NOTIFICATION_ERROR, type);
        clearTimeout(req);
    }, 500);
};

export const scheduleExpiredNotification = (serverUrl: string, session: Session, serverName: string, locale = DEFAULT_LOCALE) => {
    const expiresAt = session?.expires_at || 0;
    const expiresInHours = Math.ceil(Math.abs(moment.duration(moment().diff(moment(expiresAt))).asHours()));
    const expiresInDays = Math.floor(expiresInHours / 24); // Calculate expiresInDays
    const remainingHours = expiresInHours % 24; // Calculate remaining hours
    const intl = createIntl({locale, messages: getTranslations(locale)});
    let body = '';
    if (expiresInDays === 0) {
        body = intl.formatMessage({
            id: 'mobile.session_expired_hrs',
            defaultMessage: 'Please log in to continue receiving notifications. Sessions for {siteName} are configured to expire every {hoursCount, number} {hoursCount, plural, one {hour} other {hours}}.',
        }, {siteName: serverName, hoursCount: remainingHours});
    } else if (expiresInHours === 0) {
        body = intl.formatMessage({
            id: 'mobile.session_expired_days',
            defaultMessage: 'Please log in to continue receiving notifications. Sessions for {siteName} are configured to expire every {daysCount, number} {daysCount, plural, one {day} other {days}}.',
        }, {siteName: serverName, daysCount: expiresInDays});
    } else {
        body = intl.formatMessage({
            id: 'mobile.session_expired_days_hrs',
            defaultMessage: 'Please log in to continue receiving notifications. Sessions for {siteName} are configured to expire every {daysCount, number} {daysCount, plural, one {day} other {days}} and {hoursCount, number} {hoursCount, plural, one {hour} other {hours}}.',
        }, {siteName: serverName, daysCount: expiresInDays, hoursCount: remainingHours});
    }
    const title = intl.formatMessage({id: 'mobile.session_expired.title', defaultMessage: 'Session Expired'});

    if (expiresAt) {
        return PushNotifications.scheduleNotification({
            fireDate: expiresAt,
            body,
            title,

            // @ts-expect-error need to be included in the notification payload
            ack_id: serverUrl,
            server_url: serverUrl,
            type: 'session',
        });
    }

    return 0;
};
