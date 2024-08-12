// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import {createIntl} from 'react-intl';
import {Alert, DeviceEventEmitter} from 'react-native';
import {Notifications} from 'react-native-notifications';

import {Events} from '@constants';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';
import {popToRoot} from '@screens/navigation';

import {
    convertToNotificationData,
    notificationError,
    emitNotificationError,
    scheduleExpiredNotification,
} from '.';

describe('Notification Utils', () => {
    const intl = createIntl({locale: DEFAULT_LOCALE, messages: getTranslations(DEFAULT_LOCALE)});
    const notification = {
        identifier: 'id',
        payload: {
            ack_id: 'ack_id',
            channel_id: 'channel_id',
            channel_name: 'channel_name',
            from_webhook: true,
            message: 'Test message',
            override_icon_url: 'icon_url',
            override_username: 'username',
            post_id: 'post_id',
            root_id: 'root_id',
            sender_id: 'sender_id',
            sender_name: 'sender_name',
            server_id: 'server_id',
            server_url: 'server_url',
            team_id: 'team_id',
            type: 'message',
            sub_type: 'sub_type',
            use_user_icon: true,
            version: '1.0',
            is_crt_enabled: 'true',
            data: {},
        },
        body: 'body',
    };

    const session = {
        expires_at: moment().add(10, 'hours').valueOf(),
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('convertToNotificationData', () => {
        it('should convert notification with payload to NotificationWithData', () => {
            const result = convertToNotificationData(notification as any, true);
            const not = {...notification};
            Reflect.deleteProperty(not.payload, 'is_crt_enabled');
            expect(result).toEqual({
                ...not,
                payload: {
                    ...not.payload,
                    identifier: 'id',
                    isCRTEnabled: true,
                    message: 'Test message',
                },
                userInteraction: true,
                foreground: false,
            });
        });

        it('should return the original notification if no payload is present', () => {
            const result = convertToNotificationData({identifier: 'id'} as any, false);
            expect(result).toEqual({identifier: 'id'});
        });
    });

    describe('notificationError', () => {
        it('should display alert and popToRoot for Channel type', () => {
            notificationError(intl, 'Channel');
            expect(Alert.alert).toHaveBeenCalledWith(
                'Message not found',
                'This message belongs to a channel where you are not a member.',
            );
            expect(popToRoot).toHaveBeenCalled();
        });

        it('should display alert and popToRoot for Team type', () => {
            notificationError(intl, 'Team');
            expect(Alert.alert).toHaveBeenCalledWith(
                'Message not found',
                'This message belongs to a team where you are not a member.',
            );
            expect(popToRoot).toHaveBeenCalled();
        });

        it('should display alert and popToRoot for Post type', () => {
            notificationError(intl, 'Post');
            expect(Alert.alert).toHaveBeenCalledWith(
                'Message not found',
                'The message has not been found.',
            );
            expect(popToRoot).toHaveBeenCalled();
        });

        it('should display alert and popToRoot for Connection type', () => {
            notificationError(intl, 'Connection');
            expect(Alert.alert).toHaveBeenCalledWith(
                'Message not found',
                'The server is unreachable and it was not possible to retrieve the specific message information for the notification.',
            );
            expect(popToRoot).toHaveBeenCalled();
        });
    });

    describe('emitNotificationError', () => {
        it('should emit notification error after 500ms', (done) => {
            const spyEmit = jest.spyOn(DeviceEventEmitter, 'emit');
            emitNotificationError('Channel');
            setTimeout(() => {
                expect(spyEmit).toHaveBeenCalledWith(Events.NOTIFICATION_ERROR, 'Channel');
                done();
            }, 600); // wait a little longer than 500ms to ensure the timeout has executed
        });
    });

    describe('scheduleExpiredNotification', () => {
        it('should schedule a notification for session expiration with hours', () => {
            const result = scheduleExpiredNotification('server_url', session as any, 'ServerName', 'en');
            expect(Notifications.postLocalNotification).toHaveBeenCalledWith(expect.objectContaining({
                fireDate: new Date(session.expires_at).toISOString(),
                body: 'Please log in to continue receiving notifications. Sessions for ServerName are configured to expire every 10 hours.',
                title: 'Session Expired',
            }));
            expect(result).toBeDefined();
        });

        it('should return 0 if expiresAt is not defined', () => {
            const result = scheduleExpiredNotification('server_url', {} as any, 'ServerName', 'en');
            expect(result).toBe(0);
        });
    });
});
