// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, within} from '@testing-library/react-native';
import React from 'react';
import {StyleSheet, View} from 'react-native';

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

type MockFieldProps = {name: string; value: AppFormValue; onChange: (name: string, value: AppFormValue) => void; field: AppField; accessibilityLabel?: string; compact?: boolean};

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

describe('AppsFormComponent grid layout', () => {
    let database: Database;

    // A grid container whose two child collapsibles are rows, each with an
    // order and a weight cell.
    const gridForm: Partial<AppForm> = {
        fields: [{
            name: 'orders',
            type: 'collapsible',
            label: 'Orders',
            collapsible_config: {
                layout: 'grid',
                expanded: true,
                bordered: true,
                fields: [
                    {name: 'row1',
                        type: 'collapsible',
                        label: 'Row 1',
                        collapsible_config: {fields: [
                            {name: 'cell_order', type: 'text', label: 'Order'},
                            {name: 'cell_weight', type: 'text', label: 'Weight'},
                        ]}} as AppField,
                    {name: 'row2',
                        type: 'collapsible',
                        label: 'Row 2',
                        collapsible_config: {fields: [
                            {name: 'cell_order2', type: 'text', label: 'Order'},
                            {name: 'cell_weight2', type: 'text', label: 'Weight'},
                        ]}} as AppField,
                ],
            },
        } as AppField],
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        mockSetOptions.mockClear();
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.restoreAllMocks();
    });

    it('renders a grid-layout collapsible as a table with column headers, not a stacked section', () => {
        const {getByTestId, queryByTestId} = renderWithEverything(<AppsFormComponent {...getProps(gridForm)}/>, {database, serverUrl});

        expect(getByTestId('apps_form_grid.orders')).toBeTruthy();
        expect(getByTestId('apps_form_grid.header.cell_order')).toBeTruthy();
        expect(getByTestId('apps_form_grid.header.cell_weight')).toBeTruthy();

        // A grid is not drawn as a normal stacked collapsible.
        expect(queryByTestId('AppFormSection.orders')).toBeNull();
    });

    it('shows a tall field (radio) as a read-only summary in the cell, editable in the row view', () => {
        Object.keys(mockFieldProps).forEach((k) => delete mockFieldProps[k]);

        // A radio's stacked options do not fit a single-line cell, so the cell
        // shows its selected value and the field is edited on the row's screen.
        const form: Partial<AppForm> = {
            fields: [{
                name: 'orders',
                type: 'collapsible',
                label: 'Orders',
                collapsible_config: {
                    layout: 'grid',
                    fields: [{
                        name: 'row1',
                        type: 'collapsible',
                        label: 'Row 1',
                        collapsible_config: {fields: [
                            {name: 'cell_order', type: 'text', label: 'Order'},
                            {name: 'cell_status',
                                type: 'radio',
                                label: 'Status',
                                value: 'shipped',
                                options: [
                                    {label: 'New', value: 'new'},
                                    {label: 'Shipped', value: 'shipped'},
                                ]},
                        ]},
                    } as AppField],
                },
            } as AppField],
        };

        const {getByTestId} = renderWithEverything(<AppsFormComponent {...getProps(form)}/>, {database, serverUrl});

        // The text cell edits inline (renders an AppsFormField); the radio cell
        // does not — it shows the selected option's label as a summary.
        expect(mockFieldProps.cell_order).toBeTruthy();
        expect(mockFieldProps.cell_status).toBeUndefined();
        expect(within(getByTestId('apps_form_grid.cell.cell_status')).queryByText('Shipped')).toBeTruthy();

        // Opening the row edits the radio in full (now an AppsFormField).
        act(() => {
            fireEvent.press(getByTestId('apps_form_grid.row.row1.open'));
        });
        expect(mockFieldProps.cell_status).toBeTruthy();
    });

    it('edits cells inline and exposes an expand control to open the row', () => {
        Object.keys(mockFieldProps).forEach((k) => delete mockFieldProps[k]);

        const {getByTestId} = renderWithEverything(<AppsFormComponent {...getProps(gridForm)}/>, {database, serverUrl});

        // Cells are live inputs, so each leaf field renders an AppsFormField.
        expect(mockFieldProps.cell_order).toBeTruthy();
        expect(mockFieldProps.cell_weight).toBeTruthy();

        // The text box is inset by its margins. A 100% width on top of those
        // margins would stick out of the cell and get clipped.
        const orderCell = getByTestId('apps_form_grid.cell.cell_order');
        const boxed = orderCell.findAllByType(View).
            map((node) => StyleSheet.flatten(node.props.style)).
            find((style) => style?.borderWidth === 1);
        expect(boxed?.marginHorizontal).toBe(6);
        expect(boxed?.width).toBeUndefined();

        // Each row also has its own expand control to open the single-row view.
        expect(getByTestId('apps_form_grid.row.row1.open')).toBeTruthy();
    });

    it('strips a cell field label but names the input, and keeps an action_button label', () => {
        Object.keys(mockFieldProps).forEach((k) => delete mockFieldProps[k]);

        const form: Partial<AppForm> = {
            fields: [{
                name: 'orders',
                type: 'collapsible',
                label: 'Orders',
                collapsible_config: {
                    layout: 'grid',
                    fields: [{
                        name: 'row1',
                        type: 'collapsible',
                        label: 'Row 1',
                        collapsible_config: {fields: [
                            {name: 'cell_order', type: 'text', label: 'Order'},
                            {name: 'cell_action', type: 'action_button', label: 'Details', action_button_url: '/x'},
                        ]},
                    } as AppField],
                },
            } as AppField],
        };

        renderWithEverything(<AppsFormComponent {...getProps(form)}/>, {database, serverUrl});

        // A normal cell's visible label is stripped (the column header carries
        // it), but the input is still named for screen readers and rendered
        // compactly.
        expect(mockFieldProps.cell_order.field.label).toBe('');
        expect(mockFieldProps.cell_order.accessibilityLabel).toBe('Order');
        expect(mockFieldProps.cell_order.compact).toBe(true);

        // An action_button's label IS its button text, so it is kept.
        expect(mockFieldProps.cell_action.field.label).toBe('Details');
    });

    it('blanks an action_button column header but keeps normal column headers', () => {
        const form: Partial<AppForm> = {
            fields: [{
                name: 'orders',
                type: 'collapsible',
                label: 'Orders',
                collapsible_config: {
                    layout: 'grid',
                    fields: [{
                        name: 'row1',
                        type: 'collapsible',
                        label: 'Row 1',
                        collapsible_config: {fields: [
                            {name: 'cell_order', type: 'text', label: 'Order'},
                            {name: 'cell_action', type: 'action_button', label: 'Details', action_button_url: '/x'},
                        ]},
                    } as AppField],
                },
            } as AppField],
        };

        const {getByTestId} = renderWithEverything(<AppsFormComponent {...getProps(form)}/>, {database, serverUrl});

        // A normal column keeps its header label; the action_button column's
        // header is blank (the button carries the word itself).
        expect(within(getByTestId('apps_form_grid.header.cell_order')).queryByText('Order')).toBeTruthy();
        expect(within(getByTestId('apps_form_grid.header.cell_action')).queryByText('Details')).toBeNull();
    });

    it('falls back to rendering fields when a grid has no row cells to lay out', () => {
        Object.keys(mockFieldProps).forEach((k) => delete mockFieldProps[k]);

        // A grid container whose only child is a leaf (no row collapsibles) has
        // no columns; it must render that field rather than crash on the header.
        const form: Partial<AppForm> = {
            fields: [{
                name: 'orders',
                type: 'collapsible',
                label: 'Orders',
                collapsible_config: {
                    layout: 'grid',
                    fields: [
                        {name: 'stray', type: 'text', label: 'Stray'} as AppField,
                    ],
                },
            } as AppField],
        };

        const {queryByTestId} = renderWithEverything(<AppsFormComponent {...getProps(form)}/>, {database, serverUrl});

        // No table is drawn, but the stray field still renders.
        expect(queryByTestId('apps_form_grid.orders')).toBeNull();
        expect(mockFieldProps.stray).toBeTruthy();
    });

    it('opens a row from the expand control, and Done returns to the table without submitting', () => {
        const submitMock = jest.fn().mockResolvedValue({data: {type: 'ok'}});
        const props = {...getProps(gridForm), submit: submitMock};
        const {getByTestId, queryByTestId} = renderWithEverything(<AppsFormComponent {...props}/>, {database, serverUrl});

        expect(queryByTestId('apps_form_row_detail.row1')).toBeNull();

        act(() => {
            fireEvent.press(getByTestId('apps_form_grid.row.row1.open'));
        });

        // The row opens on its own screen and the header becomes Done.
        expect(getByTestId('apps_form_row_detail.row1')).toBeTruthy();
        const doneButton = getHeaderSubmit();
        const {getByTestId: getHeaderTestId} = renderWithEverything(<>{doneButton!()}</>, {database, serverUrl});
        const done = getHeaderTestId('interactive_dialog.row_done.button');

        // Done closes the row and returns to the table; it does not submit the
        // whole dialog while the user is looking at a single record.
        act(() => {
            pressSubmit(done);
        });

        expect(queryByTestId('apps_form_row_detail.row1')).toBeNull();
        expect(getByTestId('apps_form_grid.orders')).toBeTruthy();
        expect(submitMock).not.toHaveBeenCalled();
    });

    it('keeps a nameless row in a nameless grid reachable by its tree path', () => {
        // Both the grid and its single row collapsible have no name. The row must
        // still render and open so its cells are not silently dropped.
        const namelessForm: Partial<AppForm> = {
            fields: [{
                type: 'collapsible',
                label: 'Orders',
                collapsible_config: {
                    layout: 'grid',
                    expanded: true,
                    bordered: true,
                    fields: [
                        {
                            type: 'collapsible',
                            label: 'Row',
                            collapsible_config: {fields: [
                                {name: 'cell_order', type: 'text', label: 'Order'},
                            ]},
                        } as AppField,
                    ],
                },
            } as AppField],
        };

        const {getByTestId} = renderWithEverything(<AppsFormComponent {...getProps(namelessForm)}/>, {database, serverUrl});

        // Grid at form path '0', row at index 0 -> namespaced path '::pos::0/0'.
        act(() => {
            fireEvent.press(getByTestId('apps_form_grid.row.::pos::0/0.open'));
        });

        // The row opened on its own screen (title/back header is name-independent).
        expect(getByTestId('apps_form_row_detail.title')).toBeTruthy();
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
