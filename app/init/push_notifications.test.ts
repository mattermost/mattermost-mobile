// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, DeviceEventEmitter, Platform} from 'react-native';

import {storeDeviceToken} from '@actions/app/global';
import {markChannelAsViewed} from '@actions/local/channel';
import {updateThread} from '@actions/local/thread';
import {openNotification} from '@actions/remote/notifications';
import {Device, Events, PushNotification} from '@constants';
import DatabaseManager from '@database/manager';
import {getCurrentChannelId} from '@queries/servers/system';
import {getIsCRTEnabled, getThreadById} from '@queries/servers/thread';
import EphemeralStore from '@store/ephemeral_store';
import NavigationStore from '@store/navigation_store';
import {isMainActivity} from '@utils/helpers';

import PushNotifications from './push_notifications';

import type ThreadModel from '@typings/database/models/servers/thread';

const subscription = {remove: jest.fn()};
const events = {
    registerNotificationOpened: jest.fn(() => subscription),
    registerRemoteNotificationsRegistered: jest.fn(() => subscription),
    registerNotificationReceivedBackground: jest.fn(() => subscription),
    registerNotificationReceivedForeground: jest.fn(() => subscription),
    registerRemoteNotificationsRegistrationFailed: jest.fn(() => subscription),
    registerRemoteNotificationsRegistrationDenied: jest.fn(() => subscription),
} as any;

const mockNotifications = {
    events: () => events,
    isRegisteredForRemoteNotifications: jest.fn(),
    registerRemoteNotifications: jest.fn(),
    setCategories: jest.fn(),
    postLocalNotification: jest.fn(),
    cancelLocalNotification: jest.fn(),
};

const NotificationBackgroundFetchResult = {
    NEW_DATA: 'new-data',
    NO_DATA: 'no-data',
    FAILED: 'failed',
};

class mockNotificationAction {
}

class mockNotificationCategory {
}

jest.mock('react-native-notifications', () => ({
    Notifications: mockNotifications,
    NotificationAction: mockNotificationAction,
    NotificationCategory: mockNotificationCategory,
    NotificationBackgroundFetchResult,
}));

jest.mock('@actions/app/global');
jest.mock('@actions/local/channel');
jest.mock('@actions/local/thread');
jest.mock('@actions/remote/notifications');
jest.mock('@utils/general', () => ({
    ...jest.requireActual('@utils/general'),
    isBetaApp: jest.fn(),
}));
jest.mock('@utils/helpers', () => ({
    ...jest.requireActual('@utils/helpers'),
    isMainActivity: jest.fn(),
}));
jest.mock('@store/navigation_store', () => ({
    getVisibleScreen: jest.fn(() => 'Channel'),
}));
jest.mock('@queries/servers/system', () => ({
    getCurrentChannelId: jest.fn(),
}));
jest.mock('@queries/servers/thread', () => ({
    getIsCRTEnabled: jest.fn(),
    getThreadById: jest.fn(),
}));

