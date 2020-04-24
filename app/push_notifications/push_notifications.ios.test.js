// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NotificationsIOS from 'react-native-notifications';

import * as ViewSelectors from '@selectors/views';
import Store from '@store/store';

import PushNotification from './push_notifications.ios';

jest.mock('react-native-notifications', () => {
    let badgesCount = 0;
    let deliveredNotifications = [];

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

    it('should clear channel notifications', async () => {
        const deliveredNotifications = [

            // Three channel1 delivered notifications
            {
                identifier: 'channel1-1',
                channel_id: channel1ID,
            },
            {
                identifier: 'channel1-2',
                channel_id: channel1ID,
            },
            {
                identifier: 'channel1-3',
                channel_id: channel1ID,
            },

            // Two channel2 delivered notifications
            {
                identifier: 'channel2-1',
                channel_id: channel2ID,
            },
            {
                identifier: 'channel2-2',
                channel_id: channel2ID,
            },
        ];
        NotificationsIOS.setDeliveredNotifications(deliveredNotifications);

        const notificationCount = deliveredNotifications.length;
        expect(notificationCount).toBe(5);

        NotificationsIOS.setBadgesCount(notificationCount);
        NotificationsIOS.getBadgesCount((count) => expect(count).toBe(notificationCount));

        // Clear channel1 notifications
        await PushNotification.clearChannelNotifications(channel1ID);

        await NotificationsIOS.getDeliveredNotifications(async (deliveredNotifs) => {
            expect(deliveredNotifs.length).toBe(2);
            const channel1DeliveredNotifications = deliveredNotifs.filter((n) => n.channel_id === channel1ID);
            const channel2DeliveredNotifications = deliveredNotifs.filter((n) => n.channel_id === channel2ID);
            expect(channel1DeliveredNotifications.length).toBe(0);
            expect(channel2DeliveredNotifications.length).toBe(2);
        });
    });

    it('should clear all notifications', () => {
        const setApplicationIconBadgeNumber = jest.spyOn(PushNotification, 'setApplicationIconBadgeNumber');
        const cancelAllLocalNotifications = jest.spyOn(PushNotification, 'cancelAllLocalNotifications');

        PushNotification.clearNotifications();
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledWith(0);
        expect(NotificationsIOS.setBadgesCount).toHaveBeenCalledWith(0);
        expect(cancelAllLocalNotifications).toHaveBeenCalled();
        expect(NotificationsIOS.cancelAllLocalNotifications).toHaveBeenCalled();
    });

    it('clearChannelNotifications should set app badge number from to delivered notification count when redux store is not set', () => {
        Store.redux = null;
        const setApplicationIconBadgeNumber = jest.spyOn(PushNotification, 'setApplicationIconBadgeNumber');
        const deliveredNotifications = [{identifier: 1}, {identifier: 2}];
        NotificationsIOS.setDeliveredNotifications(deliveredNotifications);

        PushNotification.clearChannelNotifications();
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledWith(deliveredNotifications.length);
    });

    it('clearChannelNotifications should set app badge number from redux store when set', () => {
        Store.redux = {
            getState: jest.fn(),
        };
        const setApplicationIconBadgeNumber = jest.spyOn(PushNotification, 'setApplicationIconBadgeNumber');
        const deliveredNotifications = [{identifier: 1}, {identifier: 2}];
        NotificationsIOS.setDeliveredNotifications(deliveredNotifications);

        const stateBadgeCount = 2 * deliveredNotifications.length;
        ViewSelectors.getBadgeCount = jest.fn().mockReturnValue(stateBadgeCount);

        PushNotification.clearChannelNotifications();
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledWith(stateBadgeCount);
    });
});
