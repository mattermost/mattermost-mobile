// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import {AppFieldTypes} from '@constants/apps';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';

import AppsFormComponent, {initValues} from './apps_form_component';

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

describe('AppsFormComponent submit button', () => {
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('renders inline Submit button when the form has no submit_buttons field', () => {
        const {getByTestId} = renderWithEverything(<AppsFormComponent {...getProps()}/>, {database, serverUrl});

        expect(getByTestId('interactive_dialog.submit.button')).toBeTruthy();
    });

    it('renders inline Submit buttons from submit_buttons field when options exist', () => {
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

        const {queryByTestId} = renderWithEverything(<AppsFormComponent {...getProps(form)}/>, {database, serverUrl});

        // Default Submit button should not appear — inline option buttons replace it.
        expect(queryByTestId('interactive_dialog.submit.button')).toBeNull();
    });

    it('renders inline Submit when submit_buttons field has no options', () => {
        const form: Partial<AppForm> = {
            submit_buttons: 'action',
            fields: [{
                name: 'action',
                type: 'static_select',
                options: [],
            }] as AppField[],
        };

        const {getByTestId} = renderWithEverything(<AppsFormComponent {...getProps(form)}/>, {database, serverUrl});

        expect(getByTestId('interactive_dialog.submit.button')).toBeTruthy();
    });

    it('honors form.submit_label as the button text', () => {
        const {getByText} = renderWithEverything(
            <AppsFormComponent {...getProps({submit_label: 'Triage'})}/>,
            {database, serverUrl},
        );

        expect(getByText('Triage')).toBeTruthy();
    });
});

describe('initValues', () => {
    it('initializes top-level field values', () => {
        const fields: AppField[] = [
            {name: 'name', type: 'text', value: 'Alice'} as AppField,
            {name: 'agree', type: 'bool', value: true} as AppField,
        ];

        expect(initValues(fields)).toEqual({name: 'Alice', agree: true});
    });

    it('initializes values for fields inside a collapsible section', () => {
        const fields: AppField[] = [
            {name: 'name', type: 'text', value: 'Alice'} as AppField,
            {
                name: 'contact_section',
                type: AppFieldTypes.COLLAPSIBLE,
                collapsible_config: {
                    expanded: true,
                    fields: [
                        {name: 'email', type: 'text', value: 'alice@example.com'} as AppField,
                        {name: 'phone', type: 'text', value: '555-1234'} as AppField,
                    ],
                },
            } as AppField,
        ];

        // The collapsible container itself must not appear in the value map —
        // only its leaf children should.
        expect(initValues(fields)).toEqual({
            name: 'Alice',
            email: 'alice@example.com',
            phone: '555-1234',
        });
    });

    it('initializes values for fields in nested (depth-2) collapsible sections', () => {
        const fields: AppField[] = [
            {
                name: 'outer',
                type: AppFieldTypes.COLLAPSIBLE,
                collapsible_config: {
                    expanded: true,
                    fields: [
                        {
                            name: 'inner',
                            type: AppFieldTypes.COLLAPSIBLE,
                            collapsible_config: {
                                expanded: true,
                                fields: [
                                    {name: 'notes', type: 'text', value: 'deep value'} as AppField,
                                ],
                            },
                        } as AppField,
                    ],
                },
            } as AppField,
        ];

        expect(initValues(fields)).toEqual({notes: 'deep value'});
    });
});

