// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import PushNotification from 'app/push_notifications';

import GlobalEventHandler from './global_event_handler';

jest.mock('app/init/credentials', () => ({
    getAppCredentials: jest.fn(),
    removeAppCredentials: jest.fn(),
}));

const mockStore = configureMockStore([thunk]);
const store = mockStore({});
GlobalEventHandler.store = store;

// TODO: Add Android test as part of https://mattermost.atlassian.net/browse/MM-17110
describe('GlobalEventHandler', () => {
    it('should clear notifications when server upgrade is needed', () => {
        const clearNotifications = jest.spyOn(PushNotification, 'clearNotifications');

        GlobalEventHandler.serverUpgradeNeeded();
        expect(clearNotifications).toHaveBeenCalled();
    });

    it('should clear notifications on logout', () => {
        const clearNotifications = jest.spyOn(PushNotification, 'clearNotifications');

        GlobalEventHandler.onLogout();
        expect(clearNotifications).toHaveBeenCalled();
    });
});