describe('PushNotifications', () => {
    let pushNotifications: typeof PushNotifications;

    beforeEach(() => {
        jest.clearAllMocks();
        pushNotifications = require('./push_notifications').default;
    });

    describe('init', () => {
        it('should register event listeners', () => {
            pushNotifications.init(false);

            expect(events.registerNotificationOpened).toHaveBeenCalled();
            expect(events.registerRemoteNotificationsRegistered).toHaveBeenCalled();
            expect(events.registerNotificationReceivedBackground).toHaveBeenCalled();
            expect(events.registerNotificationReceivedForeground).toHaveBeenCalled();
            expect(events.registerRemoteNotificationsRegistrationFailed).toHaveBeenCalled();
            expect(events.registerRemoteNotificationsRegistrationDenied).toHaveBeenCalled();
        });

        it('should register for notifications when register is true', (done) => {
            pushNotifications.init(true);

            setTimeout(() => {
                expect(mockNotifications.registerRemoteNotifications).toHaveBeenCalled();
                done();
            }, 0);
        });
    });

    describe('onRemoteNotificationsRegistered', () => {
        it('should store device token with correct prefix for iOS', async () => {
            Platform.OS = 'ios';
            const deviceToken = 'test-token';

            await pushNotifications.onRemoteNotificationsRegistered({deviceToken});

            expect(storeDeviceToken).toHaveBeenCalledWith(
                `apple_rnbeta-v2:${deviceToken}`,
            );
        });

        it('should store device token with correct prefix for Android', async () => {
            pushNotifications.configured = false;
            Platform.OS = 'android';
            const deviceToken = 'test-token';

            await pushNotifications.onRemoteNotificationsRegistered({deviceToken});

            expect(storeDeviceToken).toHaveBeenCalledWith(
                `${Device.PUSH_NOTIFY_ANDROID_REACT_NATIVE}-v2:${deviceToken}`,
            );
        });
    });

    describe('handleMessageNotification', () => {
        it('should handle foreground notification', async () => {
            const notification = {
                payload: {
                    channel_id: 'channel1',
                    server_url: 'http://test.com',
                },
                foreground: true,
            };
            const handleInAppSpy = jest.spyOn(pushNotifications, 'handleInAppNotification');

            await pushNotifications.handleMessageNotification(notification as any);

            expect(handleInAppSpy).toHaveBeenCalledWith('http://test.com', notification);
        });

        it('should handle background notification with user interaction', async () => {
            const notification = {
                payload: {
                    channel_id: 'channel1',
                    server_url: 'http://test.com',
                    userInfo: {},
                },
                foreground: false,
                userInteraction: true,
            };

            await pushNotifications.handleMessageNotification(notification as any);

            expect(openNotification).toHaveBeenCalledWith('http://test.com', notification);
        });
    });

    describe('handleInAppNotification', () => {
        const mockGetCurrentChannelId = jest.mocked(getCurrentChannelId);
        const mockGetIsCRTEnabled = jest.mocked(getIsCRTEnabled);
        const mockDatabase = {};
        const mockServerDatabases = {
            'http://test.com': {
                database: mockDatabase,
            },
        };

        beforeEach(() => {
            DatabaseManager.serverDatabases = mockServerDatabases as any;
            (isMainActivity as jest.Mock).mockReturnValue(true);
            (NavigationStore.getVisibleScreen as jest.Mock).mockReturnValue('Channel');
            AppState.currentState = 'active';
            jest.spyOn(DeviceEventEmitter, 'emit').mockImplementation();
            mockGetCurrentChannelId.mockResolvedValue('channel1');
            mockGetIsCRTEnabled.mockResolvedValue(false);
        });

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('should not show notification for same channel when in channel screen', async () => {
            const serverUrl = 'http://test.com';
            const notification = {
                payload: {
                    channel_id: 'channel1',
                },
            };

            await pushNotifications.handleInAppNotification(serverUrl, notification as any);

            expect(DeviceEventEmitter.emit).not.toHaveBeenCalled();
        });

        it('should show notification for different channel when in channel screen', async () => {
            const serverUrl = 'http://test.com';
            const notification = {
                payload: {
                    channel_id: 'channel2',
                },
            };

            await pushNotifications.handleInAppNotification(serverUrl, notification as any);

            expect(DeviceEventEmitter.emit).toHaveBeenCalled();
        });

        it('should show notification when not in channel screen', async () => {
            const serverUrl = 'http://test.com';
            const notification = {
                payload: {
                    channel_id: 'channel1',
                },
            };
            jest.mocked(NavigationStore.getVisibleScreen).mockReturnValue('Settings');

            await pushNotifications.handleInAppNotification(serverUrl, notification as any);

            expect(DeviceEventEmitter.emit).toHaveBeenCalled();
        });

        it('should show notification for thread in CRT mode', async () => {
            const serverUrl = 'http://test.com';
            const notification = {
                payload: {
                    channel_id: 'channel1',
                    root_id: 'thread1',
                },
            };
            mockGetIsCRTEnabled.mockResolvedValue(true);

            await pushNotifications.handleInAppNotification(serverUrl, notification as any);

            expect(DeviceEventEmitter.emit).toHaveBeenCalled();
        });

        it('should not show notification for same thread in thread screen', async () => {
            const serverUrl = 'http://test.com';
            const notification = {
                payload: {
                    channel_id: 'channel1',
                    root_id: 'thread1',
                },
            };
            jest.mocked(NavigationStore.getVisibleScreen).mockReturnValue('Thread');
            mockGetIsCRTEnabled.mockResolvedValue(true);
            jest.spyOn(EphemeralStore, 'getCurrentThreadId').mockReturnValue('thread1');

            await pushNotifications.handleInAppNotification(serverUrl, notification as any);

            expect(DeviceEventEmitter.emit).not.toHaveBeenCalled();
        });
    });

    describe('handleClearNotification', () => {
        const mockDatabase = {};
        const mockServerDatabases = {
            'http://test.com': {
                database: mockDatabase,
            },
        };
        const mockGetIsCRTEnabled = jest.mocked(getIsCRTEnabled);
        const mockGetThreadById = jest.mocked(getThreadById);

        beforeEach(() => {
            DatabaseManager.serverDatabases = mockServerDatabases as any;
            mockGetIsCRTEnabled.mockResolvedValue(false);
        });

        it('should mark channel as viewed for non-CRT notification', async () => {
            const notification = {
                payload: {
                    channel_id: 'channel1',
                    server_url: 'http://test.com',
                },
            };

            await pushNotifications.handleClearNotification(notification as any);

            expect(markChannelAsViewed).toHaveBeenCalledWith('http://test.com', 'channel1');
        });

        it('should update thread for CRT notification', async () => {
            const notification = {
                payload: {
                    channel_id: 'channel1',
                    root_id: 'thread1',
                    server_url: 'http://test.com',
                },
            };
            mockGetIsCRTEnabled.mockResolvedValue(true);
            mockGetThreadById.mockResolvedValue({isFollowing: true} as ThreadModel);

            await pushNotifications.handleClearNotification(notification as any);

            expect(updateThread).toHaveBeenCalledWith('http://test.com', 'thread1', expect.any(Object));
        });
    });

    describe('onNotificationOpened', () => {
        it('should process notification with user interaction', () => {
            const notification = {
                payload: {
                    channel_id: 'channel1',
                },
            };
            const completion = jest.fn();
            const processSpy = jest.spyOn(pushNotifications, 'processNotification');

            pushNotifications.onNotificationOpened(notification as any, completion);

            expect(processSpy).toHaveBeenCalledWith(expect.objectContaining({
                userInteraction: true,
            }));
            expect(completion).toHaveBeenCalled();
        });
    });

    describe('onNotificationReceivedBackground', () => {
        it('should not process unverified notification', async () => {
            const notification = {
                payload: {
                    verified: 'false',
                    ackId: '123',
                },
            };
            const completion = jest.fn();
            const processSpy = jest.spyOn(pushNotifications, 'processNotification');

            await pushNotifications.onNotificationReceivedBackground(notification as any, completion);

            expect(processSpy).not.toHaveBeenCalled();
        });

        it('should process verified notification', async () => {
            const notification = {
                payload: {
                    verified: 'true',
                    channel_id: 'channel1',
                },
            };
            const completion = jest.fn();
            const processSpy = jest.spyOn(pushNotifications, 'processNotification');

            await pushNotifications.onNotificationReceivedBackground(notification as any, completion);

            expect(processSpy).toHaveBeenCalled();
            expect(completion).toHaveBeenCalledWith('new-data');
        });
    });

    describe('onNotificationReceivedForeground', () => {
        beforeEach(() => {
            (isMainActivity as jest.Mock).mockReturnValue(true);
            AppState.currentState = 'active';
        });

        it('should not process unverified notification', () => {
            const notification = {
                payload: {
                    verified: 'false',
                    ackId: '123',
                },
            };
            const completion = jest.fn();
            const processSpy = jest.spyOn(pushNotifications, 'processNotification');

            pushNotifications.onNotificationReceivedForeground(notification as any, completion);

            expect(processSpy).not.toHaveBeenCalled();
        });

        it('should process verified notification with sound', () => {
            const notification = {
                payload: {
                    verified: 'true',
                    channel_id: 'channel1',
                },
            };
            const completion = jest.fn();
            const processSpy = jest.spyOn(pushNotifications, 'processNotification');

            pushNotifications.onNotificationReceivedForeground(notification as any, completion);

            expect(processSpy).toHaveBeenCalled();
            expect(completion).toHaveBeenCalledWith({
                alert: false,
                sound: true,
                badge: true,
            });
        });
    });

    describe('handleSessionNotification', () => {
        beforeEach(() => {
            jest.spyOn(DeviceEventEmitter, 'emit');
        });

        it('should emit session expired event on user interaction', async () => {
            const notification = {
                payload: {
                    server_url: 'http://test.com',
                },
                userInteraction: true,
            };

            await pushNotifications.handleSessionNotification(notification as any);

            expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(Events.SESSION_EXPIRED, 'http://test.com');
        });

        it('should emit server logout event without user interaction', async () => {
            const notification = {
                payload: {
                    server_url: 'http://test.com',
                },
                userInteraction: false,
            };

            await pushNotifications.handleSessionNotification(notification as any);

            expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(Events.SERVER_LOGOUT, {serverUrl: 'http://test.com'});
        });
    });

    describe('processNotification', () => {
        beforeEach(() => {
            jest.spyOn(pushNotifications, 'handleClearNotification');
            jest.spyOn(pushNotifications, 'handleMessageNotification');
            jest.spyOn(pushNotifications, 'handleSessionNotification');
        });

        it('should handle clear notification', async () => {
            const notification = {
                payload: {
                    type: PushNotification.NOTIFICATION_TYPE.CLEAR,
                },
            };

            await pushNotifications.processNotification(notification as any);

            expect(pushNotifications.handleClearNotification).toHaveBeenCalledWith(notification);
        });

        it('should handle message notification', async () => {
            const notification = {
                payload: {
                    type: PushNotification.NOTIFICATION_TYPE.MESSAGE,
                },
            };

            await pushNotifications.processNotification(notification as any);

            expect(pushNotifications.handleMessageNotification).toHaveBeenCalledWith(notification);
        });

        it('should handle session notification', async () => {
            const notification = {
                payload: {
                    type: PushNotification.NOTIFICATION_TYPE.SESSION,
                },
            };

            await pushNotifications.processNotification(notification as any);

            expect(pushNotifications.handleSessionNotification).toHaveBeenCalledWith(notification);
        });

        it('should not process notification without payload', async () => {
            const notification = {} as any;

            await pushNotifications.processNotification(notification);

            expect(pushNotifications.handleClearNotification).not.toHaveBeenCalled();
            expect(pushNotifications.handleMessageNotification).not.toHaveBeenCalled();
            expect(pushNotifications.handleSessionNotification).not.toHaveBeenCalled();
        });
    });

    describe('notification management', () => {
        it('should schedule notification with correct date format', () => {
            const notification = {
                fireDate: new Date('2025-01-01').getTime(),
            };
            Platform.OS = 'ios';

            pushNotifications.scheduleNotification(notification as any);

            expect(mockNotifications.postLocalNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    fireDate: new Date('2025-01-01').toISOString(),
                }),
            );
        });

        it('should cancel scheduled notification', () => {
            pushNotifications.cancelScheduleNotification(123);

            expect(mockNotifications.cancelLocalNotification).toHaveBeenCalledWith(123);
        });
    });
});
