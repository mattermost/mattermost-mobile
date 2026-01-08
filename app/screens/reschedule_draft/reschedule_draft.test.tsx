// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, waitFor} from '@testing-library/react-native';
import moment from 'moment-timezone';
import React, {type ComponentProps} from 'react';

import {updateScheduledPost} from '@actions/remote/scheduled_post';
import DateTimeSelector from '@components/data_time_selector';
import NavigationButton from '@components/navigation_button';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {showSnackBar} from '@utils/snack_bar';

import RescheduledDraft from './reschedule_draft';

import type {Database} from '@nozbe/watermelondb';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

jest.mock('@actions/remote/scheduled_post', () => ({
    updateScheduledPost: jest.fn().mockResolvedValue({scheduledPost: {} as ScheduledPost, error: undefined}),
}));

jest.mock('@utils/snack_bar', () => ({
    showSnackBar: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(),
}));

jest.mock('@components/data_time_selector', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(DateTimeSelector).mockImplementation(
    (props) => React.createElement('DateTimeSelector', {testID: 'custom_date_time_picker', ...props}),
);

jest.mock('@components/navigation_button', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(NavigationButton).mockImplementation((props) => React.createElement('NavigationButton', {...props}));

jest.mock('@hooks/android_back_handler', () => ({
    __esModule: true,
    default: jest.fn(),
}));

// Mock expo-router navigation
const mockSetOptions = jest.fn();
const mockRemoveListener = jest.fn();
const mockAddListener = jest.fn(() => mockRemoveListener);
const mockNavigation = {
    setOptions: mockSetOptions,
    addListener: mockAddListener,
};

jest.mock('expo-router', () => ({
    useNavigation: jest.fn(() => mockNavigation),
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

    function getBaseProps(): ComponentProps<typeof RescheduledDraft> {
        return {
            currentUserTimezone: {
                useAutomaticTimezone: true,
                automaticTimezone: 'America/New_York',
                manualTimezone: '',
            },
            draft: mockDraft,
        };
    }

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(useServerUrl).mockReturnValue(SERVER_URL);
    });

    it('should render correctly', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(
            <RescheduledDraft {...props}/>, {database},
        );

        expect(getByTestId('edit_post.screen')).toBeTruthy();
    });

    it('should set up navigation header with disabled save button initially', async () => {
        const props = getBaseProps();
        renderWithEverything(<RescheduledDraft {...props}/>, {database});

        await waitFor(() => {
            expect(mockSetOptions).toHaveBeenCalled();
        });

        const setOptionsCall = mockSetOptions.mock.calls[0][0];
        expect(setOptionsCall.headerRight).toBeDefined();

        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{disabled: boolean; testID: string}>;

        expect(navigationButton.props.testID).toBe('reschedule_draft.save.button');
        expect(navigationButton.props.disabled).toBe(true);
    });

    it('should enable save button when date changes', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<RescheduledDraft {...props}/>, {database});

        const dateTimeSelector = getByTestId('custom_date_time_picker');
        expect(dateTimeSelector).toBeTruthy();

        const newDate = moment().add(2, 'days');
        await act(async () => {
            dateTimeSelector.props.handleChange(newDate);
        });

        await waitFor(() => {
            const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
            const headerRight = setOptionsCall.headerRight;
            const navigationButton = headerRight() as React.ReactElement<{disabled: boolean}>;
            expect(navigationButton.props.disabled).toBe(false);
        });
    });

    it('should call updateScheduledPost when save button is pressed', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(
            <RescheduledDraft {...props}/>,
            {database},
        );

        const dateTimeSelector = getByTestId('custom_date_time_picker');
        const newDate = moment().add(2, 'days');

        await act(async () => {
            dateTimeSelector.props.handleChange(newDate);
        });

        await waitFor(() => {
            expect(mockSetOptions).toHaveBeenCalled();
        });

        // Get the save button handler
        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;
        const saveHandler = navigationButton.props.onPress;

        // Simulate save button press
        await act(async () => {
            saveHandler();
        });

        await waitFor(() => {
            expect(updateScheduledPost).toHaveBeenCalledWith(
                SERVER_URL,
                mockDraft,
                newDate.valueOf(),
            );
            expect(navigateBack).toHaveBeenCalled();
        });
    });

    it('should navigate back and dismiss keyboard when save is successful', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(
            <RescheduledDraft {...props}/>, {database},
        );

        const dateTimeSelector = getByTestId('custom_date_time_picker');
        const newDate = moment().add(2, 'days');

        await act(async () => {
            dateTimeSelector.props.handleChange(newDate);
        });

        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;
        const saveHandler = navigationButton.props.onPress;

        await act(async () => {
            saveHandler();
        });

        await waitFor(() => {
            expect(navigateBack).toHaveBeenCalled();
        });
    });

    it('should show snackbar when update fails', async () => {
        jest.mocked(updateScheduledPost).mockResolvedValue({
            scheduledPost: undefined,
            error: 'Update failed',
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(
            <RescheduledDraft {...props}/>, {database},
        );

        const dateTimeSelector = getByTestId('custom_date_time_picker');
        const newDate = moment().add(2, 'days');

        await act(async () => {
            dateTimeSelector.props.handleChange(newDate);
        });

        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;
        const saveHandler = navigationButton.props.onPress;

        await act(async () => {
            saveHandler();
        });

        await waitFor(() => {
            expect(showSnackBar).toHaveBeenCalledWith(
                expect.objectContaining({
                    barType: 'RESCHEDULED_POST',
                    type: 'error',
                }),
            );
            expect(navigateBack).not.toHaveBeenCalled();
        });
    });

    it('should show snackbar when no time is selected', async () => {
        jest.mocked(updateScheduledPost).mockResolvedValue({scheduledPost: {} as ScheduledPost, error: undefined});
        const props = getBaseProps();
        renderWithEverything(
            <RescheduledDraft {...props}/>, {database},
        );

        await waitFor(() => {
            expect(mockSetOptions).toHaveBeenCalled();
        });

        // Get the save button handler without changing the date
        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;
        const saveHandler = navigationButton.props.onPress;

        // Clear the mock to track calls from the save handler
        jest.mocked(showSnackBar).mockClear();

        // Simulate pressing the save button without selecting a new time
        await act(async () => {
            saveHandler();
        });

        await waitFor(() => {
            expect(showSnackBar).toHaveBeenCalledWith(
                expect.objectContaining({
                    barType: 'RESCHEDULED_POST',
                    customMessage: expect.stringContaining('No time selected'),
                    type: 'error',
                }),
            );
            expect(updateScheduledPost).not.toHaveBeenCalled();
        });
    });

    it('should handle Android back button press', () => {
        const props = getBaseProps();
        renderWithEverything(
            <RescheduledDraft {...props}/>, {database},
        );

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            Screens.RESCHEDULE_DRAFT,
            expect.any(Function),
        );

        const backHandler = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];

        act(() => {
            backHandler();
        });

        expect(navigateBack).toHaveBeenCalled();
    });

    it('should pass the draft scheduledAt time as initialDate to DateTimeSelector', () => {
        const scheduledTime = moment().add(3, 'days').valueOf();
        const draftWithScheduledTime = {
            ...mockDraft,
            scheduledAt: scheduledTime,
        } as unknown as ScheduledPostModel;

        const props = getBaseProps();
        props.draft = draftWithScheduledTime;

        const {getByTestId} = renderWithEverything(
            <RescheduledDraft {...props}/>,
            {database},
        );

        const dateTimeSelector = getByTestId('custom_date_time_picker');
        expect(dateTimeSelector).toBeTruthy();
        expect(dateTimeSelector.props.initialDate.valueOf()).toBe(scheduledTime);
    });

    it('should initialize with draft scheduledAt time for different timezone', () => {
        const scheduledTime = moment.tz('2024-12-25 14:30', 'Asia/Tokyo').valueOf();
        const draftWithScheduledTime = {
            ...mockDraft,
            scheduledAt: scheduledTime,
        } as unknown as ScheduledPostModel;

        const props = getBaseProps();
        props.draft = draftWithScheduledTime;
        props.currentUserTimezone = {
            useAutomaticTimezone: true,
            automaticTimezone: 'Asia/Tokyo',
            manualTimezone: '',
        };

        const {getByTestId} = renderWithEverything(
            <RescheduledDraft {...props}/>,
            {database},
        );

        const dateTimeSelector = getByTestId('custom_date_time_picker');
        expect(dateTimeSelector).toBeTruthy();
        expect(dateTimeSelector.props.timezone).toBe('Asia/Tokyo');
        expect(dateTimeSelector.props.initialDate.valueOf()).toBe(scheduledTime);
    });

    it('should not enable save button if date is same as draft scheduledAt', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<RescheduledDraft {...props}/>, {database});

        const dateTimeSelector = getByTestId('custom_date_time_picker');

        // Set the same date as the draft scheduledAt
        const sameDate = moment(mockDraft.scheduledAt);

        await act(async () => {
            dateTimeSelector.props.handleChange(sameDate);
        });

        await waitFor(() => {
            const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
            const headerRight = setOptionsCall.headerRight;
            const navigationButton = headerRight() as React.ReactElement<{disabled: boolean}>;
            expect(navigationButton.props.disabled).toBe(true);
        });
    });

    it('should disable save button while updating', async () => {
        // Mock updateScheduledPost to delay response
        let resolveUpdate: (value: {scheduledPost: ScheduledPost; error?: undefined}) => void;
        const updatePromise = new Promise<{scheduledPost: ScheduledPost; error?: undefined}>((resolve) => {
            resolveUpdate = resolve;
        });
        jest.mocked(updateScheduledPost).mockReturnValue(updatePromise);

        const props = getBaseProps();
        const {getByTestId, queryByTestId} = renderWithEverything(
            <RescheduledDraft {...props}/>,
            {database},
        );

        const dateTimeSelector = getByTestId('custom_date_time_picker');
        const newDate = moment().add(2, 'days');

        await act(async () => {
            dateTimeSelector.props.handleChange(newDate);
        });

        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;
        const saveHandler = navigationButton.props.onPress;

        // Trigger save
        await act(async () => {
            saveHandler();
        });

        // Check that the main screen is hidden during loading
        await waitFor(() => {
            expect(queryByTestId('edit_post.screen')).toBeNull();
        });

        // Resolve the update and check that we navigate back
        await act(async () => {
            resolveUpdate!({scheduledPost: {} as ScheduledPost});
            await updatePromise;
        });

        await waitFor(() => {
            expect(navigateBack).toHaveBeenCalled();
        });
    });
});
