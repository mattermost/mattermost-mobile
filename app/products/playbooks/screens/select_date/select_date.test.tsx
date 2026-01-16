// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment';
import React, {type ComponentProps} from 'react';
import {Keyboard} from 'react-native';

import DateTimeSelector from '@components/data_time_selector';
import NavigationButton from '@components/navigation_button';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {navigateBack} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {act, fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import SelectDate from './select_date';

// Mock dependencies
jest.mock('@components/data_time_selector', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(DateTimeSelector).mockImplementation(
    (props) => React.createElement('DateTimeSelector', {testID: 'date-time-selector', ...props}),
);

jest.mock('@components/navigation_button', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(NavigationButton).mockImplementation((props) => React.createElement('NavigationButton', {...props}));

jest.mock('@hooks/android_back_handler');

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
    goToScreen: jest.fn(),
    showModal: jest.fn(),
    dismissModal: jest.fn(),
    bottomSheet: jest.fn(),
}));

jest.mock('react-native', () => {
    const RN = jest.requireActual('react-native');
    RN.Keyboard = {
        dismiss: jest.fn(),
    };
    return RN;
});

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

describe('SelectDate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        CallbackStore.removeCallback();
    });

    function getBaseProps(): ComponentProps<typeof SelectDate> {
        const mockCurrentUserTimezone: UserTimezone = {
            automaticTimezone: 'UTC',
            manualTimezone: '',
            useAutomaticTimezone: true,
        };
        return {
            selectedDate: undefined,
            currentUserTimezone: mockCurrentUserTimezone,
        };
    }

    it('renders correctly with no selected date', () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-09-11T17:40:18.086Z'));
        const props = getBaseProps();
        const {getByTestId, getByText} = renderWithIntlAndTheme(<SelectDate {...props}/>);

        const dateTimeSelector = getByTestId('date-time-selector');
        expect(dateTimeSelector).toBeTruthy();
        expect(moment('2025-09-11T17:40:18.086Z').isSame(dateTimeSelector.props.initialDate)).toBeTruthy();
        expect(dateTimeSelector).toHaveProp('timezone', 'UTC');
        expect(dateTimeSelector).toHaveProp('minuteInterval', 5);
        expect(dateTimeSelector).toHaveProp('handleChange', expect.any(Function));
        expect(getByText('Clear')).toBeTruthy();
        expect(getByText('None')).toBeTruthy();

        jest.useRealTimers();
    });

    it('renders correctly with selected date', () => {
        const selectedDate = 1699705458086;
        const props = {
            ...getBaseProps(),
            selectedDate,
        };
        const {getByTestId, getByText} = renderWithIntlAndTheme(<SelectDate {...props}/>);

        const dateTimeSelector = getByTestId('date-time-selector');
        expect(dateTimeSelector).toBeTruthy();
        expect(moment(selectedDate).isSame(dateTimeSelector.props.initialDate)).toBeTruthy();
        expect(dateTimeSelector).toHaveProp('timezone', 'UTC');
        expect(dateTimeSelector).toHaveProp('minuteInterval', 5);
        expect(dateTimeSelector).toHaveProp('handleChange', expect.any(Function));
        expect(getByText('Clear')).toBeTruthy();
        expect(getByText('Saturday, November 11 at 12:24 PM')).toBeTruthy();
    });

    it('sets up navigation header with disabled save button initially', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<SelectDate {...props}/>);

        // navigation.setOptions should be called with headerRight
        expect(mockSetOptions).toHaveBeenCalled();

        const setOptionsCall = mockSetOptions.mock.calls[0][0];
        expect(setOptionsCall.headerRight).toBeDefined();

        // Call the headerRight component to get the NavigationButton element
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{disabled: boolean; testID: string}>;

        // Verify it's a NavigationButton with the correct props (disabled because no date change)
        expect(navigationButton.props.testID).toBe('playbooks.select_date.save.button');
        expect(navigationButton.props.disabled).toBe(true);
    });

    it('calls callback and closes when save button is pressed', async () => {
        const mockOnSave = jest.fn();
        CallbackStore.setCallback(mockOnSave);

        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<SelectDate {...props}/>);

        // Change the date to enable the save button
        const dateTimeSelector = getByTestId('date-time-selector');

        await act(async () => {
            dateTimeSelector.props.handleChange(moment(1234567890));
        });

        // Get the headerRight component and call its onPress handler
        const setOptionsCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
        const headerRight = setOptionsCall.headerRight;
        const navigationButton = headerRight() as React.ReactElement<{onPress: () => void}>;
        const onPress = navigationButton.props.onPress;

        // Trigger save button press
        onPress();

        expect(mockOnSave).toHaveBeenCalledWith(expect.any(Number));
        expect(Keyboard.dismiss).toHaveBeenCalled();
        expect(navigateBack).toHaveBeenCalled();
    });

    it('sets up Android back handler', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<SelectDate {...props}/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Function),
        );

        const closeHandler = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];
        closeHandler();

        expect(navigateBack).toHaveBeenCalled();
        expect(Keyboard.dismiss).toHaveBeenCalled();
    });

    describe('canSave logic', () => {
        it('returns false when no date and no selectedDate', async () => {
            const props = getBaseProps();
            const {getByTestId} = renderWithIntlAndTheme(<SelectDate {...props}/>);

            // Simulate no date selected
            const dateTimeSelector = getByTestId('date-time-selector');
            await act(async () => {
                dateTimeSelector.props.handleChange(undefined);
            });

            const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1];
            const setOptionsCall = lastCall[0];
            const headerRight = setOptionsCall.headerRight;
            const navigationButton = headerRight() as React.ReactElement<{disabled: boolean}>;
            expect(navigationButton.props.disabled).toBe(true);
        });

        it('returns true when date changes from undefined to defined', async () => {
            const props = getBaseProps();
            const {getByTestId} = renderWithIntlAndTheme(<SelectDate {...props}/>);

            // Simulate date selection
            const newDate = moment();
            const dateTimeSelector = getByTestId('date-time-selector');
            await act(async () => {
                dateTimeSelector.props.handleChange(newDate);
            });

            const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1];
            const setOptionsCall = lastCall[0];
            const headerRight = setOptionsCall.headerRight;
            const navigationButton = headerRight() as React.ReactElement<{disabled: boolean}>;
            expect(navigationButton.props.disabled).toBe(false);
        });

        it('returns true when date changes from defined to undefined', async () => {
            const selectedDate = Date.now();
            const props = getBaseProps();
            props.selectedDate = selectedDate;
            const {getByTestId} = renderWithIntlAndTheme(<SelectDate {...props}/>);

            // Simulate clearing date
            const dateTimeSelector = getByTestId('date-time-selector');
            await act(async () => {
                dateTimeSelector.props.handleChange(undefined);
            });

            const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1];
            const setOptionsCall = lastCall[0];
            const headerRight = setOptionsCall.headerRight;
            const navigationButton = headerRight() as React.ReactElement<{disabled: boolean}>;
            expect(navigationButton.props.disabled).toBe(false);
        });

        it('returns true when date is different from selectedDate', async () => {
            const selectedDate = Date.now();
            const props = getBaseProps();
            props.selectedDate = selectedDate;
            const {getByTestId} = renderWithIntlAndTheme(<SelectDate {...props}/>);

            // Simulate different date selection
            const newDate = moment(selectedDate).add(1, 'day');
            const dateTimeSelector = getByTestId('date-time-selector');
            await act(async () => {
                dateTimeSelector.props.handleChange(newDate);
            });

            const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1];
            const setOptionsCall = lastCall[0];
            const headerRight = setOptionsCall.headerRight;
            const navigationButton = headerRight() as React.ReactElement<{disabled: boolean}>;
            expect(navigationButton.props.disabled).toBe(false);
        });

        it('returns false when date is same as selectedDate', async () => {
            const selectedDate = Date.now();
            const props = getBaseProps();
            props.selectedDate = selectedDate;
            const {getByTestId} = renderWithIntlAndTheme(<SelectDate {...props}/>);

            // Simulate same date selection
            const sameDate = moment(selectedDate);
            const dateTimeSelector = getByTestId('date-time-selector');
            await act(async () => {
                dateTimeSelector.props.handleChange(sameDate);
            });

            const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1];
            const setOptionsCall = lastCall[0];
            const headerRight = setOptionsCall.headerRight;
            const navigationButton = headerRight() as React.ReactElement<{disabled: boolean}>;
            expect(navigationButton.props.disabled).toBe(true);
        });
    });

    describe('handleClear', () => {
        it('clears the selected date when Clear button is pressed', () => {
            const selectedDate = Date.now();
            const props = getBaseProps();
            props.selectedDate = selectedDate;
            const {getByText} = renderWithIntlAndTheme(<SelectDate {...props}/>);

            const clearButton = getByText('Clear');
            act(() => {
                fireEvent.press(clearButton);
            });

            expect(getByText('None')).toBeTruthy();
        });
    });
});
