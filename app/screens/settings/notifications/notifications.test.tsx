// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import DatabaseManager from '@database/manager';
import * as DeviceHooks from '@hooks/device';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Notifications from './notifications';

import type Database from '@nozbe/watermelondb/Database';

const MockedNotifications = jest.mocked(require('react-native-notifications').Notifications);

function getBaseProps(): ComponentProps<typeof Notifications> {
    return {
        componentId: 'Settings' as const,
        currentUser: TestHelper.fakeUserModel({id: 'user1', username: 'username1'}),
        emailInterval: '0',
        enableAutoResponder: false,
        enableEmailBatching: false,
        isCRTEnabled: false,
        sendEmailNotifications: false,
        serverVersion: '10.3.0',
    };
}

describe('Notifications disabled banner', () => {
    let database: Database;
    const testId = 'notifications-disabled-notice';
    const serverUrl = 'server-1';

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        jest.clearAllMocks();
    });

    it('should be visible if notifications are disabled', async () => {
        MockedNotifications.isRegisteredForRemoteNotifications.mockResolvedValue(false);
        const wrapper = renderWithEverything(<Notifications {...getBaseProps()}/>, {database});
        await waitFor(() => {
            expect(wrapper.queryByTestId(testId)).toBeVisible();
        });
    });

    it('should not be visible if notifications are enabled', async () => {
        MockedNotifications.isRegisteredForRemoteNotifications.mockResolvedValue(true);
        const wrapper = renderWithEverything(<Notifications {...getBaseProps()}/>, {database});
        await waitFor(() => {
            expect(wrapper.queryByTestId(testId)).toBeNull();
        });
    });

    jest.spyOn(DeviceHooks, 'useAppState').mockReturnValue('active');

    it('should re-check notification registration when appState changes', async () => {
        MockedNotifications.isRegisteredForRemoteNotifications.mockResolvedValueOnce(false);
        const appStateSpy = jest.spyOn(DeviceHooks, 'useAppState');
        appStateSpy.mockReturnValue('active');
        const wrapper = renderWithEverything(<Notifications {...getBaseProps()}/>, {database});
        await waitFor(() => {
            expect(MockedNotifications.isRegisteredForRemoteNotifications).toHaveBeenCalledTimes(1);
        });

        // Testing that this is not called in the background
        MockedNotifications.isRegisteredForRemoteNotifications.mockResolvedValueOnce(true);
        appStateSpy.mockReturnValue('background');
        wrapper.rerender(<Notifications {...getBaseProps()}/>);
        await waitFor(() => {
            expect(MockedNotifications.isRegisteredForRemoteNotifications).toHaveBeenCalledTimes(1);
        });

        appStateSpy.mockReturnValue('active');
        wrapper.rerender(<Notifications {...getBaseProps()}/>);
        await waitFor(() => {
            expect(MockedNotifications.isRegisteredForRemoteNotifications).toHaveBeenCalledTimes(2);
        });
    });

    afterAll(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should prevent state update after unmount (isCurrent race prevention)', async () => {
        jest.spyOn(DeviceHooks, 'useAppState').mockReturnValue('active');

        let resolvePromise!: (value: boolean) => void;
        const promise = new Promise<boolean>((resolve) => {
            resolvePromise = resolve;
        });
        MockedNotifications.isRegisteredForRemoteNotifications.mockReturnValue(promise);

        const wrapper = renderWithEverything(<Notifications {...getBaseProps()}/>, {database});
        wrapper.unmount();

        resolvePromise(false);

        await new Promise((r) => setTimeout(r, 10));
    });
});
