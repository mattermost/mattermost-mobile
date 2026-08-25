// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import InAppNotificationStore from './in_app_notification_store';

describe('InAppNotificationStore', () => {
    afterEach(() => {
        InAppNotificationStore.dismiss();
    });

    it('should have initial state with visible false and null notification', () => {
        const state = InAppNotificationStore.getState();

        expect(state.visible).toBe(false);
        expect(state.notification).toBeNull();
        expect(state.serverUrl).toBeUndefined();
        expect(state.serverName).toBeUndefined();
    });

    it('should show notification with server info', () => {
        const mockNotification = {
            identifier: 'notification-1',
            title: 'Test Notification',
            body: 'Test Body',
            sound: '',
            badge: 0,
            type: '',
            thread: '',
            payload: {
                channel_id: 'channel-1',
                post_id: 'post-1',
                type: 'message',
                version: '1.0',
                isCRTEnabled: false,
            },
        } as NotificationWithData;

        InAppNotificationStore.show(mockNotification, 'https://server.com', 'Test Server');

        const state = InAppNotificationStore.getState();
        expect(state.visible).toBe(true);
        expect(state.notification).toBe(mockNotification);
        expect(state.serverUrl).toBe('https://server.com');
        expect(state.serverName).toBe('Test Server');
    });

    it('should show notification without server name', () => {
        const mockNotification = {
            identifier: 'notification-2',
            title: 'Another Notification',
            body: 'Another Body',
            sound: '',
            badge: 0,
            type: '',
            thread: '',
        } as NotificationWithData;

        InAppNotificationStore.show(mockNotification, 'https://another-server.com');

        const state = InAppNotificationStore.getState();
        expect(state.visible).toBe(true);
        expect(state.notification).toBe(mockNotification);
        expect(state.serverUrl).toBe('https://another-server.com');
        expect(state.serverName).toBeUndefined();
    });

    it('should dismiss notification', () => {
        const mockNotification = {
            identifier: 'notification-3',
            title: 'Dismissible Notification',
            body: 'Test Body',
            sound: '',
            badge: 0,
            type: '',
            thread: '',
        } as NotificationWithData;

        InAppNotificationStore.show(mockNotification, 'https://server.com');
        expect(InAppNotificationStore.getState().visible).toBe(true);

        InAppNotificationStore.dismiss();

        const state = InAppNotificationStore.getState();
        expect(state.visible).toBe(false);
        expect(state.notification).toBeNull();
        expect(state.serverUrl).toBeUndefined();
        expect(state.serverName).toBeUndefined();
    });

    it('should replace existing notification with new one', () => {
        const firstNotification = {
            identifier: 'notification-1',
            title: 'First',
            body: 'First Body',
            sound: '',
            badge: 0,
            type: '',
            thread: '',
        } as NotificationWithData;

        const secondNotification = {
            identifier: 'notification-2',
            title: 'Second',
            body: 'Second Body',
            sound: '',
            badge: 0,
            type: '',
            thread: '',
        } as NotificationWithData;

        InAppNotificationStore.show(firstNotification, 'https://server1.com', 'Server 1');
        expect(InAppNotificationStore.getState().notification).toBe(firstNotification);

        InAppNotificationStore.show(secondNotification, 'https://server2.com', 'Server 2');
        const state = InAppNotificationStore.getState();
        expect(state.notification).toBe(secondNotification);
        expect(state.serverUrl).toBe('https://server2.com');
        expect(state.serverName).toBe('Server 2');
    });

    it('should emit values through observable', () => {
        const mockCallback = jest.fn();
        const subscription = InAppNotificationStore.observe().subscribe(mockCallback);

        // Should immediately get current state
        expect(mockCallback).toHaveBeenCalledWith({
            visible: false,
            notification: null,
            serverUrl: undefined,
            serverName: undefined,
        });

        const mockNotification = {
            identifier: 'notification-1',
            title: 'Observable Test',
            body: 'Test Body',
            sound: '',
            badge: 0,
            type: '',
            thread: '',
        } as NotificationWithData;

        InAppNotificationStore.show(mockNotification, 'https://server.com', 'Test Server');

        // Should get new state
        expect(mockCallback).toHaveBeenCalledWith({
            visible: true,
            notification: mockNotification,
            serverUrl: 'https://server.com',
            serverName: 'Test Server',
        });

        InAppNotificationStore.dismiss();

        // Should get dismissed state
        expect(mockCallback).toHaveBeenCalledWith({
            visible: false,
            notification: null,
            serverUrl: undefined,
            serverName: undefined,
        });

        expect(mockCallback).toHaveBeenCalledTimes(3);

        subscription.unsubscribe();

        // After unsubscribe, callback should not be called
        InAppNotificationStore.show(mockNotification, 'https://server.com');
        expect(mockCallback).toHaveBeenCalledTimes(3);
    });
});
