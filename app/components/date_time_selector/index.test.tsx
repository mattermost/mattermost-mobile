// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import moment from 'moment-timezone';
import React from 'react';

import Preferences from '@constants/preferences';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import DateTimeSelector from './index';

import type Database from '@nozbe/watermelondb/Database';

describe('DateTimeSelector', () => {
    let database: Database;
    const mockHandleChange = jest.fn();
    const timezone = 'America/New_York';
    const theme = Preferences.THEMES.denim;

    const baseProps = {
        timezone,
        theme,
        handleChange: mockHandleChange,
        showInitially: 'date' as const,
    };

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders with initialDate and uses it when date is selected', () => {
        const initialDate = moment().add(2, 'days').hour(14).minute(30);
        const {getByTestId, getByText} = renderWithEverything(
            <DateTimeSelector
                {...baseProps}
                initialDate={initialDate}
            />,
            {database},
        );

        const picker = getByTestId('custom_date_time_picker');
        expect(picker).toBeTruthy();

        const selectDateButton = getByText('Select Date');
        fireEvent.press(selectDateButton);

        expect(mockHandleChange).toHaveBeenCalledWith(expect.objectContaining({
            _d: initialDate.toDate(),
        }));
    });
});
