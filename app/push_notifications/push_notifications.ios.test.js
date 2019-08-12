// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AsyncStorage from '@react-native-community/async-storage';
import NotificationsIOS from 'react-native-notifications';
import PushNotification, {FOREGROUND_NOTIFICATIONS_KEY} from './push_notifications.ios';

jest.mock('react-native-notifications', () => {
    let badgesCount = 0;
    let deliveredNotifications = {};

    return {
        getBadgesCount: jest.fn((callback) => callback(badgesCount)),
        setBadgesCount: jest.fn((count) => {
            badgesCount = count;
        }),
        addEventListener: jest.fn(),
        setDeliveredNotifications: jest.fn((notifications) => {
            deliveredNotifications = notifications;
        }),
        getDeliveredNotifications: jest.fn(async (callback) => {
            await callback(deliveredNotifications);
        }),
        removeDeliveredNotifications: jest.fn((ids) => {
            deliveredNotifications = deliveredNotifications.filter((n) => !ids.includes(n.identifier));
        }),
        cancelAllLocalNotifications: jest.fn(),
        NotificationAction: jest.fn(),
        NotificationCategory: jest.fn(),
    };
});

describe('PushNotification', () => {
    const channel1ID = 'channel-1-id';
    const channel2ID = 'channel-2-id';
    const notification = {
        getData: jest.fn(),
        getMessage: jest.fn(),
    };

    afterEach(() => AsyncStorage.clear());

    it('should track foreground notifications for channel', async () => {
        let item = await AsyncStorage.getItem(FOREGROUND_NOTIFICATIONS_KEY);
        expect(item).toBe(null);

        await PushNotification.trackForegroundNotification(channel1ID);
        item = await AsyncStorage.getItem(FOREGROUND_NOTIFICATIONS_KEY);
        expect(item).not.toBe(null);
        let foregroundNotifications = JSON.parse(item);
        expect(foregroundNotifications[channel1ID]).toBe(1);
        expect(foregroundNotifications[channel2ID]).toBe(undefined);

        await PushNotification.trackForegroundNotification(channel1ID);
        item = await AsyncStorage.getItem(FOREGROUND_NOTIFICATIONS_KEY);
        expect(item).not.toBe(null);
        foregroundNotifications = JSON.parse(item);
        expect(foregroundNotifications[channel1ID]).toBe(2);
        expect(foregroundNotifications[channel2ID]).toBe(undefined);
    });

    it('should NOT track foreground notifications for channel when opened', async () => {
        let item = await AsyncStorage.getItem(FOREGROUND_NOTIFICATIONS_KEY);
        expect(item).toBe(null);

        PushNotification.trackForegroundNotification = jest.fn();
        PushNotification.onNotificationOpened(notification);
        expect(PushNotification.trackForegroundNotification).not.toBeCalled();
        item = await AsyncStorage.getItem(FOREGROUND_NOTIFICATIONS_KEY);
        expect(item).toBe(null);
    });

    it('should increment badge number when foreground notification is received', () => {
        const setApplicationIconBadgeNumber = jest.spyOn(PushNotification, 'setApplicationIconBadgeNumber');

        NotificationsIOS.getBadgesCount((count) => expect(count).toBe(0));

        PushNotification.onNotificationReceivedForeground(notification);
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledWith(1);
        NotificationsIOS.getBadgesCount((count) => expect(count).toBe(1));

        PushNotification.onNotificationReceivedForeground(notification);
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledWith(2);
        NotificationsIOS.getBadgesCount((count) => expect(count).toBe(2));
    });

    it('should clear channel notifications and set correct badge number', async () => {
        const deliveredNotifications = [

            // Three channel1 delivered notifications
            {
                identifier: 'channel1-1',
                userInfo: {channel_id: channel1ID},
            },
            {
                identifier: 'channel1-2',
                userInfo: {channel_id: channel1ID},
            },
            {
                identifier: 'channel1-3',
                userInfo: {channel_id: channel1ID},
            },

            // Two channel2 delivered notifications
            {
                identifier: 'channel2-1',
                userInfo: {channel_id: channel2ID},
            },
            {
                identifier: 'channel2-2',
                userInfo: {channel_id: channel2ID},
            },
        ];
        NotificationsIOS.setDeliveredNotifications(deliveredNotifications);

        const foregroundNotifications = {
            [channel1ID]: 1,
            [channel2ID]: 1,
        };
        await AsyncStorage.setItem(FOREGROUND_NOTIFICATIONS_KEY, JSON.stringify(foregroundNotifications));

        const notificationCount = deliveredNotifications.length + Object.values(foregroundNotifications).reduce((a, b) => a + b);
        expect(notificationCount).toBe(7);

        NotificationsIOS.setBadgesCount(notificationCount);
        NotificationsIOS.getBadgesCount((count) => expect(count).toBe(notificationCount));

        // Clear channel1 notifications
        const setApplicationIconBadgeNumber = jest.spyOn(PushNotification, 'setApplicationIconBadgeNumber');
        await PushNotification.clearChannelNotifications(channel1ID);

        await NotificationsIOS.getDeliveredNotifications(async (deliveredNotifs) => {
            expect(deliveredNotifs.length).toBe(2);
            const channel1DeliveredNotifications = deliveredNotifs.filter((n) => n.userInfo.channel_id === channel1ID);
            const channel2DeliveredNotifications = deliveredNotifs.filter((n) => n.userInfo.channel_id === channel2ID);
            expect(channel1DeliveredNotifications.length).toBe(0);
            expect(channel2DeliveredNotifications.length).toBe(2);

            const item = await AsyncStorage.getItem(FOREGROUND_NOTIFICATIONS_KEY);
            const foregroundNotifs = JSON.parse(item);

            const channel1ForegroundNotifications = foregroundNotifs[channel1ID];
            const channel2ForegroundNotifications = foregroundNotifs[channel2ID];
            expect(channel1ForegroundNotifications).toBe(undefined);
            expect(channel2ForegroundNotifications).toBe(1);

            const badgeNumber = channel2DeliveredNotifications.length + channel2ForegroundNotifications;
            expect(setApplicationIconBadgeNumber).toHaveBeenCalledWith(badgeNumber);
        });
    });

    it('should clear all notifications', () => {
        const setApplicationIconBadgeNumber = jest.spyOn(PushNotification, 'setApplicationIconBadgeNumber');
        const cancelAllLocalNotifications = jest.spyOn(PushNotification, 'cancelAllLocalNotifications');
        const clearForegroundNotifications = jest.spyOn(PushNotification, 'clearForegroundNotifications');

        PushNotification.clearNotifications();
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledWith(0);
        expect(NotificationsIOS.setBadgesCount).toHaveBeenCalledWith(0);
        expect(cancelAllLocalNotifications).toHaveBeenCalled();
        expect(NotificationsIOS.cancelAllLocalNotifications).toHaveBeenCalled();
        expect(clearForegroundNotifications).toHaveBeenCalled();
    });
});
