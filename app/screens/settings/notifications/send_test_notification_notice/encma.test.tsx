// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SendTestNotificationNotice from './send_test_notification_notice';

import type Database from '@nozbe/watermelondb/Database';

jest.mock('expo-application', () => ({
    applicationId: 'com.encma.hxmain',
}));

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://server.example.com',
}));

jest.mock('@actions/remote/notifications', () => ({
    sendTestNotification: jest.fn(),
}));

describe('ENCMA notification troubleshooting', () => {
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('keeps the test action but removes the upstream documentation link', () => {
        renderWithEverything(
            <SendTestNotificationNotice
                serverVersion='10.3.0'
                userId='user-id'
                isCloud={false}
                telemetryId='telemetry-id'
            />,
            {database},
        );

        expect(screen.getByText('Send a test notification')).toBeTruthy();
        expect(screen.queryByText('Troubleshooting docs')).toBeNull();
    });
});
