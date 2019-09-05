// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import intitialState from 'app/initial_state';
import PushNotification from 'app/push_notifications';

import GlobalEventHandler from './global_event_handler';

jest.mock('app/init/credentials', () => ({
    getCurrentServerUrl: jest.fn().mockResolvedValue(''),
    getAppCredentials: jest.fn(),
    removeAppCredentials: jest.fn(),
}));

jest.mock('react-native-notifications', () => ({
    addEventListener: jest.fn(),
    cancelAllLocalNotifications: jest.fn(),
    setBadgesCount: jest.fn(),
    NotificationAction: jest.fn(),
    NotificationCategory: jest.fn(),
}));

const mockStore = configureMockStore([thunk]);
const store = mockStore(intitialState);
GlobalEventHandler.store = store;

// TODO: Add Android test as part of https://mattermost.atlassian.net/browse/MM-17110
describe('GlobalEventHandler', () => {
    it('should clear notifications on logout', async () => {
        const clearNotifications = jest.spyOn(PushNotification, 'clearNotifications');

        await GlobalEventHandler.onLogout();
        expect(clearNotifications).toHaveBeenCalled();
    });
});
