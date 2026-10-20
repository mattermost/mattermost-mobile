// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React from 'react';

import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';

import AppsFormComponent from './apps_form_component';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));

jest.mock('@actions/remote/command', () => ({
    handleGotoLocation: jest.fn(),
}));

type MockFieldProps = {name: string; value: AppFormValue; onChange: (name: string, value: AppFormValue) => void};

// Latest props each field rendered with, keyed by field name.
const mockFieldProps: Record<string, MockFieldProps> = {};
jest.mock('./apps_form_field', () => {
    const MockField = (props: {name: string}) => {
        mockFieldProps[props.name] = props as MockFieldProps;
        return null;
    };
    return {
        __esModule: true,
        default: MockField,
    };
});

const mockSetOptions = jest.fn();
jest.mock('expo-router', () => ({
    useNavigation: jest.fn(() => ({
        setOptions: mockSetOptions,
        addListener: jest.fn(() => jest.fn()),
    })),
}));

const serverUrl = 'http://localhost:8065';

function getProps(form: Partial<AppForm> = {}) {
    return {
        form: {
            title: 'Test',
            fields: [],
            ...form,
        } as AppForm,
        submit: jest.fn().mockResolvedValue({data: {type: 'ok'}}),
        performLookupCall: jest.fn(),
        refreshOnSelect: jest.fn(),
    };
}

function lastHeaderRight(): undefined | (() => React.ReactElement<{text: string; disabled: boolean; testID: string}>) {
    const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1];
    return lastCall?.[0]?.headerRight;
}

describe('AppsFormComponent navigation header', () => {
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('installs header Submit when the form has no submit_buttons field', () => {
        renderWithEverything(<AppsFormComponent {...getProps()}/>, {database, serverUrl});

        const headerRight = lastHeaderRight();
        expect(headerRight).toBeDefined();

        const button = headerRight?.();
        expect(button?.props.testID).toBe('interactive_dialog.submit.button');
        expect(button?.props.text).toBe('Submit');
        expect(button?.props.disabled).toBe(false);
    });

    it('clears header Submit when submit_buttons field has options (inline buttons render)', () => {
        const form: Partial<AppForm> = {
            submit_buttons: 'action',
            fields: [{
                name: 'action',
                type: 'static_select',
                options: [
                    {label: 'Approve', value: 'approve'},
                    {label: 'Reject', value: 'reject'},
                ],
            }] as AppField[],
        };

        renderWithEverything(<AppsFormComponent {...getProps(form)}/>, {database, serverUrl});

        const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1];
        expect(lastCall[0]).toEqual({headerRight: undefined});
    });

    it('keeps header Submit when submit_buttons field has no options (inline buttons render nothing)', () => {
        const form: Partial<AppForm> = {
            submit_buttons: 'action',
            fields: [{
                name: 'action',
                type: 'static_select',
                options: [],
            }] as AppField[],
        };

        renderWithEverything(<AppsFormComponent {...getProps(form)}/>, {database, serverUrl});

        const headerRight = lastHeaderRight();
        expect(headerRight).toBeDefined();
        expect(headerRight?.().props.testID).toBe('interactive_dialog.submit.button');
    });

    it('honors form.submit_label as the header button text', () => {
        renderWithEverything(
            <AppsFormComponent {...getProps({submit_label: 'Triage'})}/>,
            {database, serverUrl},
        );

        const headerRight = lastHeaderRight();
        expect(headerRight?.().props.text).toBe('Triage');
    });
});

describe('AppsFormComponent refresh on return', () => {
    let database: Database;

    const fields = (tasks: string, pickOptions: string[]) => [
        {name: 'notes', type: 'text', value: ''},
        {name: 'tasks', type: 'text', value: tasks},
        {name: 'pick', type: 'static_select', options: pickOptions.map((value) => ({label: value, value}))},
    ] as AppField[];

    const formBefore = {title: 'Cargo', fields: fields('1 task', ['a', 'b'])} as AppForm;
    const formAfter = {title: 'Cargo', fields: fields('2 tasks', ['a'])} as AppForm;

    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should refresh with the current values and keep what the user entered', async () => {
        const props = {...getProps(), refreshForm: jest.fn().mockResolvedValue({data: {type: 'form'}})};
        const {rerender} = renderWithEverything(
            <AppsFormComponent
                {...props}
                form={formBefore}
                refreshNonce={0}
            />,
            {database, serverUrl},
        );

        act(() => {
            mockFieldProps.notes.onChange('notes', 'my notes');
            mockFieldProps.pick.onChange('pick', {label: 'b', value: 'b'});
        });

        await act(async () => {
            rerender(
                <AppsFormComponent
                    {...props}
                    form={formBefore}
                    refreshNonce={1}
                />,
            );
        });

        expect(props.refreshForm).toHaveBeenCalledWith(expect.objectContaining({notes: 'my notes', tasks: '1 task'}));

        rerender(
            <AppsFormComponent
                {...props}
                form={formAfter}
                refreshNonce={1}
            />,
        );

        expect(mockFieldProps.notes.value).toBe('my notes');
        expect(mockFieldProps.tasks.value).toBe('2 tasks');

        // The picked option was removed by the refresh.
        expect(mockFieldProps.pick.value).toBe('');
    });

    it('should not re-apply user values when the form is replaced without a refresh on return', () => {
        const props = getProps();
        const {rerender} = renderWithEverything(
            <AppsFormComponent
                {...props}
                form={formBefore}
            />,
            {database, serverUrl},
        );

        act(() => {
            mockFieldProps.notes.onChange('notes', 'my notes');
        });

        rerender(
            <AppsFormComponent
                {...props}
                form={formAfter}
            />,
        );

        expect(mockFieldProps.notes.value).toBe('');
    });
});
