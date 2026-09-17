// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import moment from 'moment-timezone';
import React from 'react';

import * as integrationActions from '@actions/remote/integrations';
import {AppFieldTypes} from '@constants/apps';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';

import AppsFormField from './apps_form_field';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@actions/remote/integrations');

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

describe('AppsFormField action_button', () => {
    let database: Database;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('renders a button with the field label', () => {
        const {getByText} = renderWithEverything(
            <AppsFormField
                {...getProps({
                    type: AppFieldTypes.ACTION_BUTTON,
                    label: 'Do the thing',
                    action_button_url: '/plugins/myplugin/actions/do-thing',
                    action_button_context: {action: 'do-thing'},
                })}
            />,
            {database, serverUrl},
        );

        expect(getByText('Do the thing')).toBeTruthy();
    });

    it('calls executeDialogAction with the action url and context on press', async () => {
        jest.mocked(integrationActions.executeDialogAction).mockResolvedValue({data: {trigger_id: 'trigger1'}});

        const actionButtonUrl = '/plugins/myplugin/actions/do-thing';
        const actionButtonContext = {action: 'do-thing'};

        const {getByText} = renderWithEverything(
            <AppsFormField
                {...getProps({
                    type: AppFieldTypes.ACTION_BUTTON,
                    label: 'Do the thing',
                    action_button_url: actionButtonUrl,
                    action_button_context: actionButtonContext,
                })}
            />,
            {database, serverUrl},
        );

        fireEvent.press(getByText('Do the thing'));

        await act(async () => {
            await new Promise((resolve) => process.nextTick(resolve));
        });

        expect(integrationActions.executeDialogAction).toHaveBeenCalledWith(
            serverUrl,
            actionButtonUrl,
            actionButtonContext,
        );
    });
});
