// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
