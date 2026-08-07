// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, waitFor} from '@testing-library/react-native';
import moment from 'moment-timezone';
import React, {type ComponentProps} from 'react';
import {Text} from 'react-native';

import DateTimeSelector from '@components/date_time_selector';
import {Preferences} from '@constants';
import {DEFAULT_TIME_INTERVAL_MINUTES} from '@constants/apps';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {MmBlocksInteractionsDisabledContext} from '../context';
import {MmBlocksForm, useMmBlocksForm, type MmBlocksFormValues} from '../form';

import DateTimeInputElement from './index';

import type Database from '@nozbe/watermelondb/Database';

jest.mock('@components/date_time_selector', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(DateTimeSelector).mockImplementation(
    (props: ComponentProps<typeof DateTimeSelector>) => React.createElement('DateTimeSelector', {...props}),
);

const TIMEZONE = 'America/New_York';

type RenderResult = ReturnType<typeof renderWithEverything>;

function FormValuesProbe() {
    const {values} = useMmBlocksForm();
    return <Text testID='form.values'>{JSON.stringify(values)}</Text>;
}

function formValues(view: RenderResult): MmBlocksFormValues {
    return JSON.parse(view.getByTestId('form.values').props.children);
}

function selectorProps(): ComponentProps<typeof DateTimeSelector> {
    const {calls} = jest.mocked(DateTimeSelector).mock;
    return calls[calls.length - 1][0];
}

describe('DateTimeInputElement', () => {
    const serverUrl = 'https://server.com';
    const onAction = jest.fn();
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
        await server.operator.handleUsers({
            users: [{
                ...TestHelper.basicUser!,
                update_at: Date.now(),
                timezone: {useAutomaticTimezone: false, automaticTimezone: '', manualTimezone: TIMEZONE},
            }],
            prepareRecordsOnly: false,
        });
    });

    afterAll(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    function getBaseProps(): ComponentProps<typeof DateTimeInputElement> {
        return {
            element: {
                type: 'datetime_input',
                name: 'starts_at',
                label: 'Starts at',
                initial_value: '2026-03-05T15:30:00Z',
            },
            onAction,
            theme: Preferences.THEMES.denim,
        };
    }

    function renderRaw(props: ComponentProps<typeof DateTimeInputElement>, interactionsDisabled = false) {
        return renderWithEverything(
            <MmBlocksInteractionsDisabledContext.Provider value={interactionsDisabled}>
                <MmBlocksForm
                    errors={{}}
                    onErrorsChange={jest.fn()}
                >
                    <DateTimeInputElement {...props}/>
                    <FormValuesProbe/>
                </MmBlocksForm>
            </MmBlocksInteractionsDisabledContext.Provider>,
            {database, serverUrl},
        );
    }

    async function renderInput(props: ComponentProps<typeof DateTimeInputElement>, interactionsDisabled = false) {
        const view = renderRaw(props, interactionsDisabled);

        // The element is enhanced with observables, so it stays unmounted until the user timezone resolves.
        await waitFor(() => expect(formValues(view)).not.toEqual({}));

        return view;
    }

    async function pickDateTime(date: string) {
        await act(async () => {
            selectorProps().handleChange(moment.tz(date, TIMEZONE));
        });
    }

    it('should not render an input or seed a form value when name is missing', async () => {
        const view = renderRaw({
            ...getBaseProps(),
            element: {type: 'datetime_input', name: '', label: 'Starts at'},
        });

        await act(async () => {
            await TestHelper.wait(0);
        });

        expect(formValues(view)).toEqual({});
        expect(view.queryByText('Starts at')).toBeNull();
        expect(jest.mocked(DateTimeSelector)).not.toHaveBeenCalled();
    });

    it('should seed the form with initial_value and pass it to the picker', async () => {
        const view = await renderInput({
            ...getBaseProps(),
            element: {...getBaseProps().element, help_text: 'Pick a start time'},
        });

        expect(formValues(view)).toEqual({starts_at: '2026-03-05T15:30:00Z'});
        expect(view.getByText('Pick a start time')).toBeVisible();

        const props = selectorProps();
        expect(props.timezone).toBe(TIMEZONE);
        expect(props.dateOnly).toBe(false);
        expect(props.minuteInterval).toBe(DEFAULT_TIME_INTERVAL_MINUTES);
        expect(props.initialDate?.toISOString()).toBe('2026-03-05T15:30:00.000Z');
    });

    it('should seed relative datetime defaults as ISO timestamps', async () => {
        const view = await renderInput({
            ...getBaseProps(),
            element: {...getBaseProps().element, initial_value: '+1d'},
        });

        const seeded = String(formValues(view).starts_at);
        expect(seeded).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should display the selected value as a date and a time in the user timezone', async () => {
        const view = await renderInput(getBaseProps());

        expect(view.getByText('Mar 5, 2026')).toBeVisible();
        expect(view.getByText('10:30 AM')).toBeVisible();
    });

    it('should store the picked value as an ISO timestamp', async () => {
        const view = await renderInput(getBaseProps());

        await pickDateTime('2026-03-06 08:15');

        expect(formValues(view)).toEqual({starts_at: '2026-03-06T13:15:00.000Z'});
        expect(onAction).not.toHaveBeenCalled();
    });

    it('should trigger onAction with form values when onChange is set', async () => {
        await renderInput({
            ...getBaseProps(),
            element: {...getBaseProps().element, onChange: 'refresh_action'},
        });

        await pickDateTime('2026-03-06 08:15');

        expect(onAction).toHaveBeenCalledWith({actionId: 'refresh_action', formValues: {starts_at: '2026-03-06T13:15:00.000Z'}});
    });

    it('should not update the value or dispatch onChange when interactions are disabled', async () => {
        const view = await renderInput({
            ...getBaseProps(),
            element: {...getBaseProps().element, onChange: 'refresh_action'},
        }, true);

        expect(selectorProps().disabled).toBe(true);

        await pickDateTime('2026-03-06 08:15');

        expect(formValues(view)).toEqual({starts_at: '2026-03-05T15:30:00Z'});
        expect(onAction).not.toHaveBeenCalled();
    });

    it('should pass disabled to the picker when the element is disabled', async () => {
        await renderInput({
            ...getBaseProps(),
            element: {...getBaseProps().element, disabled: true},
        });

        expect(selectorProps().disabled).toBe(true);
    });

    it('should forward the datetime config to the picker', async () => {
        await renderInput({
            ...getBaseProps(),
            element: {
                ...getBaseProps().element,
                datetime_config: {min_date: 'today', max_date: '+7d', time_interval: 15, manual_time_entry: true},
            },
        });

        const today = moment.tz(TIMEZONE);
        const props = selectorProps();
        expect(props.minDate).toBe(today.format('YYYY-MM-DD'));
        expect(props.maxDate).toBe(today.clone().add(7, 'days').format('YYYY-MM-DD'));
        expect(props.allowPastDates).toBe(false);
        expect(props.minuteInterval).toBe(15);
        expect(props.allowManualTimeEntry).toBe(true);
    });

    it('should use location_timezone for the picker and show the timezone indicator', async () => {
        const {getByText} = await renderInput({
            ...getBaseProps(),
            element: {
                ...getBaseProps().element,
                datetime_config: {location_timezone: 'Europe/London'},
            },
        });

        expect(selectorProps().timezone).toBe('Europe/London');
        const abbr = moment.tz('Europe/London').format('z');
        expect(getByText(`Times in ${abbr}`)).toBeTruthy();
    });
});
