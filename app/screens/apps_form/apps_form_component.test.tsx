// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import {AppFieldTypes} from '@constants/apps';
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

jest.mock('./apps_form_field', () => {
    const React2 = require('react');
    const {Text, TextInput, View} = require('react-native');

    // Renders just enough to assert which fields reached the form and what
    // error each one was handed. The input is what lets a test type into a
    // cell, so anything that tracks a live value can be exercised through the
    // real form rather than by poking at the reducer.
    type MockFieldProps = {
        name: string;
        errorText?: string;
        value?: unknown;
        onChange: (name: string, value: unknown) => void;
    };
    const MockField = ({name, errorText, value, onChange}: MockFieldProps) => (
        React2.createElement(
            View,
            null,
            React2.createElement(Text, {testID: `field.${name}`}, errorText || ''),
            React2.createElement(TextInput, {
                testID: `field.${name}.input`,
                value: typeof value === 'string' ? value : '',
                onChangeText: (text: string) => onChange(name, text),
            }),
        )
    );
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

describe('AppsFormComponent collapsible fields', () => {
    let database: Database;

    const collapsible = (name: string, fields: AppField[], expanded = true): AppField => ({
        name,
        type: AppFieldTypes.COLLAPSIBLE,
        label: name === 'row_1' ? 'Row 1' : name,
        collapsible_config: {fields, expanded, bordered: true},
    } as AppField);

    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('renders the section and its child fields', () => {
        const form: Partial<AppForm> = {
            fields: [collapsible('row_1', [
                {name: 'cell_name', type: AppFieldTypes.TEXT} as AppField,
                {name: 'cell_tons', type: AppFieldTypes.TEXT} as AppField,
            ])],
        };

        const {getByText, getByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps(form)}/>,
            {database, serverUrl},
        );

        expect(getByText('Row 1')).toBeTruthy();
        expect(getByTestId('field.cell_name')).toBeTruthy();
        expect(getByTestId('field.cell_tons')).toBeTruthy();
    });

    it('mounts the child fields only once a collapsed section is opened', () => {
        const form: Partial<AppForm> = {
            fields: [collapsible('row_1', [{name: 'cell_name', type: AppFieldTypes.TEXT} as AppField], false)],
        };

        const {getByTestId, queryByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps(form)}/>,
            {database, serverUrl},
        );

        expect(queryByTestId('field.cell_name')).toBeNull();

        fireEvent.press(getByTestId('interactive_dialog.collapsible.row_1.toggle'));

        expect(getByTestId('field.cell_name')).toBeTruthy();
    });

    it('submits the values of nested fields', async () => {
        const props = getProps({
            fields: [collapsible('row_1', [
                {name: 'cell_name', type: AppFieldTypes.TEXT, value: 'Pallets'} as AppField,
                {name: 'cell_ready', type: AppFieldTypes.BOOL, value: true} as AppField,
            ])],
        });

        renderWithEverything(<AppsFormComponent {...props}/>, {database, serverUrl});

        await act(async () => {
            lastHeaderRight()?.().props.onPress();
        });

        expect(props.submit).toHaveBeenCalledWith({cell_name: 'Pallets', cell_ready: true});
    });

    it('validates a required nested field and lands the error on that field', async () => {
        const props = getProps({
            fields: [collapsible('row_1', [
                {name: 'cell_name', type: AppFieldTypes.TEXT, is_required: true} as AppField,
            ])],
        });

        const {getByTestId} = renderWithEverything(<AppsFormComponent {...props}/>, {database, serverUrl});

        await act(async () => {
            lastHeaderRight()?.().props.onPress();
        });

        expect(props.submit).not.toHaveBeenCalled();
        expect(getByTestId('field.cell_name').props.children).toBeTruthy();
    });
});
