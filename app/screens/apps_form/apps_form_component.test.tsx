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

// The grid edits its cells in place above GRID_INLINE_EDIT_MIN_WIDTH and
// drills into a row below it, so the viewport is what each suite is varying.
// react-native's index requires this module lazily, so mocking the path is
// what reaches `useWindowDimensions` imported from 'react-native'.
let mockViewportWidth = 800;
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
    __esModule: true,
    default: () => ({width: mockViewportWidth, height: 1334, scale: 2, fontScale: 1}),
}));

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

describe('AppsFormComponent grid layout, wide enough to edit in place', () => {
    let database: Database;

    const cell = (name: string, label: string): AppField => ({name, type: AppFieldTypes.TEXT, label} as AppField);

    const row = (name: string, cells: AppField[]): AppField => ({
        name,
        type: AppFieldTypes.COLLAPSIBLE,
        label: 'a label the table does not use',
        collapsible_config: {fields: cells, expanded: true, bordered: true, layout: 'stacked'},
    } as AppField);

    const grid = (rows: AppField[], strays: AppField[] = []): AppField => ({
        name: 'order_grid',
        type: AppFieldTypes.COLLAPSIBLE,
        label: 'Orders',
        collapsible_config: {fields: [...rows, ...strays], expanded: true, bordered: true, layout: 'grid'},
    } as AppField);

    const twoRows = [
        row('row_r1', [cell('cell_r1_order', 'Order #'), cell('cell_r1_customer', 'Customer'), cell('cell_r1_weight', 'Weight (kg)')]),
        row('row_r2', [cell('cell_r2_order', 'Order #'), cell('cell_r2_customer', 'Customer'), cell('cell_r2_weight', 'Weight (kg)')]),
    ];

    beforeEach(async () => {
        jest.clearAllMocks();
        mockViewportWidth = 800;
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('lays the rows out as a table with a header per column', () => {
        const {getByTestId, getByText, queryByText, queryByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid(twoRows)]})}/>,
            {database, serverUrl},
        );

        expect(getByTestId('apps_form_grid.order_grid')).toBeTruthy();

        // The column headers carry the names, once each, not once per row.
        expect(getByTestId('apps_form_grid.header.cell_r1_order')).toBeTruthy();
        expect(getByTestId('apps_form_grid.header.cell_r1_customer')).toBeTruthy();
        expect(getByTestId('apps_form_grid.header.cell_r1_weight')).toBeTruthy();

        // The container itself is not a section in grid mode, and the rows'
        // own labels are not shown either — a table names its rows by data.
        expect(queryByText('Orders')).toBeNull();
        expect(queryByText('a label the table does not use')).toBeNull();
        expect(queryByTestId('interactive_dialog.collapsible.order_grid')).toBeNull();
        expect(queryByTestId('interactive_dialog.collapsible.row_r1')).toBeNull();

        // Every cell of every row is present and editable.
        expect(getByTestId('field.cell_r1_order')).toBeTruthy();
        expect(getByTestId('field.cell_r2_weight')).toBeTruthy();

        expect(getByText('Order #')).toBeTruthy();
    });

    it('keeps the first column out of the horizontal scroll so it stays visible', () => {
        const {getByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid(twoRows)]})}/>,
            {database, serverUrl},
        );

        const sticky = getByTestId('apps_form_grid.sticky_column');
        const scroll = getByTestId('apps_form_grid.scroll');

        const within = (node: {findAllByProps: Function}, testID: string) =>
            node.findAllByProps({testID}).length > 0;

        // First column pinned, the rest scrolling.
        expect(within(sticky, 'apps_form_grid.cell.cell_r1_order')).toBe(true);
        expect(within(sticky, 'apps_form_grid.cell.cell_r2_order')).toBe(true);
        expect(within(sticky, 'apps_form_grid.cell.cell_r1_weight')).toBe(false);

        expect(within(scroll, 'apps_form_grid.cell.cell_r1_customer')).toBe(true);
        expect(within(scroll, 'apps_form_grid.cell.cell_r1_weight')).toBe(true);
        expect(within(scroll, 'apps_form_grid.cell.cell_r1_order')).toBe(false);
    });

    it('blanks a cell label but keeps it for screen readers', () => {
        const {getByTestId, queryAllByText} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid(twoRows)]})}/>,
            {database, serverUrl},
        );

        // "Order #" appears as the column header, not once per row.
        expect(queryAllByText('Order #')).toHaveLength(1);
        expect(getByTestId('apps_form_grid.cell.cell_r2_order').props.accessibilityLabel).toBe('Order #');
    });

    it('pads a short row on the right instead of shifting its cells', () => {
        const shortRow = row('row_r2', [cell('cell_r2_order', 'Order #')]);
        const {getByTestId, queryByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid([twoRows[0], shortRow])]})}/>,
            {database, serverUrl},
        );

        // The one cell it has stays in the first column; the rest of the row
        // is empty rather than its cells sliding left under other headers.
        expect(getByTestId('apps_form_grid.cell.cell_r2_order')).toBeTruthy();
        expect(queryByTestId('apps_form_grid.cell.cell_r2_customer')).toBeNull();
        expect(getByTestId('apps_form_grid.header.cell_r1_customer')).toBeTruthy();
    });

    it('is as wide as the widest row, so a late extra cell is not dropped', () => {
        const longRow = row('row_r2', [
            cell('cell_r2_order', 'Order #'),
            cell('cell_r2_customer', 'Customer'),
            cell('cell_r2_weight', 'Weight (kg)'),
            cell('cell_r2_notes', 'Notes'),
        ]);

        const {getByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid([twoRows[0], longRow])]})}/>,
            {database, serverUrl},
        );

        // A cell past the first row's width is still a real field, so the
        // table grows a column for it rather than losing it.
        expect(getByTestId('apps_form_grid.header.cell_r2_notes')).toBeTruthy();
        expect(getByTestId('field.cell_r2_notes')).toBeTruthy();
    });

    it('lands a validation error in the offending cell', async () => {
        const required = {name: 'cell_r2_weight', type: AppFieldTypes.TEXT, label: 'Weight (kg)', is_required: true} as AppField;
        const rows = [
            twoRows[0],
            row('row_r2', [cell('cell_r2_order', 'Order #'), cell('cell_r2_customer', 'Customer'), required]),
        ];
        const props = getProps({fields: [grid(rows)]});

        const {getByTestId, queryByTestId} = renderWithEverything(
            <AppsFormComponent {...props}/>,
            {database, serverUrl},
        );

        await act(async () => {
            lastHeaderRight()?.().props.onPress();
        });

        expect(props.submit).not.toHaveBeenCalled();
        expect(getByTestId('apps_form_grid.cell.cell_r2_weight.error')).toBeTruthy();
        expect(queryByTestId('apps_form_grid.cell.cell_r1_weight.error')).toBeNull();
    });

    it('submits every cell flat, keyed by its own name', async () => {
        const rows = [
            row('row_r1', [
                {name: 'cell_r1_order', type: AppFieldTypes.TEXT, label: 'Order #', value: 'SO-1042'} as AppField,
                {name: 'cell_r1_weight', type: AppFieldTypes.TEXT, label: 'Weight (kg)', value: '120'} as AppField,
            ]),
            row('row_r2', [
                {name: 'cell_r2_order', type: AppFieldTypes.TEXT, label: 'Order #', value: 'SO-1043'} as AppField,
                {name: 'cell_r2_weight', type: AppFieldTypes.TEXT, label: 'Weight (kg)', value: '80'} as AppField,
            ]),
        ];
        const props = getProps({fields: [grid(rows)]});

        renderWithEverything(<AppsFormComponent {...props}/>, {database, serverUrl});

        await act(async () => {
            lastHeaderRight()?.().props.onPress();
        });

        // No container names, no row names — the table is a layout, not a shape.
        expect(props.submit).toHaveBeenCalledWith({
            cell_r1_order: 'SO-1042',
            cell_r1_weight: '120',
            cell_r2_order: 'SO-1043',
            cell_r2_weight: '80',
        });
    });

    it('edits a cell in place, in the column it belongs to', () => {
        const {getByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid(twoRows)]})}/>,
            {database, serverUrl},
        );

        fireEvent.changeText(getByTestId('field.cell_r1_order.input'), 'SO-9999');

        expect(getByTestId('field.cell_r1_order.input').props.value).toBe('SO-9999');
        expect(getByTestId('field.cell_r2_order.input').props.value).toBe('');
    });

    it('renders a non-row child after the table instead of dropping it', () => {
        const {getByTestId} = renderWithEverything(
            <AppsFormComponent
                {...getProps({
                    fields: [grid(twoRows, [{name: 'fillable_add_row', type: AppFieldTypes.BOOL, label: 'Add an order'} as AppField])],
                })}
            />,
            {database, serverUrl},
        );

        expect(getByTestId('field.fillable_add_row')).toBeTruthy();
    });

    it('falls back to plain fields when the container has no row children', () => {
        const noRows = {
            name: 'order_grid',
            type: AppFieldTypes.COLLAPSIBLE,
            label: 'Orders',
            collapsible_config: {
                fields: [cell('loose_one', 'Loose one'), cell('loose_two', 'Loose two')],
                expanded: true,
                bordered: true,
                layout: 'grid',
            },
        } as AppField;

        const {getByTestId, queryByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [noRows]})}/>,
            {database, serverUrl},
        );

        // A misconfigured grid still shows its fields rather than nothing.
        expect(getByTestId('field.loose_one')).toBeTruthy();
        expect(getByTestId('field.loose_two')).toBeTruthy();
        expect(queryByTestId('apps_form_grid.sticky_column')).toBeNull();
    });
});

