// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, Linking, Platform} from 'react-native';
import {Notifications} from 'react-native-notifications';

import {removePost} from '@actions/local/post';
import {switchToChannelById} from '@actions/remote/channel';
import {appEntry, pushNotificationEntry} from '@actions/remote/entry';
import {fetchAndSwitchToThread} from '@actions/remote/thread';
import LocalConfig from '@assets/config.json';
import {DeepLink, Launch, PushNotification} from '@constants';
import DatabaseManager from '@database/manager';
import {getActiveServerUrl, getServerCredentials} from '@init/credentials';
import {getLastViewedChannelIdAndServer, getOnboardingViewed, getLastViewedThreadIdAndServer} from '@queries/app/global';
import {getAllServers} from '@queries/app/servers';
import {queryPostsByType} from '@queries/servers/post';
import {getCurrentUserId} from '@queries/servers/system';
import {queryMyTeams} from '@queries/servers/team';
import {resetToHome, resetToSelectServer, resetToOnboarding} from '@screens/navigation';
import {getLaunchPropsFromDeepLink} from '@utils/deep_link';

import {initialLaunch, launchToHome, cleanupEphemeralPosts, getLaunchPropsFromNotification} from './launch';

import type ServersModel from '@typings/database/models/app/servers';
import type {LaunchProps} from '@typings/launch';

jest.mock('react-native-notifications', () => ({
    Notifications: {
        getInitialNotification: jest.fn().mockResolvedValue(null),
        ios: {
            getDeliveredNotifications: jest.fn().mockResolvedValue([]),
        },
    },
}));

jest.mock('@actions/local/post');
jest.mock('@actions/remote/channel');
jest.mock('@actions/remote/entry', () => ({
    appEntry: jest.fn(),
    pushNotificationEntry: jest.fn(),
    upgradeEntry: jest.fn().mockResolvedValue({}),
}));
jest.mock('@actions/remote/thread');
jest.mock('@database/manager', () => ({
    getActiveServerUrl: jest.fn(),
    getActiveServerDisplayName: jest.fn(),
    destroyServerDatabase: jest.fn(),
    deleteServerDatabase: jest.fn(),
    searchUrl: jest.fn(),
    getServerUrlFromIdentifier: jest.fn(),
    getServerDatabaseAndOperator: jest.fn(),
    serverDatabases: {},
}));
jest.mock('@init/credentials');
jest.mock('@queries/app/global');
jest.mock('@queries/app/servers');
jest.mock('@queries/servers/post');
jest.mock('@queries/servers/preference');
jest.mock('@queries/servers/system');
jest.mock('@queries/servers/team');
jest.mock('@screens/navigation', () => ({
    resetToHome: jest.fn().mockResolvedValue(''),
    resetToSelectServer: jest.fn().mockResolvedValue(''),
    resetToTeams: jest.fn().mockResolvedValue(''),
    resetToOnboarding: jest.fn().mockResolvedValue(''),
}));
jest.mock('@utils/deep_link');
jest.mock('@store/ephemeral_store');

