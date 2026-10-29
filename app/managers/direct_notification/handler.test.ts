// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppState, Platform} from 'react-native';
import {Notification, Notifications} from 'react-native-notifications';

import DatabaseManager from '@database/manager';
import {getChannelById, getMyChannel} from '@queries/servers/channel';
import {getConfig} from '@queries/servers/system';
import {getIsCRTEnabled, getThreadById} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';

import {clearDirectNotificationHistory, handleDirectNotification} from './handler';
import {isDirectNotificationServer} from './mode';

jest.mock('react-native-notifications', () => ({
    Notification: jest.fn().mockImplementation((payload) => ({payload})),
    Notifications: {postLocalNotification: jest.fn()},
}));
jest.mock('@database/manager', () => ({
    __esModule: true,
    default: {serverDatabases: {}},
}));
jest.mock('@managers/direct_notification/mode', () => ({
    isDirectNotificationServer: jest.fn(),
}));
jest.mock('@queries/servers/channel', () => ({
    getChannelById: jest.fn(),
    getMyChannel: jest.fn(),
}));
jest.mock('@queries/servers/system', () => ({getConfig: jest.fn()}));
jest.mock('@queries/servers/thread', () => ({
    getIsCRTEnabled: jest.fn(),
    getThreadById: jest.fn(),
}));
jest.mock('@queries/servers/user', () => ({getCurrentUser: jest.fn()}));
jest.mock('@i18n', () => ({
    DEFAULT_LOCALE: 'en',
    getLocalizedMessage: jest.fn((_locale, _id, fallback) => fallback),
}));
jest.mock('@utils/log', () => ({logWarning: jest.fn()}));
jest.mock('@utils/user', () => ({getNotificationProps: jest.fn((user) => user.notifyProps)}));

const serverUrl = 'https://direct.example.com';
const currentUser = {
    id: 'current-user',
    username: 'current',
    locale: 'en',
    status: 'online',
    notifyProps: {push: 'mention', push_status: 'online', push_threads: 'all', channel: 'true'},
    mentionKeys: [{key: '@current'}, {key: '@channel'}],
};
const channel = {id: 'channel-id', type: 'O', displayName: 'General', teamId: 'team-id'};
const myChannel = {settings: {fetch: jest.fn().mockResolvedValue({notifyProps: {}})}};
const post = {
    id: 'post-id',
    channel_id: 'channel-id',
    user_id: 'author-id',
    message: 'hello @current',
    root_id: '',
    type: '',
    props: {},
} as Post;
const message = {
    data: {
        mentions: ['current-user'],
        channel_type: 'O',
        channel_display_name: 'General',
        sender_name: 'Author',
        team_id: 'team-id',
    },
} as WebSocketMessage;

describe('Direct notification handler', () => {
    const originalPlatform = Platform.OS;
    const originalAppState = AppState.currentState;

    beforeEach(() => {
        Platform.OS = 'android';
        AppState.currentState = 'background';
        DatabaseManager.serverDatabases[serverUrl] = {database: {}} as never;
        jest.mocked(isDirectNotificationServer).mockReturnValue(true);
        jest.mocked(getCurrentUser).mockResolvedValue(currentUser as never);
        jest.mocked(getChannelById).mockResolvedValue(channel as never);
        jest.mocked(getMyChannel).mockResolvedValue(myChannel as never);
        jest.mocked(getIsCRTEnabled).mockResolvedValue(false);
        jest.mocked(getConfig).mockResolvedValue({PushNotificationContents: 'full'} as never);
        jest.mocked(getThreadById).mockResolvedValue(undefined);
        clearDirectNotificationHistory();
    });

    afterEach(() => {
        Platform.OS = originalPlatform;
        AppState.currentState = originalAppState;
        delete DatabaseManager.serverDatabases[serverUrl];
        jest.clearAllMocks();
    });

    it('posts a normal channel-open payload with stable direct identifiers', async () => {
        await handleDirectNotification(serverUrl, post, message);

        expect(Notifications.postLocalNotification).toHaveBeenCalledTimes(1);
        const notification = jest.mocked(Notifications.postLocalNotification).mock.calls[0][0] as unknown as {payload: Record<string, unknown>};
        expect(notification.payload).toMatchObject({
            body: 'hello @current',
            channel_id: 'channel-id',
            encma_direct: 'true',
            'google.message_id': 'post-id',
            is_crt_enabled: 'false',
            post_id: 'post-id',
            server_url: serverUrl,
            type: 'message',
        });
        expect(notification.payload.userInfo).toBeUndefined();
        expect(Notification).toHaveBeenCalledWith(expect.objectContaining({identifier: 'post-id'}));
    });

    it('deduplicates repeated WebSocket deliveries of the same post', async () => {
        await handleDirectNotification(serverUrl, post, message);
        await handleDirectNotification(serverUrl, post, message);

        expect(Notifications.postLocalNotification).toHaveBeenCalledTimes(1);
    });

    it('does not display a local notification while the app is active', async () => {
        AppState.currentState = 'active';
        await handleDirectNotification(serverUrl, post, message);

        expect(Notifications.postLocalNotification).not.toHaveBeenCalled();
    });

    it('does not treat GM membership as an explicit channel-level mention', async () => {
        jest.mocked(getChannelById).mockResolvedValue({...channel, type: 'G'} as never);
        jest.mocked(getMyChannel).mockResolvedValue({
            settings: {fetch: jest.fn().mockResolvedValue({notifyProps: {push: 'mention'}})},
        } as never);
        const gmMessage = {...message, data: {...message.data, channel_type: 'G'}};

        await handleDirectNotification(serverUrl, {...post, message: 'routine GM update'}, gmMessage);
        expect(Notifications.postLocalNotification).not.toHaveBeenCalled();

        await handleDirectNotification(serverUrl, {...post, id: 'mentioned-post', message: 'hello @current'}, gmMessage);
        expect(Notifications.postLocalNotification).toHaveBeenCalledTimes(1);
    });
});