describe('AppsFormComponent grid layout on a phone', () => {
    let database: Database;

    const cell = (name: string, label: string, value?: AppFormValue): AppField =>
        ({name, type: AppFieldTypes.TEXT, label, value} as AppField);

    const row = (name: string, cells: AppField[]): AppField => ({
        name,
        type: AppFieldTypes.COLLAPSIBLE,
        label: `label for ${name}`,
        collapsible_config: {fields: cells, expanded: true, bordered: true, layout: 'stacked'},
    } as AppField);

    const grid = (rows: AppField[], strays: AppField[] = []): AppField => ({
        name: 'order_grid',
        type: AppFieldTypes.COLLAPSIBLE,
        label: 'Orders',
        collapsible_config: {fields: [...rows, ...strays], expanded: true, bordered: true, layout: 'grid'},
    } as AppField);

    const twoRows = [
        row('row_r1', [cell('cell_r1_order', 'Order #', 'SO-1042'), cell('cell_r1_customer', 'Customer', 'Acme Co')]),
        row('row_r2', [cell('cell_r2_order', 'Order #', 'SO-1043'), cell('cell_r2_customer', 'Customer', 'Globex')]),
    ];

    beforeEach(async () => {
        jest.clearAllMocks();
        mockViewportWidth = 390;
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('shows the cells as values rather than inputs', () => {
        const {getByText, queryByTestId, getByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid(twoRows)]})}/>,
            {database, serverUrl},
        );

        // The table is still a table: same columns, same headers.
        expect(getByTestId('apps_form_grid.header.cell_r1_order')).toBeTruthy();
        expect(getByText('SO-1042')).toBeTruthy();
        expect(getByText('Globex')).toBeTruthy();

        // But nothing in it is focusable, which is what makes the horizontal
        // swipe unambiguous.
        expect(queryByTestId('field.cell_r1_order')).toBeNull();
        expect(queryByTestId('field.cell_r2_customer')).toBeNull();
    });

    it('shows a dash for a cell with no value', () => {
        const {getAllByText} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid([row('row_r1', [cell('cell_r1_order', 'Order #')])])]})}/>,
            {database, serverUrl},
        );

        expect(getAllByText('—').length).toBeGreaterThan(0);
    });

    it('shows the chosen option label for a select cell', () => {
        const status = {
            name: 'cell_r1_status',
            type: AppFieldTypes.STATIC_SELECT,
            label: 'Status',
            value: {label: 'Picked', value: 'picked'},
        } as unknown as AppField;

        const {getByText} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid([row('row_r1', [cell('cell_r1_order', 'Order #', 'SO-1042'), status])])]})}/>,
            {database, serverUrl},
        );

        expect(getByText('Picked')).toBeTruthy();
    });

    it('shows a date cell as a date, not as the ISO string it is stored as', () => {
        const due = {
            name: 'cell_r1_due',
            type: AppFieldTypes.DATE,
            label: 'Due',
            value: '2026-03-04',
        } as unknown as AppField;

        const {getByText, queryByText} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid([row('row_r1', [cell('cell_r1_order', 'Order #', 'SO-1042'), due])])]})}/>,
            {database, serverUrl},
        );

        expect(queryByText('2026-03-04')).toBeNull();
        expect(getByText('Mar 4, 2026')).toBeTruthy();
    });

    it('opens the row when it is tapped, with its fields labelled', () => {
        const {getByTestId, getByText} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid(twoRows)]})}/>,
            {database, serverUrl},
        );

        fireEvent.press(getByTestId('apps_form_grid.row.row_r2.sticky'));

        expect(getByTestId('apps_form_row_detail.row_r2')).toBeTruthy();

        // The row's own fields, rendered the way any other field is — so they
        // keep the labels the table had to drop.
        expect(getByTestId('field.cell_r2_order')).toBeTruthy();
        expect(getByTestId('field.cell_r2_customer')).toBeTruthy();

        // The row it is not is not on screen.
        expect(getByText('SO-1043')).toBeTruthy();
    });

    it('titles the row by its first cell, and renames as that cell is typed', () => {
        const {getByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid(twoRows)]})}/>,
            {database, serverUrl},
        );

        fireEvent.press(getByTestId('apps_form_grid.row.row_r1.sticky'));
        expect(getByTestId('apps_form_row_detail.title').props.children).toBe('SO-1042');

        fireEvent.changeText(getByTestId('field.cell_r1_order.input'), 'SO-9999');
        expect(getByTestId('apps_form_row_detail.title').props.children).toBe('SO-9999');
    });

    it('falls back to the row label while the first cell is empty', () => {
        const {getByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid([row('row_r1', [cell('cell_r1_order', 'Order #')])])]})}/>,
            {database, serverUrl},
        );

        fireEvent.press(getByTestId('apps_form_grid.row.row_r1.sticky'));

        expect(getByTestId('apps_form_row_detail.title').props.children).toBe('label for row_r1');
    });

    it('hides the rest of the dialog while a row is open, and brings it back', () => {
        const stray = {name: 'fillable_add_row', type: AppFieldTypes.BOOL, label: 'Add an order'} as AppField;
        const {getByTestId, queryByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid(twoRows, [stray])]})}/>,
            {database, serverUrl},
        );

        expect(getByTestId('field.fillable_add_row')).toBeTruthy();

        fireEvent.press(getByTestId('apps_form_grid.row.row_r1.sticky'));

        // One row at a time: the table and the dialog's own fields step aside.
        expect(queryByTestId('apps_form_grid.order_grid')).toBeNull();
        expect(queryByTestId('field.fillable_add_row')).toBeNull();

        fireEvent.press(getByTestId('apps_form_row_detail.back'));

        expect(getByTestId('apps_form_grid.order_grid')).toBeTruthy();
        expect(getByTestId('field.fillable_add_row')).toBeTruthy();
    });

    it('keeps what was typed in a row when the table comes back', () => {
        const {getByTestId, getByText} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid(twoRows)]})}/>,
            {database, serverUrl},
        );

        fireEvent.press(getByTestId('apps_form_grid.row.row_r1.sticky'));
        fireEvent.changeText(getByTestId('field.cell_r1_customer.input'), 'Initech');
        fireEvent.press(getByTestId('apps_form_row_detail.back'));

        expect(getByText('Initech')).toBeTruthy();
    });

    it('offers Done instead of Submit while a row is open', () => {
        const {getByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps({fields: [grid(twoRows)]})}/>,
            {database, serverUrl},
        );

        expect(lastHeaderRight()?.().props.testID).toBe('interactive_dialog.submit.button');

        fireEvent.press(getByTestId('apps_form_grid.row.row_r1.sticky'));
        expect(lastHeaderRight()?.().props.testID).toBe('interactive_dialog.row_done.button');

        fireEvent.press(getByTestId('apps_form_row_detail.back'));
        expect(lastHeaderRight()?.().props.testID).toBe('interactive_dialog.submit.button');
    });

    it('marks a row whose error may be in a column that is scrolled away', async () => {
        const required = {name: 'cell_r2_customer', type: AppFieldTypes.TEXT, label: 'Customer', is_required: true} as AppField;
        const rows = [
            twoRows[0],
            row('row_r2', [cell('cell_r2_order', 'Order #', 'SO-1043'), required]),
        ];
        const props = getProps({fields: [grid(rows)]});

        const {getByTestId} = renderWithEverything(<AppsFormComponent {...props}/>, {database, serverUrl});

        await act(async () => {
            lastHeaderRight()?.().props.onPress();
        });

        expect(props.submit).not.toHaveBeenCalled();

        const flatten = (s: object | object[]): Array<{borderLeftWidth?: number}> =>
            (Array.isArray(s) ? s.flat(Infinity).filter(Boolean) : [s]) as Array<{borderLeftWidth?: number}>;

        // The mark is on the sticky cell, the part of the row always on screen.
        expect(flatten(getByTestId('apps_form_grid.cell.cell_r2_order').props.style).
            some((e) => e?.borderLeftWidth === 3)).toBe(true);
        expect(flatten(getByTestId('apps_form_grid.cell.cell_r1_order').props.style).
            some((e) => e?.borderLeftWidth === 3)).toBe(false);
    });

    it('still submits every cell flat, from the table', async () => {
        const props = getProps({fields: [grid(twoRows)]});

        renderWithEverything(<AppsFormComponent {...props}/>, {database, serverUrl});

        await act(async () => {
            lastHeaderRight()?.().props.onPress();
        });

        expect(props.submit).toHaveBeenCalledWith({
            cell_r1_order: 'SO-1042',
            cell_r1_customer: 'Acme Co',
            cell_r2_order: 'SO-1043',
            cell_r2_customer: 'Globex',
        });
    });
});
