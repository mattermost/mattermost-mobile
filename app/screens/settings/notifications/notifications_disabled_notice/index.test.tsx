// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';

import DatabaseManager from '@database/manager/__mocks__';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import NotificationsDisabledNotice from './index';

import type Database from '@nozbe/watermelondb/Database';

const Permissions = jest.mocked(require('react-native-permissions'));

describe('Notifications Disabled Notice', () => {
    let database: Database;
    const testId = 'notifications-disabled-notice';
    const serverUrl = 'server-1';

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        jest.clearAllMocks();
    });

    it('renders the notice with correct title and body', async () => {
        const {getByText} = renderWithEverything(
            <NotificationsDisabledNotice testID={testId}/>, {database},
        );
        await waitFor(() => {
            expect(getByText('Notifications are disabled')).toBeTruthy();
            expect(getByText(/You will still see mention badges/)).toBeTruthy();
        });
    });

    it('sets the testID on the wrapper View', async () => {
        const {getByTestId} = renderWithEverything(
            <NotificationsDisabledNotice testID={testId}/>, {database},
        );
        await waitFor(() => {
            expect(getByTestId(testId)).toBeTruthy();
        });
    });

    it('calls Permissions.openSettings when button is pressed', async () => {
        const {queryByText} = renderWithEverything(
            <NotificationsDisabledNotice testID={testId}/>, {database},
        );
        const button = queryByText('Enable notifications');
        expect(button).toBeVisible();
        fireEvent.press(button);
        expect(Permissions.openSettings).toHaveBeenCalledWith('notifications');
    });

    afterAll(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });
});
