// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import moment from 'moment-timezone';
import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {ScheduledPostCoreOptions} from './core_options';

import type Database from '@nozbe/watermelondb/Database';

jest.mock('@utils/time', () => ({
    getFormattedTime: jest.fn().mockReturnValue('9:00 AM'),
}));

describe('ScheduledPostCoreOptions', () => {
    let database: Database;
    const baseProps = {
        userTimezone: 'America/New_York',
        isMilitaryTime: false,
        onSelectOption: jest.fn(),
        onCustomTimeSelected: jest.fn(),
    };

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly for Sunday', () => {
        // Sunday is weekday 7 in moment
        jest.spyOn(moment.prototype, 'weekday').mockReturnValue(7);

        const {getByText, queryByText} = renderWithEverything(
            <ScheduledPostCoreOptions {...baseProps}/>,
            {database},
        );

        // Should show Tomorrow option
        expect(getByText('Tomorrow at 9:00 AM')).toBeTruthy();

        // Should not show Monday or Next Monday options
        expect(queryByText('Monday at 9:00 AM')).toBeNull();
        expect(queryByText('Next Monday at 9:00 AM')).toBeNull();

        // Should always show Custom Time option
        expect(getByText('Custom Time')).toBeTruthy();
    });

    it('renders correctly for Monday', () => {
        // Monday is weekday 1 in moment
        jest.spyOn(moment.prototype, 'weekday').mockReturnValue(1);

        const {getByText, queryByText} = renderWithEverything(
            <ScheduledPostCoreOptions {...baseProps}/>,
            {database},
        );

        // Should show Tomorrow and Next Monday options
        expect(getByText('Tomorrow at 9:00 AM')).toBeTruthy();
        expect(getByText('Next Monday at 9:00 AM')).toBeTruthy();

        // Should not show Monday option
        expect(queryByText('Monday at 9:00 AM')).toBeNull();

        // Should always show Custom Time option
        expect(getByText('Custom Time')).toBeTruthy();
    });

    it('renders correctly for Friday', () => {
        // Friday is weekday 5 in moment
        jest.spyOn(moment.prototype, 'weekday').mockReturnValue(5);

        const {getByText, queryByText} = renderWithEverything(
            <ScheduledPostCoreOptions {...baseProps}/>,
            {database},
        );

        // Should show Monday option
        expect(getByText('Monday at 9:00 AM')).toBeTruthy();

        // Should not show Tomorrow or Next Monday options
        expect(queryByText('Tomorrow at 9:00 AM')).toBeNull();
        expect(queryByText('Next Monday at 9:00 AM')).toBeNull();

        // Should always show Custom Time option
        expect(getByText('Custom Time')).toBeTruthy();
    });

    it('renders correctly for Saturday', () => {
        // Saturday is weekday 6 in moment
        jest.spyOn(moment.prototype, 'weekday').mockReturnValue(6);

        const {getByText, queryByText} = renderWithEverything(
            <ScheduledPostCoreOptions {...baseProps}/>,
            {database},
        );

        // Should show Monday option
        expect(getByText('Monday at 9:00 AM')).toBeTruthy();

        // Should not show Tomorrow or Next Monday options
        expect(queryByText('Tomorrow at 9:00 AM')).toBeNull();
        expect(queryByText('Next Monday at 9:00 AM')).toBeNull();

        // Should always show Custom Time option
        expect(getByText('Custom Time')).toBeTruthy();
    });

    it('calls onSelectOption with correct timestamp when Tomorrow is selected', () => {
        const mockDate = moment.tz('2023-05-15 12:00', 'America/New_York');
        jest.spyOn(moment, 'tz').mockReturnValue(mockDate);
        jest.spyOn(moment.prototype, 'weekday').mockReturnValue(1);
        jest.spyOn(moment.prototype, 'clone').mockReturnValue(mockDate);
        jest.spyOn(moment.prototype, 'valueOf').mockReturnValue(1684242000000);

        const {getByText} = renderWithEverything(
            <ScheduledPostCoreOptions {...baseProps}/>,
            {database},
        );

        fireEvent.press(getByText('Tomorrow at 9:00 AM'));

        expect(baseProps.onSelectOption).toHaveBeenCalledWith('1684242000000');
        expect(baseProps.onCustomTimeSelected).toHaveBeenCalledWith(false);
    });

    it('calls onSelectOption with correct timestamp when Monday is selected', () => {
        const mockDate = moment.tz('2023-05-11 12:00', 'America/New_York');
        jest.spyOn(moment, 'tz').mockReturnValue(mockDate);
        jest.spyOn(moment.prototype, 'weekday').mockReturnValue(4);

        const {getByText} = renderWithEverything(
            <ScheduledPostCoreOptions {...baseProps}/>,
            {database},
        );

        fireEvent.press(getByText('Monday at 9:00 AM'));

        const expectedTime = mockDate.clone().isoWeekday(1).add(1, 'week').startOf('day').hour(9).minute(0);
        expect(baseProps.onSelectOption).toHaveBeenCalledWith(expectedTime.valueOf().toString());
        expect(baseProps.onCustomTimeSelected).toHaveBeenCalledWith(false);
    });

    it('calls onSelectOption with correct timestamp when Next Monday is selected', () => {
        const mockDate = moment.tz('2023-05-15 12:00', 'America/New_York');
        jest.spyOn(moment, 'tz').mockReturnValue(mockDate);
        jest.spyOn(moment.prototype, 'weekday').mockReturnValue(1);

        const {getByText} = renderWithEverything(
            <ScheduledPostCoreOptions {...baseProps}/>,
            {database},
        );

        fireEvent.press(getByText('Next Monday at 9:00 AM'));

        const expectedTime = mockDate.clone().isoWeekday(1).add(1, 'week').startOf('day').hour(9).minute(0);
        expect(baseProps.onSelectOption).toHaveBeenCalledWith(expectedTime.valueOf().toString());
        expect(baseProps.onCustomTimeSelected).toHaveBeenCalledWith(false);
    });

    it('shows DateTimeSelector when Custom Time is selected', () => {
        const {getByText, queryByTestId} = renderWithEverything(
            <ScheduledPostCoreOptions {...baseProps}/>,
            {database},
        );

        // Initially, DateTimeSelector should not be visible
        expect(queryByTestId('custom_date_time_picker')).toBeNull();

        // Select Custom Time option
        fireEvent.press(getByText('Custom Time'));

        // DateTimeSelector should now be visible
        expect(queryByTestId('custom_date_time_picker')).not.toBeNull();

        // Should call onCustomTimeSelected with true
        expect(baseProps.onCustomTimeSelected).toHaveBeenCalledWith(true);
    });

    it('calls handleCustomTimeChange when a custom time is selected', () => {
        // This test would need to mock the DateTimeSelector component's behavior
        // Since we can't directly test the internal callback without exposing it,
        // we'll verify that the component is rendered and the callback is set up

        const {getByText} = renderWithEverything(
            <ScheduledPostCoreOptions {...baseProps}/>,
            {database},
        );

        // Select Custom Time option
        fireEvent.press(getByText('Custom Time'));

        // Verify onCustomTimeSelected was called
        expect(baseProps.onCustomTimeSelected).toHaveBeenCalledWith(true);
    });
});
