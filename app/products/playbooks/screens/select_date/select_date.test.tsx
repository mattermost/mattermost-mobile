// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment';
import React, {type ComponentProps} from 'react';
import {Keyboard} from 'react-native';

import DateTimeSelector from '@components/data_time_selector';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {popTopScreen, setButtons} from '@screens/navigation';
import {act, fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import SelectDate from './select_date';

import type {AvailableScreens} from '@typings/screens/navigation';

// Mock dependencies
jest.mock('@components/data_time_selector');
jest.mocked(DateTimeSelector).mockImplementation(
    (props) => React.createElement('DateTimeSelector', {testID: 'date-time-selector', ...props}),
);

jest.mock('@hooks/navigation_button_pressed');
jest.mock('@hooks/android_back_handler');

describe('SelectDate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    function getBaseProps(): ComponentProps<typeof SelectDate> {
        const mockOnSave = jest.fn();

        const mockComponentId: AvailableScreens = 'SelectDate';
        const mockCurrentUserTimezone: UserTimezone = {
            automaticTimezone: 'UTC',
            manualTimezone: '',
            useAutomaticTimezone: true,
        };
        return {
            componentId: mockComponentId,
            selectedDate: undefined,
            currentUserTimezone: mockCurrentUserTimezone,
            onSave: mockOnSave,
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

    it('sets up navigation buttons correctly', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<SelectDate {...props}/>);

        expect(setButtons).toHaveBeenCalledWith(props.componentId, {
            rightButtons: [expect.objectContaining({
                id: 'save-due-date',
                text: 'Save',
                enabled: false,
                showAsAction: 'always',
                color: '#ffffff',
            })],
        });
    });

    it('sets up navigation button pressed handler', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<SelectDate {...props}/>);

        jest.clearAllMocks();

        // Change the date to enable the save button
        const dateTimeSelector = getByTestId('date-time-selector');

        await act(async () => {
            dateTimeSelector.props.handleChange(moment(1234567890));
        });

        expect(useNavButtonPressed).toHaveBeenCalledWith(
            'save-due-date',
            props.componentId,
            expect.any(Function),
            [expect.any(Function)],
        );

        const saveHandler = jest.mocked(useNavButtonPressed).mock.calls[0][2];
        saveHandler();

        expect(props.onSave).toHaveBeenCalledWith(expect.any(Number));
        expect(popTopScreen).toHaveBeenCalledWith(props.componentId);
    });

    it('sets up Android back handler', () => {
        const props = getBaseProps();
        renderWithIntlAndTheme(<SelectDate {...props}/>);

        expect(useAndroidHardwareBackHandler).toHaveBeenCalledWith(
            props.componentId,
            expect.any(Function),
        );

        const closeHandler = jest.mocked(useAndroidHardwareBackHandler).mock.calls[0][1];
        closeHandler();

        expect(popTopScreen).toHaveBeenCalledWith(props.componentId);
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

            expect(setButtons).toHaveBeenCalledWith(props.componentId, {
                rightButtons: [expect.objectContaining({
                    enabled: false,
                })],
            });
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

            expect(setButtons).toHaveBeenCalledWith(props.componentId, {
                rightButtons: [expect.objectContaining({
                    enabled: true,
                })],
            });
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

            expect(setButtons).toHaveBeenCalledWith(props.componentId, {
                rightButtons: [expect.objectContaining({
                    enabled: true,
                })],
            });
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

            expect(setButtons).toHaveBeenCalledWith(props.componentId, {
                rightButtons: [expect.objectContaining({
                    enabled: true,
                })],
            });
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

            expect(setButtons).toHaveBeenCalledWith(props.componentId, {
                rightButtons: [expect.objectContaining({
                    enabled: false,
                })],
            });
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
