// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import moment from 'moment-timezone';
import React from 'react';

import {AppFieldTypes} from '@constants/apps';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';

import AppsFormField from './apps_form_field';

import type {Database} from '@nozbe/watermelondb';

const serverUrl = 'http://localhost:8065';

function getProps(field: Partial<AppField> = {}) {
    return {
        field: {name: 'dt', type: AppFieldTypes.DATETIME, ...field} as AppField,
        name: 'dt',
        value: '',
        onChange: jest.fn(),
        performLookup: jest.fn(),
        userTimezone: 'UTC',
        isMilitaryTime: false,
    };
}

describe('AppsFormField timezone indicator', () => {
    let database: Database;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('renders the timezone abbreviation when the field sets a location_timezone', () => {
        const locationTimezone = 'Asia/Tokyo';

        // Derive the expected abbreviation the same way the component does, so the
        // assertion stays correct regardless of moment-timezone's abbreviation data.
        const expectedAbbr = moment.tz(locationTimezone).format('z');

        const {getByText} = renderWithEverything(
            <AppsFormField {...getProps({datetime_config: {location_timezone: locationTimezone}})}/>,
            {database, serverUrl},
        );

        expect(getByText(`Times in ${expectedAbbr}`)).toBeTruthy();
    });

    it('does not render the timezone indicator when no location_timezone is set', () => {
        const {queryByText} = renderWithEverything(
            <AppsFormField {...getProps()}/>,
            {database, serverUrl},
        );

        expect(queryByText(/^Times in/)).toBeNull();
    });
});

// Servers 11.9 to 11.11 accept either `manual_time_entry` or the deprecated
// `allow_manual_time_entry`; 12.0 removed the deprecated one (MM-68396). Reading only one name
// leaves the other half of the fleet showing the time picker instead of the text field.
describe('AppsFormField manual time entry', () => {
    let database: Database;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    // The time button is what reveals the manual input, so tapping it is the only observation point.
    const renderAndOpenTimeEntry = (datetimeConfig?: DateTimeConfig) => {
        const rendered = renderWithEverything(
            <AppsFormField {...getProps(datetimeConfig ? {datetime_config: datetimeConfig} : {})}/>,
            {database, serverUrl},
        );

        fireEvent.press(rendered.getByTestId('AppFormElement.dt.time.button'));

        return rendered;
    };

    it('should enable manual time entry from manual_time_entry', () => {
        const {queryByTestId} = renderAndOpenTimeEntry({manual_time_entry: true});

        expect(queryByTestId('AppFormElement.dt.manual_time.input')).toBeTruthy();
    });

    it('should enable manual time entry from the deprecated allow_manual_time_entry', () => {
        const {queryByTestId} = renderAndOpenTimeEntry({allow_manual_time_entry: true});

        expect(queryByTestId('AppFormElement.dt.manual_time.input')).toBeTruthy();
    });

    it('should let manual_time_entry false win over the deprecated key', () => {
        const {queryByTestId} = renderAndOpenTimeEntry({manual_time_entry: false, allow_manual_time_entry: true});

        expect(queryByTestId('AppFormElement.dt.manual_time.input')).toBeNull();
    });

    it('should not render the manual input when neither key is set', () => {
        const {queryByTestId} = renderAndOpenTimeEntry();

        expect(queryByTestId('AppFormElement.dt.manual_time.input')).toBeNull();
    });
});
