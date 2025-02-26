// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import moment from 'moment-timezone';
import React from 'react';
import {Navigation} from 'react-native-navigation';

import {updateScheduledPost} from '@actions/remote/scheduled_post';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {dismissModal, setButtons} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import RescheduledDraft from './reschedule_draft';

import type {Database} from '@nozbe/watermelondb';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

jest.mock('@actions/remote/scheduled_post', () => ({
    updateScheduledPost: jest.fn().mockResolvedValue({scheduledPost: {} as ScheduledPost, error: undefined}),
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
        componentId: Screens.RESCHEDULE_DRAFT,
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

    it('should have navigation component registered on initialization', () => {
        renderWithEverything(<RescheduledDraft {...baseProps}/>, {database});

        // Verify navigation listener was registered
        expect(Navigation.events().registerComponentListener).toHaveBeenCalledWith(
            expect.any(Object),
            baseProps.componentId,
        );

        // Check that the component registered with proper navigation handler
        const registerCall = jest.mocked(Navigation.events().registerComponentListener).mock.calls[0][0];
        expect(registerCall).toBeDefined();
        expect(registerCall.navigationButtonPressed).toBeDefined();
    });

    it('Should enable save button when data changes', async () => {
        jest.mocked(updateScheduledPost).mockResolvedValue({scheduledPost: {} as ScheduledPost, error: undefined});

        const {getByTestId} = renderWithEverything(
            <RescheduledDraft {...baseProps}/>,
            {database},
        );

        const dateTimeSelector = getByTestId('custom_date_time_picker'); // Ensure testID is set in the component
        expect(dateTimeSelector).toBeTruthy();

        const newDate = moment().add(2, 'days');
        await act(async () => {
            fireEvent(dateTimeSelector, 'handleChange', newDate);
        });

        expect(setButtons).toHaveBeenCalled();

        // Use jest.mocked for proper type inference
        const setButtonsMock = jest.mocked(setButtons);
        const mockCalls = setButtonsMock.mock.calls;

        const lastCallIndex = mockCalls.length - 1;
        const setButtonsCall = mockCalls[lastCallIndex]?.[1]; // Ensure lastCallIndex exists

        expect(setButtonsCall).toBeDefined();
        expect(setButtonsCall?.rightButtons).toBeDefined();
        expect(setButtonsCall?.rightButtons?.length).toBeGreaterThan(0);

        const saveButton = setButtonsCall?.rightButtons?.[0];
        expect(saveButton?.enabled).toBeTruthy();
    });

    it('should call Navigation event when save button is pressed', async () => {
        const {getByTestId} = renderWithEverything(
            <RescheduledDraft {...baseProps}/>,
            {database},
        );

        const dateTimeSelector = getByTestId('custom_date_time_picker'); // Ensure testID is set in the component
        expect(dateTimeSelector).toBeTruthy();

        const newDate = moment().add(2, 'days');
        await act(async () => {
            fireEvent(dateTimeSelector, 'handleChange', newDate);
        });

        // Verify navigation listener was registered
        expect(Navigation.events().registerComponentListener).toHaveBeenCalledWith(
            expect.any(Object),
            baseProps.componentId,
        );

        // Get the navigationButtonPressed handler
        const functionToCall = jest.mocked(Navigation.events().registerComponentListener).mock.calls[1][0].navigationButtonPressed;

        // Simulate pressing the save button
        await act(async () => {
            functionToCall?.({
                buttonId: 'reschedule-draft',
                componentId: '',
            });
        });

        expect(dismissModal).toHaveBeenCalledWith({componentId: baseProps.componentId});
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
            functionToCall?.({
                buttonId: baseProps.closeButtonId,
                componentId: '',
            });
        });

        // Verify dismissModal was called
        expect(dismissModal).toHaveBeenCalledWith({componentId: baseProps.componentId});
    });
});
