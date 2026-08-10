// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, waitFor} from '@testing-library/react-native';
import moment from 'moment-timezone';
import React, {type ComponentProps} from 'react';
import {Text} from 'react-native';

import DateTimeSelector from '@components/date_time_selector';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {MmBlocksInteractionsDisabledContext} from '../context';
import {MmBlocksForm, useMmBlocksForm, type MmBlocksFormValues} from '../form';

import DateInputElement from './index';

import type Database from '@nozbe/watermelondb/Database';

jest.mock('@components/date_time_selector', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const mockDateTimeSelector = (props: ComponentProps<typeof DateTimeSelector>) => (
    React.createElement('DateTimeSelector', {...props})
);
jest.mocked(DateTimeSelector).mockImplementation(mockDateTimeSelector);

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

describe('DateInputElement', () => {
    const serverUrl = 'https://server.com';
    const onAction = jest.fn();
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.mocked(DateTimeSelector).mockImplementation(mockDateTimeSelector);

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

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    function getBaseProps(): ComponentProps<typeof DateInputElement> {
        return {
            element: {
                type: 'date_input',
                name: 'due_date',
                label: 'Due date',
                initial_value: '2026-01-15',
            },
            onAction,
            theme: Preferences.THEMES.denim,
        };
    }

    function renderRaw(props: ComponentProps<typeof DateInputElement>, interactionsDisabled = false) {
        return renderWithEverything(
            <MmBlocksInteractionsDisabledContext.Provider value={interactionsDisabled}>
                <MmBlocksForm
                    errors={{}}
                    onErrorsChange={jest.fn()}
                >
                    <DateInputElement {...props}/>
                    <FormValuesProbe/>
                </MmBlocksForm>
            </MmBlocksInteractionsDisabledContext.Provider>,
            {database, serverUrl},
        );
    }

    async function renderInput(props: ComponentProps<typeof DateInputElement>, interactionsDisabled = false) {
        const view = renderRaw(props, interactionsDisabled);

        // The element is enhanced with observables, so it stays unmounted until the user timezone resolves.
        await waitFor(() => expect(formValues(view)).not.toEqual({}));

        return view;
    }

    async function pickDate(date: string) {
        await act(async () => {
            selectorProps().handleChange(moment.tz(date, TIMEZONE));
        });
    }

    it('should not render an input or seed a form value when name is missing', async () => {
        const view = renderRaw({
            ...getBaseProps(),
            element: {type: 'date_input', name: '', label: 'Due date'},
        });

        await act(async () => {
            await TestHelper.wait(0);
        });

        expect(formValues(view)).toEqual({});
        expect(view.queryByText('Due date')).toBeNull();
        expect(jest.mocked(DateTimeSelector)).not.toHaveBeenCalled();
    });

    it('should seed the form with initial_value and pass it to the picker in the user timezone', async () => {
        const view = await renderInput({
            ...getBaseProps(),
            element: {...getBaseProps().element, help_text: 'Pick a due date'},
        });

        expect(formValues(view)).toEqual({due_date: '2026-01-15'});
        expect(view.getByText('Pick a due date')).toBeVisible();

        const props = selectorProps();
        expect(props.timezone).toBe(TIMEZONE);
        expect(props.dateOnly).toBe(true);
        expect(props.initialDate?.toISOString()).toBe('2026-01-15T05:00:00.000Z');
    });

    it('should seed relative date defaults as YYYY-MM-DD', async () => {
        const view = await renderInput({
            ...getBaseProps(),
            element: {...getBaseProps().element, initial_value: 'today'},
        });

        const today = moment.tz(TIMEZONE).format('YYYY-MM-DD');
        expect(formValues(view)).toEqual({due_date: today});
    });

    it('should store the picked date as a date-only string', async () => {
        const view = await renderInput(getBaseProps());

        await pickDate('2026-03-05 10:30');

        expect(formValues(view)).toEqual({due_date: '2026-03-05'});
        expect(onAction).not.toHaveBeenCalled();
    });

    it('should trigger onAction with form values when onChange is set', async () => {
        await renderInput({
            ...getBaseProps(),
            element: {...getBaseProps().element, onChange: 'refresh_action'},
        });

        await pickDate('2026-03-05 10:30');

        expect(onAction).toHaveBeenCalledWith({actionId: 'refresh_action', formValues: {due_date: '2026-03-05'}});
    });

    it('should not update the value or dispatch onChange when interactions are disabled', async () => {
        const view = await renderInput({
            ...getBaseProps(),
            element: {...getBaseProps().element, onChange: 'refresh_action'},
        }, true);

        expect(selectorProps().disabled).toBe(true);

        await pickDate('2026-03-05 10:30');

        expect(formValues(view)).toEqual({due_date: '2026-01-15'});
        expect(onAction).not.toHaveBeenCalled();
    });

    it('should pass disabled to the picker when the element is disabled', async () => {
        await renderInput({
            ...getBaseProps(),
            element: {...getBaseProps().element, disabled: true},
        });

        expect(selectorProps().disabled).toBe(true);
    });

    it('should resolve relative min and max dates and block past dates when min_date is today', async () => {
        await renderInput({
            ...getBaseProps(),
            element: {
                ...getBaseProps().element,
                datetime_config: {min_date: 'today', max_date: '+7d', manual_time_entry: true},
            },
        });

        const today = moment.tz(TIMEZONE);
        const props = selectorProps();
        expect(props.minDate).toBe(today.format('YYYY-MM-DD'));
        expect(props.maxDate).toBe(today.clone().add(7, 'days').format('YYYY-MM-DD'));
        expect(props.allowPastDates).toBe(false);
        expect(props.allowManualTimeEntry).toBe(true);
    });

    it('should allow past dates when min_date is in the past', async () => {
        await renderInput({
            ...getBaseProps(),
            element: {...getBaseProps().element, datetime_config: {min_date: '-5d'}},
        });

        expect(selectorProps().allowPastDates).toBe(true);
    });
});
