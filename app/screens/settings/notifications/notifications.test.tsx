// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Notifications from './notifications';

import type UserModel from '@database/models/server/user';
import type Database from '@nozbe/watermelondb/Database';

jest.mock('react-native-notifications', () => ({
    Notifications: {
        isRegisteredForRemoteNotifications: jest.fn(),
    },
}));

function getBaseProps() {
    return {
        componentId: 'Settings' as const,
        currentUser: {} as UserModel,
        emailInterval: '0',
        enableAutoResponder: false,
        enableEmailBatching: false,
        isCRTEnabled: false,
        sendEmailNotifications: false,
        serverVersion: '10.3.0',
    };
}
const MockedNotifications = jest.mocked(require('react-native-notifications').Notifications);

describe('NoticeDisabledAppears', () => {
    let database: Database;
    const titleText = 'Notifications are disabled';

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
        jest.clearAllMocks();
    });

    it('should show notice if disabled', () => {
        MockedNotifications.isRegisteredForRemoteNotifications.mockResolvedValue(false);
        const wrapper = renderWithEverything(<Notifications {...getBaseProps()}/>, {database});
        expect(wrapper.getByText(titleText)).toBeVisible();
    });

    it('should not show notice if enabled', () => {
        MockedNotifications.isRegisteredForRemoteNotifications.mockResolvedValue(true);
        const wrapper = renderWithEverything(<Notifications {...getBaseProps()}/>, {database});
        // eslint-disable-next-line no-unused-expressions
        expect(wrapper.getByText(titleText)).not.toBeVisible;
    });

});
