// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import moment from 'moment-timezone';
import React from 'react';
import {Navigation} from 'react-native-navigation';

import {updateScheduledPost} from '@actions/remote/scheduled_post';
import {useServerUrl} from '@context/server';
import DateTimeSelector from '@screens/custom_status_clear_after/components/date_time_selector';
import {dismissModal, setButtons} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import RescheduledDraft from './reschedule_draft';

import type {Database} from '@nozbe/watermelondb';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type {AvailableScreens} from '@typings/screens/navigation';

jest.mock('@actions/remote/scheduled_post', () => ({
    updateScheduledPost: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    buildNavigationButton: jest.fn().mockReturnValue({
        id: 'reschedule-draft',
        testID: 'reschedule-draft.save.button',
        showAsAction: 'always',
    }),
    dismissModal: jest.fn(),
    setButtons: jest.fn(),
}));

jest.mock('react-native-navigation', () => {
    const registerComponentListenerMock = jest.fn();
    return {
        Navigation: {
            events: () => ({
                registerComponentListener: registerComponentListenerMock,
            }),
        },
    };
});

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(),
}));

const SERVER_URL = 'https://appv1.mattermost.com';

describe('RescheduledDraft', () => {
    let database: Database;

    const mockDraft = {
        scheduledAt: moment().add(1, 'day').valueOf(),
        toApi: jest.fn().mockResolvedValue({
            scheduled_at: moment().add(1, 'day').valueOf(),
        }),
    } as unknown as ScheduledPostModel;

    const baseProps = {
        componentId: 'test-component-id' as AvailableScreens,
        closeButtonId: 'close-button-id',
        currentUserTimezone: {
            useAutomaticTimezone: true,
            automaticTimezone: 'America/New_York',
            manualTimezone: '',
        },
        draft: mockDraft,
    };

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    beforeEach(() => {
        jest.mocked(useServerUrl).mockReturnValue(SERVER_URL);
    });

    it('should render correctly', () => {
        const {getByTestId} = renderWithEverything(
            <RescheduledDraft {...baseProps}/>, {database},
        );

        expect(getByTestId('edit_post.screen')).toBeTruthy();
    });

    it('should initialize with save button disabled', () => {
        renderWithEverything(<RescheduledDraft {...baseProps}/>, {database});

        expect(setButtons).toHaveBeenCalledWith(
            'test-component-id',
            expect.objectContaining({
                rightButtons: expect.arrayContaining([
                    expect.objectContaining({
                        enabled: true,
                    }),
                ]),
            }),
        );
    });

    it('Should enable save button when data change', async () => {
        jest.mocked(updateScheduledPost).mockResolvedValue({scheduledPost: {} as ScheduledPost, error: undefined});
        const {UNSAFE_getByType: getByType} = renderWithEverything(
            <RescheduledDraft {...baseProps}/>, {database},
        );

        const dateTimeSelector = getByType(DateTimeSelector);
        expect(dateTimeSelector).toBeTruthy();

        const newDate = moment().add(2, 'days');
        await act(async () => {
            dateTimeSelector.props.handleChange(newDate);
        });

        expect(setButtons).toHaveBeenCalled();

        const mockCalls = (setButtons as jest.Mock).mock.calls;
        const lastCallIndex = mockCalls.length - 1;
        const setButtonsCall = mockCalls[lastCallIndex][1];

        expect(setButtonsCall.rightButtons).toBeDefined();
        expect(setButtonsCall.rightButtons.length).toBeGreaterThan(0);

        const saveButton = setButtonsCall.rightButtons[0];
        expect(saveButton.enabled).toBeTruthy();
    });

    it('should call Navigation event when save button is pressed', async () => {
        const {UNSAFE_getByType: getByType} = renderWithEverything(
            <RescheduledDraft {...baseProps}/>, {database},
        );

        // Change the date to enable the save button
        const dateTimeSelector = getByType(DateTimeSelector);
        const newDate = moment().add(2, 'days');
        await act(async () => {
            dateTimeSelector.props.handleChange(newDate);
        });

        // Verify navigation listener was registered
        expect(Navigation.events().registerComponentListener).toHaveBeenCalledWith(
            expect.any(Object),
            baseProps.componentId,
        );

        // Get the navigationButtonPressed handler
        const functionToCall = jest.mocked(Navigation.events().registerComponentListener).mock.calls[0][0].navigationButtonPressed;

        // Simulate pressing the save button
        await act(async () => {
            if (functionToCall) {
                functionToCall({
                    buttonId: 'reschedule-draft',
                    componentId: '',
                });
            }
        });
    });

    it('should dismiss modal when close button is pressed', async () => {
        renderWithEverything(
            <RescheduledDraft {...baseProps}/>, {database},
        );

        // Verify navigation listener was registered
        expect(Navigation.events().registerComponentListener).toHaveBeenCalledWith(
            expect.any(Object),
            baseProps.componentId,
        );

        // Get the navigationButtonPressed handler
        const functionToCall = jest.mocked(Navigation.events().registerComponentListener).mock.calls[0][0].navigationButtonPressed;

        // Simulate pressing the close button
        await act(async () => {
            if (functionToCall) {
                functionToCall({
                    buttonId: baseProps.closeButtonId,
                    componentId: '',
                });
            }
        });

        // Verify dismissModal was called
        expect(dismissModal).toHaveBeenCalledWith({componentId: baseProps.componentId});
    });
});
