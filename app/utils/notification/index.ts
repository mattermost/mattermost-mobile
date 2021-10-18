// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {IntlShape} from 'react-intl';
import {Alert, DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';
import {popToRoot} from '@screens/navigation';

export const convertToNotificationData = (notification: Notification, tapped = true) => {
    if (!notification.payload) {
        return notification as unknown as NotificationWithData;
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