describe('AppsFormComponent collapsible field data flow', () => {
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('submit payload includes values from fields inside collapsed sections', async () => {
        const submitMock = jest.fn().mockResolvedValue({data: {type: 'ok'}});
        const form: Partial<AppForm> = {
            fields: [
                {name: 'name', type: 'text', value: 'Alice'} as AppField,
                {
                    name: 'contact_section',
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {
                        expanded: false, // collapsed — fields are hidden but values must still submit
                        fields: [
                            {name: 'email', type: 'text', value: 'alice@example.com'} as AppField,
                            {name: 'phone', type: 'text', value: '555-1234'} as AppField,
                        ],
                    },
                } as AppField,
            ],
        };
        const props = {...getProps(form), submit: submitMock};

        const {getByTestId} = renderWithEverything(<AppsFormComponent {...props}/>, {database, serverUrl});

        fireEvent.press(getByTestId('interactive_dialog.submit.button'));

        // Wait for async submit to resolve
        await new Promise((r) => setImmediate(r));

        expect(submitMock).toHaveBeenCalledTimes(1);
        const payload = submitMock.mock.calls[0][0];
        expect(payload.name).toBe('Alice');
        expect(payload.email).toBe('alice@example.com');
        expect(payload.phone).toBe('555-1234');

        // The collapsible container itself must not appear in the payload
        expect(payload).not.toHaveProperty('contact_section');
    });

    it('submit payload includes values from a section that is currently expanded', async () => {
        const submitMock = jest.fn().mockResolvedValue({data: {type: 'ok'}});
        const form: Partial<AppForm> = {
            fields: [
                {
                    name: 'advanced',
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {
                        expanded: true,
                        fields: [
                            {name: 'priority', type: 'text', value: 'high'} as AppField,
                        ],
                    },
                } as AppField,
            ],
        };
        const props = {...getProps(form), submit: submitMock};

        const {getByTestId} = renderWithEverything(<AppsFormComponent {...props}/>, {database, serverUrl});

        fireEvent.press(getByTestId('interactive_dialog.submit.button'));
        await new Promise((r) => setImmediate(r));

        expect(submitMock).toHaveBeenCalledTimes(1);
        expect(submitMock.mock.calls[0][0]).toMatchObject({priority: 'high'});
    });
});

describe('AppsFormComponent collapsible section rendering', () => {
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('does not render a section header when the section has no visible fields', () => {
        const form: Partial<AppForm> = {
            fields: [
                {
                    name: 'empty_section',
                    label: 'Nothing here',
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {expanded: true, fields: []},
                } as AppField,
            ],
        };

        const {queryByText} = renderWithEverything(<AppsFormComponent {...getProps(form)}/>, {database, serverUrl});

        // An empty collapsible must not leave a dangling, contentless toggle.
        expect(queryByText('Nothing here')).toBeNull();
    });

    it('drops a section whose only child is the submit_buttons field', () => {
        const form: Partial<AppForm> = {
            submit_buttons: 'action',
            fields: [
                {
                    name: 'actions_section',
                    label: 'Actions',
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {
                        expanded: true,
                        fields: [
                            {name: 'action', type: 'static_select', options: [{label: 'Go', value: 'go'}]} as AppField,
                        ],
                    },
                } as AppField,
            ],
        };

        const {queryByText} = renderWithEverything(<AppsFormComponent {...getProps(form)}/>, {database, serverUrl});

        // The submit_buttons field is filtered out of the section's children, leaving
        // it empty — so the header should not render.
        expect(queryByText('Actions')).toBeNull();
    });

    it('auto-expands a collapsed section when a field inside it fails validation', async () => {
        const submitMock = jest.fn().mockResolvedValue({data: {type: 'ok'}});
        const form: Partial<AppForm> = {
            fields: [
                {
                    name: 'advanced',
                    label: 'Advanced',
                    type: AppFieldTypes.COLLAPSIBLE,
                    collapsible_config: {
                        expanded: false, // starts collapsed; required child is out of sight
                        fields: [
                            {name: 'reason', label: 'Reason', type: 'text', is_required: true} as AppField,
                        ],
                    },
                } as AppField,
            ],
        };
        const props = {...getProps(form), submit: submitMock};

        const {getByLabelText, getByTestId} = renderWithEverything(<AppsFormComponent {...props}/>, {database, serverUrl});

        // Collapsed to begin with.
        expect(getByLabelText('Advanced').props.accessibilityState).toMatchObject({expanded: false});

        // The forced-expand runs in a follow-up effect inside the section, so let
        // that state update settle before asserting.
        await act(async () => {
            fireEvent.press(getByTestId('interactive_dialog.submit.button'));
        });

        // Validation blocks the submit and opens the offending section so the user
        // can find the field that needs fixing.
        expect(submitMock).not.toHaveBeenCalled();
        expect(getByLabelText('Advanced').props.accessibilityState).toMatchObject({expanded: true});
    });
});
