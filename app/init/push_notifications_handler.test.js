// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {PostTypes} from 'mattermost-redux/action_types';

import PushNotificationHandler from './push_notifications_handler';

jest.mock('app/init/credentials', () => ({
    getAppCredentials: jest.fn().mockReturnValue({
        username: 'device-token,current-user-id',
        password: 'token,url',
    }),
    getCurrentServerUrl: jest.fn().mockReturnValue('url'),
}));

jest.mock('app/actions/views/root', () => ({
    createPostForNotificationReply: jest.fn().mockImplementation(() => {
        return () => ({error: 'error'});
    }),
}));

jest.mock('app/selectors/i18n', () => ({
    getCurrentLocale: jest.fn().mockReturnValue('en'),
}));

jest.mock('react-native-notifications', () => {
    return {
        requestPermissions: jest.fn(),
        addEventListener: jest.fn(),
        NotificationAction: jest.fn(),
        NotificationCategory: jest.fn(),
        localNotification: jest.fn(),
        getInitialNotification: jest.fn(() => Promise.resolve()),
    };
});

const mockStore = configureMockStore([thunk]);
const reduxStore = mockStore({});
PushNotificationHandler.configure(reduxStore);

describe('PushNotifications', () => {
    it('should add channel_id to failed push notification reply', async () => {
        let notification = PushNotificationHandler.getNotification();
        expect(notification).toBe(null);

        const channelID = 'channel-id';
        const data = {channel_id: channelID};
        const text = 'text';
        const completion = () => {};
        await PushNotificationHandler.onPushNotificationReply(data, text, completion);

        const storeActions = reduxStore.getActions();
        const receivedPost = storeActions.some((action) => action.type === PostTypes.RECEIVED_POST);
        expect(receivedPost).toBe(false);

        notification = PushNotificationHandler.getNotification();
        expect(notification.userInfo.channel_id).toBe(channelID);
    });
});
