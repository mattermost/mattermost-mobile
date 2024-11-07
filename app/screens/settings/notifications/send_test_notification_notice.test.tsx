// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {sendTestNotification} from '@actions/remote/notifications';
import {act, fireEvent, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {logError} from '@utils/log';
import {tryOpenURL} from '@utils/url';

import SendTestNotificationNotice from './send_test_notification_notice';

import type Database from '@nozbe/watermelondb/Database';

const version = '10.3.0';
const oldVersion = '9.2.1';

jest.mock('@utils/url', () => {
    return {
        tryOpenURL: jest.fn(),
    };
});

jest.mock('@actions/remote/notifications', () => {
    return {
        sendTestNotification: jest.fn(),
    };
});

jest.mock('@utils/log', () => {
    return {
        logError: jest.fn(),
    };
});

const mockedSendTestNotification = jest.mocked(sendTestNotification);

const allTimerExceptSetTimeout = [
    'Date' as const,
    'hrtime' as const,
    'nextTick' as const,
    'performance' as const,
    'queueMicrotask' as const,
    'requestAnimationFrame' as const,
    'cancelAnimationFrame' as const,
    'requestIdleCallback' as const,
    'cancelIdleCallback' as const,
    'setImmediate' as const,
    'clearImmediate' as const,
    'setInterval' as const,
    'clearInterval' as const,
    'clearTimeout' as const,
];

describe('SendTestNotificationNotice', () => {
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should match snapshot', () => {
        const wrapper = renderWithEverything(<SendTestNotificationNotice serverVersion={version}/>, {database});
        expect(wrapper.toJSON()).toMatchSnapshot();
    });

    it('should show nothing on older versions', () => {
        const wrapper = renderWithEverything(<SendTestNotificationNotice serverVersion={oldVersion}/>, {database});
        expect(wrapper.toJSON()).toBeNull();
    });

    it('should call send notification action when the send notification button is clicked', () => {
        const wrapper = renderWithEverything(<SendTestNotificationNotice serverVersion={version}/>, {database});
        fireEvent.press(wrapper.getByText('Troubleshooting docs'));
        expect(tryOpenURL).toHaveBeenCalledWith('https://docs.mattermost.com/collaborate/mention-people.html');
    });

    it('should call send notification action when the send notification button is clicked, and all states go through correctly', async () => {
        jest.useFakeTimers({doNotFake: allTimerExceptSetTimeout});
        const wrapper = renderWithEverything(<SendTestNotificationNotice serverVersion={version}/>, {database});

        let resolve: ((value: any) => void) | undefined;
        mockedSendTestNotification.mockReturnValueOnce(new Promise((r) => {
            resolve = r;
        }));
        fireEvent.press(wrapper.getByText('Send a test notification'));
        expect(sendTestNotification).toHaveBeenCalled();
        expect(wrapper.getByText('Sending a test notification')).toBeVisible();

        await act(() => {
            resolve?.({data: true});
        });
        expect(wrapper.getByText('Test notification sent')).toBeVisible();

        act(() => {
            jest.advanceTimersByTime(3001);
        });
        expect(wrapper.getByText('Send a test notification')).toBeVisible();
    });

    it('should call send notification action when the send notification button is clicked, and when it fails, all states go through correctly', async () => {
        jest.useFakeTimers({doNotFake: allTimerExceptSetTimeout});
        const wrapper = renderWithEverything(<SendTestNotificationNotice serverVersion={version}/>, {database});

        let resolve: ((value: any) => void) | undefined;
        mockedSendTestNotification.mockReturnValueOnce(new Promise((r) => {
            resolve = r;
        }));
        fireEvent.press(wrapper.getByText('Send a test notification'));
        expect(sendTestNotification).toHaveBeenCalled();
        expect(wrapper.getByText('Sending a test notification')).toBeVisible();

        await act(() => {
            resolve?.({error: 'some error'});
        });

        expect(wrapper.getByText('Error sending test notification')).toBeVisible();
        expect(logError).toHaveBeenCalledWith({error: 'some error'});

        act(() => {
            jest.advanceTimersByTime(3001);
        });
        expect(wrapper.getByText('Send a test notification')).toBeVisible();
    });
});