describe('Launch', () => {
    const mockServerUrl = 'http://server-1.com';
    jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue(mockServerUrl);

    const mockDatabase = {};
    const mockServerDatabases = {
        [mockServerUrl]: {
            database: mockDatabase,
        },
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        DatabaseManager.serverDatabases = mockServerDatabases;
        Platform.OS = 'ios';
        AppState.currentState = 'active';
    });

    describe('initialLaunch', () => {
        it('should handle deep link launch', async () => {
            const deepLinkUrl = 'mattermost://server-1.com';
            const launchProps = {
                launchType: Launch.DeepLink,
                serverUrl: 'server-1.com',
                extra: {data: {serverUrl: 'server-1.com'}, type: DeepLink.Server},
            } as LaunchProps;

            jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(deepLinkUrl);
            jest.mocked(getLaunchPropsFromDeepLink).mockReturnValue(launchProps);
            jest.mocked(resetToSelectServer).mockResolvedValue('');

            await initialLaunch();

            expect(Linking.getInitialURL).toHaveBeenCalled();
            expect(getLaunchPropsFromDeepLink).toHaveBeenCalledWith(deepLinkUrl, true);
            expect(resetToSelectServer).toHaveBeenCalledWith(launchProps);
        });

        it('should handle notification launch', async () => {
            const payload = {type: PushNotification.NOTIFICATION_TYPE.SESSION, ack_id: 'ack1'};

            jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
            jest.mocked(resetToSelectServer).mockResolvedValue('');

            jest.mocked(Notifications.getInitialNotification).mockResolvedValueOnce({payload} as any);

            await initialLaunch();

            expect(Linking.getInitialURL).toHaveBeenCalled();
            expect(resetToSelectServer).toHaveBeenCalledWith(expect.objectContaining({launchType: Launch.Notification}));
        });

        it('should handle normal launch with active server', async () => {
            const serverUrl = 'http://server-1.com';
            const credentials = {token: 'token1'} as ServerCredential;

            jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
            jest.mocked(getActiveServerUrl).mockResolvedValue(serverUrl);
            jest.mocked(getServerCredentials).mockResolvedValue(credentials);
            jest.mocked(getCurrentUserId).mockResolvedValue('user1');
            jest.mocked(queryMyTeams).mockReturnValue({fetchCount: () => 1} as any);

            await initialLaunch();

            expect(getActiveServerUrl).toHaveBeenCalled();
            expect(getServerCredentials).toHaveBeenCalledWith(serverUrl);
            expect(getCurrentUserId).toHaveBeenCalled();
            expect(appEntry).toHaveBeenCalledWith(serverUrl);
            expect(resetToHome).toHaveBeenCalled();
        });

        it('should handle upgrade launch with no current user', async () => {
            jest.mocked(getCurrentUserId).mockResolvedValueOnce('');

            await initialLaunch();

            expect(resetToHome).toHaveBeenCalledWith(expect.objectContaining({launchType: Launch.Upgrade}));
        });

        it('should show onboarding when enabled and not viewed', async () => {
            LocalConfig.ShowOnboarding = true;
            jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
            jest.mocked(getActiveServerUrl).mockResolvedValue(undefined);
            jest.mocked(getOnboardingViewed).mockResolvedValue(false);

            await initialLaunch();

            expect(resetToOnboarding).toHaveBeenCalled();
        });
    });

    describe('launchToHome', () => {
        const serverUrl = 'http://server-1.com';

        beforeEach(() => {
            DatabaseManager.serverDatabases = {
                [serverUrl]: {database: {}} as any,
            };
        });

        it('should handle deep link launch', async () => {
            const props = {
                launchType: Launch.DeepLink,
                serverUrl,
            };

            await launchToHome(props);

            expect(appEntry).toHaveBeenCalledWith(serverUrl);
            expect(resetToHome).toHaveBeenCalledWith(props);
        });

        it('should handle notification launch', async () => {
            const notification = {
                payload: {
                    channel_id: 'channel1',
                },
                userInteraction: true,
            };
            const props = {
                launchType: Launch.Notification,
                serverUrl,
                extra: notification,
            } as LaunchProps;

            await launchToHome(props);

            expect(pushNotificationEntry).toHaveBeenCalledWith(serverUrl, notification.payload, 'Notification');
            expect(resetToHome).toHaveBeenCalledWith(props);
        });

        it('should handle cold start with last viewed channel', async () => {
            const lastChannel = {
                server_url: serverUrl,
                channel_id: 'channel1',
            };
            jest.mocked(getLastViewedChannelIdAndServer).mockResolvedValue(lastChannel);
            jest.mocked(getLastViewedThreadIdAndServer).mockResolvedValue(null);

            const props = {
                launchType: Launch.Normal,
                serverUrl,
                coldStart: true,
            };

            await launchToHome(props);

            expect(switchToChannelById).toHaveBeenCalledWith(serverUrl, 'channel1');
            expect(appEntry).toHaveBeenCalledWith(serverUrl);
        });

        it('should handle cold start with last viewed thread', async () => {
            const lastThread = {
                server_url: serverUrl,
                thread_id: 'thread1',
            };
            jest.mocked(getLastViewedChannelIdAndServer).mockResolvedValue(null);
            jest.mocked(getLastViewedThreadIdAndServer).mockResolvedValue(lastThread);

            const props = {
                launchType: Launch.Normal,
                serverUrl,
                coldStart: true,
            };

            await launchToHome(props);

            expect(fetchAndSwitchToThread).toHaveBeenCalledWith(serverUrl, 'thread1');
            expect(appEntry).toHaveBeenCalledWith(serverUrl);
        });
    });

    describe('getLaunchPropsFromNotification', () => {
        DatabaseManager.getServerDatabaseAndOperator = jest.fn().mockReturnValue({
            database: {},
            operator: {},
        });

        it('should return launch props with server url from payload', async () => {
            const notification = {
                payload: {
                    server_url: 'http://server-1.com',
                    channel_id: 'channel1',
                },
                userInteraction: true,
            } as NotificationWithData;

            jest.mocked(DatabaseManager.searchUrl).mockReturnValue('http://server-1.com');

            const result = await getLaunchPropsFromNotification(notification);

            expect(result).toEqual({
                launchType: Launch.Notification,
                extra: notification,
                serverUrl: 'http://server-1.com',
                coldStart: false,
            });
        });

        it('should return launch props with server url from server id', async () => {
            const notification = {
                payload: {
                    server_id: 'server1',
                    channel_id: 'channel1',
                },
                userInteraction: true,
            } as NotificationWithData;

            jest.mocked(DatabaseManager.getServerUrlFromIdentifier).mockResolvedValue('http://server-1.com');

            const result = await getLaunchPropsFromNotification(notification);

            expect(result).toEqual({
                launchType: Launch.Notification,
                extra: notification,
                serverUrl: 'http://server-1.com',
                coldStart: false,
            });
        });

        it('should return launch props with error when server not found', async () => {
            const notification = {
                payload: {
                    channel_id: 'channel1',
                },
                userInteraction: true,
            } as NotificationWithData;

            const result = await getLaunchPropsFromNotification(notification);

            expect(result).toEqual({
                launchType: Launch.Notification,
                extra: notification,
                launchError: true,
                coldStart: false,
            });
        });
    });

    describe('cleanupEphemeralPosts', () => {
        it('should remove ephemeral posts', async () => {
            const serverUrl = 'http://server-1.com';
            const ephemeralPosts = [{id: 'post1'}, {id: 'post2'}];

            DatabaseManager.serverDatabases = {
                [serverUrl]: {database: {}} as any,
            };

            jest.mocked(getAllServers).mockResolvedValue([{url: serverUrl} as ServersModel]);
            jest.mocked(queryPostsByType).mockReturnValue({fetch: () => ephemeralPosts} as any);

            await cleanupEphemeralPosts();

            expect(removePost).toHaveBeenCalledTimes(2);
            expect(removePost).toHaveBeenCalledWith(serverUrl, ephemeralPosts[0]);
            expect(removePost).toHaveBeenCalledWith(serverUrl, ephemeralPosts[1]);
        });
    });
});
