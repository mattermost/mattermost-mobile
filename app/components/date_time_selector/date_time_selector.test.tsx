// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import moment from 'moment-timezone';
import React from 'react';

import Preferences from '@constants/preferences';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import DateTimeSelector from './date_time_selector';

import type Database from '@nozbe/watermelondb/Database';

describe('DateTimeSelector', () => {
    let database: Database;
    const serverUrl = 'https://test.server.com';
    const mockHandleChange = jest.fn();
    const timezone = 'America/New_York';
    const theme = Preferences.THEMES.denim;

    const baseProps = {
        timezone,
        theme,
        handleChange: mockHandleChange,
        showInitially: 'date' as const,
        isMilitaryTime: false,
    };

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
    });

    afterAll(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the date picker container', () => {
        const {getByTestId} = renderWithEverything(
            <DateTimeSelector
                {...baseProps}
            />,
            {database},
        );

        expect(getByTestId('custom_date_time_picker')).toBeTruthy();
    });

    it('does not call handleChange when pressing Select Date to open picker', () => {
        const initialDate = moment().add(2, 'days').hour(14).minute(30);
        const {getByText} = renderWithEverything(
            <DateTimeSelector
                {...baseProps}
                initialDate={initialDate}
            />,
            {database},
        );

        const selectDateButton = getByText('Select Date');
        fireEvent.press(selectDateButton);

        expect(mockHandleChange).not.toHaveBeenCalled();
    });

    it('hides the Select Time button when dateOnly is true', () => {
        const {queryByText, getByText} = renderWithEverything(
            <DateTimeSelector
                {...baseProps}
                dateOnly={true}
            />,
            {database},
        );

        expect(getByText('Select Date')).toBeTruthy();
        expect(queryByText('Select Time')).toBeNull();
    });

    it('toggles the manual time input when allowManualTimeEntry is enabled', () => {
        const testID = 'dt';
        const {getByTestId, queryByTestId} = renderWithEverything(
            <DateTimeSelector
                {...baseProps}
                allowManualTimeEntry={true}
                testID={testID}
            />,
            {database},
        );

        // Not visible by default
        expect(queryByTestId(`${testID}.manual_time.input`)).toBeNull();

        // Pressing time button reveals the manual input
        fireEvent.press(getByTestId(`${testID}.time.button`));
        expect(getByTestId(`${testID}.manual_time.input`)).toBeTruthy();

        // Pressing again hides it
        fireEvent.press(getByTestId(`${testID}.time.button`));
        expect(queryByTestId(`${testID}.manual_time.input`)).toBeNull();
    });

    it('submits a manual time entry by calling handleChange with the parsed time', () => {
        const initialDate = moment.tz('2026-04-20 09:00', timezone);
        const testID = 'dt';
        const {getByTestId} = renderWithEverything(
            <DateTimeSelector
                {...baseProps}
                allowManualTimeEntry={true}
                initialDate={initialDate}
                testID={testID}
            />,
            {database},
        );

        // Open the manual entry input
        fireEvent.press(getByTestId(`${testID}.time.button`));
        const input = getByTestId(`${testID}.manual_time.input`);

        fireEvent.changeText(input, '14:30');
        fireEvent(input, 'submitEditing');

        expect(mockHandleChange).toHaveBeenCalledTimes(1);
        const picked = mockHandleChange.mock.calls[0][0] as moment.Moment;
        expect(picked.hour()).toBe(14);
        expect(picked.minute()).toBe(30);
        expect(picked.second()).toBe(0);

        // Date portion preserved from initialDate
        expect(picked.year()).toBe(initialDate.year());
        expect(picked.month()).toBe(initialDate.month());
        expect(picked.date()).toBe(initialDate.date());
    });

    it('does not call handleChange when manual time entry is invalid', () => {
        const testID = 'dt';
        const {getByTestId} = renderWithEverything(
            <DateTimeSelector
                {...baseProps}
                allowManualTimeEntry={true}
                testID={testID}
            />,
            {database},
        );

        fireEvent.press(getByTestId(`${testID}.time.button`));
        const input = getByTestId(`${testID}.manual_time.input`);

        fireEvent.changeText(input, 'not a time');
        fireEvent(input, 'submitEditing');

        expect(mockHandleChange).not.toHaveBeenCalled();
    });

    it('shows a 24-hour manual time hint when isMilitaryTime is true', () => {
        const testID = 'dt';
        const {getByTestId} = renderWithEverything(
            <DateTimeSelector
                {...baseProps}
                isMilitaryTime={true}
                allowManualTimeEntry={true}
                testID={testID}
            />,
            {database},
        );

        fireEvent.press(getByTestId(`${testID}.time.button`));

        expect(getByTestId(`${testID}.manual_time.input`).props.placeholder).toBe('14:30');
    });

    it('shows a 12-hour manual time hint when isMilitaryTime is false', () => {
        const testID = 'dt';
        const {getByTestId} = renderWithEverything(
            <DateTimeSelector
                {...baseProps}
                isMilitaryTime={false}
                allowManualTimeEntry={true}
                testID={testID}
            />,
            {database},
        );

        fireEvent.press(getByTestId(`${testID}.time.button`));

        expect(getByTestId(`${testID}.manual_time.input`).props.placeholder).toBe('2:30 PM');
    });
});
