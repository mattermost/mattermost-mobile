// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';

import AppsFormComponent, {initValues} from './apps_form_component';

import type {Database} from '@nozbe/watermelondb';

// The default submit action is registered in the modal header via
// navigation.setOptions({headerRight: ...}) rather than rendered inline. The
// global expo-router mock in test/setup.ts returns a no-op setOptions, so we
// override it here to capture the registered headerRight for assertions.
const mockSetOptions = jest.fn();
jest.mock('expo-router', () => ({
    router: {
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
        canGoBack: jest.fn(() => true),
        canDismiss: jest.fn(() => true),
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        dismissTo: jest.fn(),
        setParams: jest.fn(),
        navigate: jest.fn(),
    },
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
        canGoBack: jest.fn(() => true),
        navigate: jest.fn(),
    }),
    useNavigation: () => ({
        navigate: jest.fn(),
        goBack: jest.fn(),
        canGoBack: jest.fn(() => true),
        setOptions: mockSetOptions,
        setParams: jest.fn(),
        getState: jest.fn(() => ({})),
        addListener: jest.fn(() => jest.fn()),
    }),
    useSegments: () => [],
    usePathname: () => '/',
    useLocalSearchParams: () => ({}),
    useGlobalSearchParams: () => ({}),
    Link: 'Link',
    Redirect: 'Redirect',
    Stack: {Screen: 'Screen'},
    Tabs: {Screen: 'Screen'},
}));

// Returns the most recently registered headerRight render function (or undefined
// if the component cleared it, which it does for forms with submit_buttons).
const getHeaderSubmit = () => {
    for (let i = mockSetOptions.mock.calls.length - 1; i >= 0; i--) {
        const o = mockSetOptions.mock.calls[i][0];
        if (o && 'headerRight' in o) {
            return o.headerRight;
        }
    }
    return undefined;
};

// The submit testID sits on a wrapper View (to constrain the Detox hit area), so
// the actual onPress lives on its Pressable child. fireEvent.press does not
// descend into children, so press the Pressable directly.
const pressSubmit = (wrapper: any) => {
    fireEvent.press(wrapper.children[0]);
};

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
        mockSetOptions.mockClear();
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('registers a header Submit button when the form has no submit_buttons field', () => {
        renderWithEverything(<AppsFormComponent {...getProps()}/>, {database, serverUrl});

        const headerRight = getHeaderSubmit();
        expect(headerRight).toBeTruthy();

        const {getByTestId} = renderWithEverything(<>{headerRight!()}</>, {database, serverUrl});
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

        renderWithEverything(<AppsFormComponent {...getProps(form)}/>, {database, serverUrl});

        // Default header Submit button should not appear — inline option buttons replace it.
        expect(getHeaderSubmit()).toBeUndefined();
    });

    it('registers a header Submit when submit_buttons field has no options', () => {
        const form: Partial<AppForm> = {
            submit_buttons: 'action',
            fields: [{
                name: 'action',
                type: 'static_select',
                options: [],
            }] as AppField[],
        };

        renderWithEverything(<AppsFormComponent {...getProps(form)}/>, {database, serverUrl});

        const headerRight = getHeaderSubmit();
        expect(headerRight).toBeTruthy();

        const {getByTestId} = renderWithEverything(<>{headerRight!()}</>, {database, serverUrl});
        expect(getByTestId('interactive_dialog.submit.button')).toBeTruthy();
    });

    it('honors form.submit_label as the submit button accessibility label', () => {
        renderWithEverything(
            <AppsFormComponent {...getProps({submit_label: 'Triage'})}/>,
            {database, serverUrl},
        );

        const headerRight = getHeaderSubmit();
        expect(headerRight).toBeTruthy();

        // The header submit is now a checkmark icon button, so the label is exposed
        // to assistive tech via accessibilityLabel rather than visible text.
        const {getByLabelText} = renderWithEverything(<>{headerRight!()}</>, {database, serverUrl});
        expect(getByLabelText('Triage')).toBeTruthy();
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
});

describe('AppsFormComponent collapsible field data flow', () => {
    let database: Database;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockSetOptions.mockClear();
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('blocks a second submit while the first is still in flight', async () => {
        // A rapid double-tap on the header button must not submit twice. The in-flight
        // ref guard rejects the second press synchronously, before the first resolves.
        let resolveSubmit: (value: DoAppCallResult<FormResponseData>) => void = () => {};
        const submitMock = jest.fn(() => new Promise<DoAppCallResult<FormResponseData>>((resolve) => {
            resolveSubmit = resolve;
        }));
        const form: Partial<AppForm> = {
            fields: [{name: 'name', type: 'text', value: 'Alice'} as AppField],
        };
        const props = {...getProps(form), submit: submitMock};

        renderWithEverything(<AppsFormComponent {...props}/>, {database, serverUrl});

        const headerRight = getHeaderSubmit();
        const {getByTestId} = renderWithEverything(<>{headerRight!()}</>, {database, serverUrl});

        await act(async () => {
            const button = getByTestId('interactive_dialog.submit.button');
            pressSubmit(button);
            pressSubmit(button);
            await new Promise((r) => setImmediate(r));
        });

        expect(submitMock).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveSubmit({data: {type: 'ok'}});
            await new Promise((r) => setImmediate(r));
        });
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
