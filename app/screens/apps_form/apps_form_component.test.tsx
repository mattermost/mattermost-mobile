// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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

jest.mock('./apps_form_field', () => {
    const MockField = () => null;
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
