// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React, {useEffect, useReducer} from 'react';

import {AppFieldTypes} from '@constants/apps';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';

import AppsFormComponent from './apps_form_component';

import type {Database} from '@nozbe/watermelondb';

// The default submit action is registered in the modal header via
// navigation.setOptions({headerRight: ...}) rather than rendered inline. Override
// the global expo-router mock (test/setup.ts) so setOptions calls are captured.
// Subscribers are notified on every setOptions call so a test harness can render
// the latest headerRight in the SAME render tree as the component (fireEvent gets
// confused across multiple concurrent RTL render roots).
type HeaderOptions = {headerRight?: () => React.ReactNode};
const headerListeners = new Set<() => void>();
const mockSetOptions = jest.fn<void, [HeaderOptions?]>(() => {
    headerListeners.forEach((l) => l());
});
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

jest.mock('@screens/navigation', () => ({
    navigateBack: jest.fn(),
}));

jest.mock('@actions/remote/command', () => ({
    handleGotoLocation: jest.fn(),
}));

// Remove the double-tap debounce so a test can collapse and re-expand the *same*
// section header within one synchronous run (usePreventDoubleTap keys off real
// wall-clock time, which does not advance between fireEvent calls).
jest.mock('@hooks/utils', () => {
    const actual = jest.requireActual('@hooks/utils');
    return {
        ...actual,
        usePreventDoubleTap: (cb: Function) => cb,
    };
});

// Rich stand-in for AppsFormField. Each field renders:
//   - a Text node "FIELD:<name>:<value>" (testID mockfield.<name>) so we can read
//     the current value and assert render order,
//   - an "edit" Pressable that emits a type-appropriate onChange,
//   - a "lookup" Pressable that calls performLookup for the field.
// A field only mounts when its enclosing section is expanded, so presence/absence
// of these nodes is a faithful proxy for mount state.
jest.mock('./apps_form_field', () => {
    const React2 = require('react');
    const {Pressable, Text, View} = require('react-native');

    const editValueFor = (field: any) => {
        if (field.type === 'bool') {
            return true;
        }
        if (field.type === 'static_select' || field.type === 'dynamic_select') {
            return {label: 'Chosen', value: 'chosen'};
        }
        return `EDITED_${field.name}`;
    };

    const MockField = ({field, name, value, errorText, onChange, performLookup}: any) => {
        const display = value && typeof value === 'object' ? JSON.stringify(value) : String(value);
        return React2.createElement(View, {testID: `mockfield.${name}.wrap`}, [
            React2.createElement(Text, {key: 'v', testID: `mockfield.${name}`}, `FIELD:${name}:${display}`),
            errorText ? React2.createElement(Text, {key: 'e', testID: `mockfield.${name}.error`}, String(errorText)) : null,
            React2.createElement(Pressable, {key: 'ed', testID: `edit.${name}`, onPress: () => onChange(name, editValueFor(field))}, React2.createElement(Text, null, 'edit')),
            React2.createElement(Pressable, {key: 'lk', testID: `lookup.${name}`, onPress: () => performLookup(name, 'q')}, React2.createElement(Text, null, 'lookup')),
        ]);
    };

    return {__esModule: true, default: MockField};
});

const serverUrl = 'http://localhost:8065';

const okSubmit = () => jest.fn().mockResolvedValue({data: {type: 'ok'}});

function getProps(form: Partial<AppForm> = {}, overrides: Partial<{submit: jest.Mock; refreshOnSelect: jest.Mock; performLookupCall: jest.Mock}> = {}) {
    return {
        form: {
            title: 'Test',
            fields: [],
            ...form,
        } as AppForm,
        submit: overrides.submit || okSubmit(),
        performLookupCall: overrides.performLookupCall || jest.fn().mockResolvedValue({data: {type: 'ok', data: {items: []}}}),
        refreshOnSelect: overrides.refreshOnSelect || jest.fn().mockResolvedValue({data: {type: 'form'}}),
    };
}

// Field factory helpers keep the deeply-nested structures readable.
const text = (name: string, extra: Partial<AppField> = {}): AppField => ({name, type: AppFieldTypes.TEXT, label: name, ...extra} as AppField);
const section = (name: string, fields: AppField[], config: Partial<NonNullable<AppField['collapsible_config']>> = {}): AppField => ({
    name,
    label: name,
    type: AppFieldTypes.COLLAPSIBLE,
    collapsible_config: {expanded: true, bordered: true, fields, ...config},
} as AppField);

const expandedState = (node: any) => node.props.accessibilityState?.expanded;
const fieldNames = (nodes: any[]) => nodes.map((n) => String(n.props.children).split(':')[1]);

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

// Renders the AppsFormComponent together with a live slot that mirrors whatever
// the component registers as the modal header's `headerRight`. The slot re-renders
// on every setOptions call, so it always reflects the latest handleSubmit closure
// (and thus the current form values). Rendering the header in the SAME tree as the
// component is essential: fireEvent cannot reliably dispatch across separate RTL
// render roots.
const HeaderSlot = () => {
    const [, forceUpdate] = useReducer((n) => n + 1, 0);
    useEffect(() => {
        headerListeners.add(forceUpdate);

        // The component's setOptions effect runs before this slot's effect on the
        // initial mount, so pull the freshly-registered headerRight once here.
        forceUpdate();
        return () => {
            headerListeners.delete(forceUpdate);
        };
    }, []);
    const headerRight = getHeaderSubmit();
    return <>{headerRight ? headerRight() : null}</>;
};

const FormWithHeader = (props: React.ComponentProps<typeof AppsFormComponent>) => (
    <>
        <AppsFormComponent {...props}/>
        <HeaderSlot/>
    </>
);

// Presses the header submit button rendered by the harness above. Call AFTER any
// body interactions so the latest closure (and values) are used.
const submitViaHeader = async (getByTestId: (id: string) => any) => {
    await act(async () => {
        pressSubmit(getByTestId('interactive_dialog.submit.button'));
        await new Promise((r) => setImmediate(r));
    });
};

describe('AppsFormComponent — recursive collapsible rendering', () => {
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

    const render = (form: Partial<AppForm>) => renderWithEverything(<FormWithHeader {...getProps(form)}/>, {database, serverUrl});

    it('mounts every leaf across three expanded nesting levels', () => {
        const form = {
            fields: [
                section('outer', [
                    text('f_outer'),
                    section('inner', [
                        text('f_inner'),
                        section('deep', [text('f_deep')]),
                    ]),
                ]),
            ],
        };

        const {getByTestId} = render(form);

        expect(getByTestId('mockfield.f_outer')).toBeTruthy();
        expect(getByTestId('mockfield.f_inner')).toBeTruthy();
        expect(getByTestId('mockfield.f_deep')).toBeTruthy();
    });

    it('honors each section\'s own initial expanded/collapsed state', () => {
        const form = {
            fields: [
                section('outer', [
                    text('f_outer'),
                    section('inner', [text('f_inner')], {expanded: false}),
                ]),
            ],
        };

        const {getByTestId, queryByTestId, getByLabelText} = render(form);

        // Outer is expanded: its own field and the inner header are present...
        expect(getByTestId('mockfield.f_outer')).toBeTruthy();
        expect(getByLabelText('inner')).toBeTruthy();

        // ...but inner started collapsed, so its child is not mounted.
        expect(queryByTestId('mockfield.f_inner')).toBeNull();
        expect(expandedState(getByLabelText('inner'))).toBe(false);
    });

    it('does not mount descendants of a collapsed ancestor', () => {
        const form = {
            fields: [
                section('outer', [text('f_outer'), section('inner', [text('f_inner')])], {expanded: false}),
            ],
        };

        const {queryByTestId, getByLabelText, queryByLabelText} = render(form);

        expect(getByLabelText('outer')).toBeTruthy();
        expect(queryByTestId('mockfield.f_outer')).toBeNull();
        expect(queryByTestId('mockfield.f_inner')).toBeNull();

        // The inner header itself is a descendant of the collapsed outer, so it is absent too.
        expect(queryByLabelText('inner')).toBeNull();
    });

    it('reveals a deeper level only after its intermediate ancestor is expanded', () => {
        const form = {
            fields: [
                section('outer', [
                    section('inner', [text('f_inner')], {expanded: false}),
                ]),
            ],
        };

        const {queryByTestId, getByLabelText} = render(form);

        expect(queryByTestId('mockfield.f_inner')).toBeNull();

        fireEvent.press(getByLabelText('inner'));

        expect(queryByTestId('mockfield.f_inner')).toBeTruthy();
    });

    it('expanding an outer section does not force-open a child that started collapsed', () => {
        const form = {
            fields: [
                section('outer', [
                    text('f_outer'),
                    section('inner', [text('f_inner')], {expanded: false}),
                ], {expanded: false}),
            ],
        };

        const {getByLabelText, queryByTestId} = render(form);

        fireEvent.press(getByLabelText('outer'));

        // Outer is now open and mounts the inner header, but inner must keep its own
        // collapsed state — expanding a parent is not an implicit expand-all.
        expect(getByLabelText('inner')).toBeTruthy();
        expect(expandedState(getByLabelText('inner'))).toBe(false);
        expect(queryByTestId('mockfield.f_inner')).toBeNull();
    });

    it('resets a child to its configured initial state when the parent is collapsed and reopened (content remounts)', () => {
        const form = {
            fields: [
                section('outer', [
                    section('inner', [text('f_inner')], {expanded: true}),
                ], {expanded: true}),
            ],
        };

        const {getByLabelText, queryByTestId} = render(form);

        // User collapses the inner section.
        fireEvent.press(getByLabelText('inner'));
        expect(queryByTestId('mockfield.f_inner')).toBeNull();

        // Collapse then reopen the outer section: inner unmounts and remounts, so it
        // returns to its initiallyExpanded=true state rather than the user's collapse.
        fireEvent.press(getByLabelText('outer'));
        fireEvent.press(getByLabelText('outer'));

        expect(queryByTestId('mockfield.f_inner')).toBeTruthy();
    });

    it('keeps sibling sections independent when one is collapsed', () => {
        const form = {
            fields: [
                section('sec_a', [text('a1')], {expanded: true}),
                section('sec_b', [text('b1')], {expanded: true}),
            ],
        };

        const {getByLabelText, getByTestId, queryByTestId} = render(form);

        fireEvent.press(getByLabelText('sec_a'));

        expect(queryByTestId('mockfield.a1')).toBeNull();
        expect(getByTestId('mockfield.b1')).toBeTruthy();
        expect(expandedState(getByLabelText('sec_b'))).toBe(true);
    });

    it('preserves the ordering of fields before, between, and after collapsible sections', () => {
        const form = {
            fields: [
                text('before'),
                section('sec_1', [text('s1a'), text('s1b')]),
                text('between'),
                section('sec_2', [text('s2a')]),
                text('after'),
            ],
        };

        const {getAllByText} = render(form);

        expect(fieldNames(getAllByText(/^FIELD:/))).toEqual(
            ['before', 's1a', 's1b', 'between', 's2a', 'after'],
        );
    });
});

describe('AppsFormComponent — validation auto-expansion', () => {
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

    // The submit button now lives in the modal header, rendered by FormWithHeader's
    // HeaderSlot in the same tree. Press it via the render's getByTestId.
    const submitForm = async (getByTestId: (id: string) => any) => {
        await submitViaHeader(getByTestId);
    };

    it('blocks submit and does not call submit when a required field inside a collapsed section is empty', async () => {
        const submit = okSubmit();
        const form = {
            fields: [
                section('advanced', [text('reason', {is_required: true})], {expanded: false}),
            ],
        };

        const {getByTestId} = renderWithEverything(
            <FormWithHeader {...getProps(form, {submit})}/>, {database, serverUrl},
        );

        await submitForm(getByTestId);

        // A collapsed section must not hide its required child from validation.
        expect(submit).not.toHaveBeenCalled();
    });

    it('auto-expands an intermediate section so a deeply nested required field becomes reachable', async () => {
        const submit = okSubmit();
        const form = {
            fields: [
                section('outer', [
                    section('inner', [text('deep', {is_required: true})], {expanded: false}),
                ], {expanded: true}),
            ],
        };

        const {getByTestId, getByLabelText, queryByTestId} = renderWithEverything(
            <FormWithHeader {...getProps(form, {submit})}/>, {database, serverUrl},
        );

        expect(expandedState(getByLabelText('inner'))).toBe(false);

        await submitForm(getByTestId);

        // Outer was already open, so the inner section is mounted and observes its
        // version bump — it opens and the offending field mounts.
        expect(submit).not.toHaveBeenCalled();
        expect(expandedState(getByLabelText('inner'))).toBe(true);
        expect(queryByTestId('mockfield.deep')).toBeTruthy();
    });

    it('expands multiple errored sections while leaving an error-free section untouched', async () => {
        const submit = okSubmit();
        const form = {
            fields: [
                section('sec_a', [text('a_req', {is_required: true})], {expanded: false}),
                section('sec_b', [text('b_req', {is_required: true})], {expanded: false}),
                section('sec_clean', [text('c_opt')], {expanded: false}),
            ],
        };

        const {getByTestId, getByLabelText} = renderWithEverything(
            <FormWithHeader {...getProps(form, {submit})}/>, {database, serverUrl},
        );

        await submitForm(getByTestId);

        expect(submit).not.toHaveBeenCalled();
        expect(expandedState(getByLabelText('sec_a'))).toBe(true);
        expect(expandedState(getByLabelText('sec_b'))).toBe(true);

        // The clean section has no errored descendant, so it stays as the user left it.
        expect(expandedState(getByLabelText('sec_clean'))).toBe(false);
    });

    it('does not expand an unrelated collapsed section when only a top-level field errors', async () => {
        const submit = okSubmit();
        const form = {
            fields: [
                text('top_req', {is_required: true}),
                section('optional_section', [text('note')], {expanded: false}),
            ],
        };

        const {getByTestId, getByLabelText} = renderWithEverything(
            <FormWithHeader {...getProps(form, {submit})}/>, {database, serverUrl},
        );

        await submitForm(getByTestId);

        expect(submit).not.toHaveBeenCalled();
        expect(expandedState(getByLabelText('optional_section'))).toBe(false);
    });

    it('keeps an already-expanded errored section expanded and blocks submit', async () => {
        const submit = okSubmit();
        const form = {
            fields: [
                section('visible', [text('reason', {is_required: true})], {expanded: true}),
            ],
        };

        const {getByTestId, getByLabelText} = renderWithEverything(
            <FormWithHeader {...getProps(form, {submit})}/>, {database, serverUrl},
        );

        await submitForm(getByTestId);

        expect(submit).not.toHaveBeenCalled();
        expect(expandedState(getByLabelText('visible'))).toBe(true);
    });

    it('re-expands a section on a repeated invalid submit after the user collapses it again', async () => {
        const submit = okSubmit();
        const form = {
            fields: [
                section('advanced', [text('reason', {is_required: true})], {expanded: false}),
            ],
        };

        const {getByTestId, getByLabelText} = renderWithEverything(
            <FormWithHeader {...getProps(form, {submit})}/>, {database, serverUrl},
        );

        // First invalid submit opens the section (expanded -> plain label).
        await submitForm(getByTestId);
        expect(expandedState(getByLabelText('advanced'))).toBe(true);

        // User collapses it again. Once collapsed with a live error, the header's
        // a11y label gains the "contains an error" annotation.
        fireEvent.press(getByLabelText('advanced'));
        expect(expandedState(getByLabelText('advanced, contains an error'))).toBe(false);

        // A second invalid submit must re-open it (version increments rather than
        // reacting only to presence) — label reverts to plain once expanded.
        await submitForm(getByTestId);
        expect(expandedState(getByLabelText('advanced'))).toBe(true);
    });

    it('submits once the required nested field is filled, and resets to the OK path', async () => {
        const submit = okSubmit();
        const form = {
            fields: [
                section('advanced', [text('reason', {is_required: true})], {expanded: true}),
            ],
        };

        const {getByTestId} = renderWithEverything(
            <FormWithHeader {...getProps(form, {submit})}/>, {database, serverUrl},
        );

        // Fill the required field via the field's edit affordance.
        fireEvent.press(getByTestId('edit.reason'));

        await submitForm(getByTestId);

        expect(submit).toHaveBeenCalledTimes(1);
        expect(submit.mock.calls[0][0]).toMatchObject({reason: 'EDITED_reason'});
    });

    it('expands the ancestor section when the server returns a field error for a nested field', async () => {
        // Server-side validation error (not client required-field validation).
        const submit = jest.fn().mockResolvedValue({
            error: {text: '', data: {errors: {deep_reason: 'Server rejected this'}}},
        });
        const form = {
            fields: [
                section('server_section', [text('deep_reason')], {expanded: false}),
            ],
        };

        const {getByTestId, getByLabelText} = renderWithEverything(
            <FormWithHeader {...getProps(form, {submit})}/>, {database, serverUrl},
        );

        await submitForm(getByTestId);

        expect(submit).toHaveBeenCalledTimes(1);
        expect(expandedState(getByLabelText('server_section'))).toBe(true);
    });
});

describe('AppsFormComponent — nested onChange and lookup discovery', () => {
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

    it('routes onChange to a text field nested inside a collapsible', () => {
        const form = {fields: [section('sec', [text('nested_text')])]};

        const {getByTestId} = renderWithEverything(<FormWithHeader {...getProps(form)}/>, {database, serverUrl});

        fireEvent.press(getByTestId('edit.nested_text'));

        expect(getByTestId('mockfield.nested_text').props.children).toBe('FIELD:nested_text:EDITED_nested_text');
    });

    it('routes onChange to a bool field nested inside a collapsible', () => {
        const form = {fields: [section('sec', [{name: 'nested_bool', type: AppFieldTypes.BOOL, label: 'b'} as AppField])]};

        const {getByTestId} = renderWithEverything(<FormWithHeader {...getProps(form)}/>, {database, serverUrl});

        fireEvent.press(getByTestId('edit.nested_bool'));

        expect(getByTestId('mockfield.nested_bool').props.children).toBe('FIELD:nested_bool:true');
    });

    it('routes onChange to a select field nested inside a collapsible', () => {
        const form = {fields: [section('sec', [{name: 'nested_sel', type: AppFieldTypes.STATIC_SELECT, label: 's', options: [{label: 'Chosen', value: 'chosen'}]} as AppField])]};

        const {getByTestId} = renderWithEverything(<FormWithHeader {...getProps(form)}/>, {database, serverUrl});

        fireEvent.press(getByTestId('edit.nested_sel'));

        expect(getByTestId('mockfield.nested_sel').props.children).toBe(`FIELD:nested_sel:${JSON.stringify({label: 'Chosen', value: 'chosen'})}`);
    });

    it('routes onChange to a deeply nested field and updates the correct value', () => {
        const form = {fields: [section('outer', [section('inner', [text('deep')])])]};

        const {getByTestId} = renderWithEverything(<FormWithHeader {...getProps(form)}/>, {database, serverUrl});

        fireEvent.press(getByTestId('edit.deep'));

        expect(getByTestId('mockfield.deep').props.children).toBe('FIELD:deep:EDITED_deep');
    });

    it('invokes the refresh path for a refresh-enabled nested field', () => {
        const refreshOnSelect = jest.fn().mockResolvedValue({data: {type: 'form'}});
        const form = {fields: [section('sec', [text('refresher', {refresh: true})])]};

        const {getByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps(form, {refreshOnSelect})}/>, {database, serverUrl},
        );

        fireEvent.press(getByTestId('edit.refresher'));

        expect(refreshOnSelect).toHaveBeenCalledTimes(1);
        expect(refreshOnSelect.mock.calls[0][0]).toMatchObject({name: 'refresher', refresh: true});
    });

    it('resolves a lookup for a field nested inside a collapsible', () => {
        const performLookupCall = jest.fn().mockResolvedValue({data: {type: 'ok', data: {items: []}}});
        const form = {fields: [section('sec', [{name: 'nested_lookup', type: AppFieldTypes.DYNAMIC_SELECT, label: 'l'} as AppField])]};

        const {getByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps(form, {performLookupCall})}/>, {database, serverUrl},
        );

        fireEvent.press(getByTestId('lookup.nested_lookup'));

        expect(performLookupCall).toHaveBeenCalledTimes(1);
        expect(performLookupCall.mock.calls[0][0]).toMatchObject({name: 'nested_lookup'});
        expect(performLookupCall.mock.calls[0][2]).toBe('q');
    });

    it('resolves a lookup for a deeply nested field', () => {
        const performLookupCall = jest.fn().mockResolvedValue({data: {type: 'ok', data: {items: []}}});
        const form = {fields: [section('outer', [section('inner', [{name: 'deep_lookup', type: AppFieldTypes.DYNAMIC_SELECT, label: 'l'} as AppField])])]};

        const {getByTestId} = renderWithEverything(
            <AppsFormComponent {...getProps(form, {performLookupCall})}/>, {database, serverUrl},
        );

        fireEvent.press(getByTestId('lookup.deep_lookup'));

        expect(performLookupCall).toHaveBeenCalledTimes(1);
        expect(performLookupCall.mock.calls[0][0]).toMatchObject({name: 'deep_lookup'});
    });
});

describe('AppsFormComponent — submit_buttons inside collapsible structures', () => {
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

    const buttonsField = (name: string): AppField => ({
        name,
        type: AppFieldTypes.STATIC_SELECT,
        options: [
            {label: 'Approve', value: 'approve'},
            {label: 'Reject', value: 'reject'},
        ],
    } as AppField);

    it('discovers a submit_buttons field nested inside a collapsible and renders its options', () => {
        const form: Partial<AppForm> = {
            submit_buttons: 'action',
            fields: [section('actions', [buttonsField('action')])],
        };

        const {getByText} = renderWithEverything(<FormWithHeader {...getProps(form)}/>, {database, serverUrl});

        expect(getByText('Approve')).toBeTruthy();
        expect(getByText('Reject')).toBeTruthy();

        // Custom buttons replace the fallback Submit, so no header button is registered.
        expect(getHeaderSubmit()).toBeUndefined();
    });

    it('discovers a submit_buttons field nested inside a deeper collapsible', () => {
        const form: Partial<AppForm> = {
            submit_buttons: 'action',
            fields: [section('outer', [section('inner', [buttonsField('action')])])],
        };

        const {getByText} = renderWithEverything(<FormWithHeader {...getProps(form)}/>, {database, serverUrl});

        expect(getByText('Approve')).toBeTruthy();
        expect(getHeaderSubmit()).toBeUndefined();
    });

    it('falls back to the Submit button when the nested submit_buttons field has no options', () => {
        const form: Partial<AppForm> = {
            submit_buttons: 'action',
            fields: [section('actions', [{name: 'action', type: AppFieldTypes.STATIC_SELECT, options: []} as AppField, text('other')])],
        };

        renderWithEverything(<FormWithHeader {...getProps(form)}/>, {database, serverUrl});

        const headerRight = getHeaderSubmit();
        expect(headerRight).toBeTruthy();

        const {getByTestId} = renderWithEverything(<>{headerRight!()}</>, {database, serverUrl});
        expect(getByTestId('interactive_dialog.submit.button')).toBeTruthy();
    });

    it('does not render the submit_buttons field as an ordinary field, and drops a section that only holds it', () => {
        const form: Partial<AppForm> = {
            submit_buttons: 'action',
            fields: [section('actions', [buttonsField('action')])],
        };

        const {queryByTestId, queryByLabelText} = renderWithEverything(<FormWithHeader {...getProps(form)}/>, {database, serverUrl});

        // The button field is not rendered as a normal AppsFormField...
        expect(queryByTestId('mockfield.action')).toBeNull();

        // ...and the now-empty section header is gone.
        expect(queryByLabelText('actions')).toBeNull();
    });

    it('keeps ordinary fields visible in a section that also contains the submit_buttons field', () => {
        const form: Partial<AppForm> = {
            submit_buttons: 'action',
            fields: [section('mixed', [text('note'), buttonsField('action')])],
        };

        const {getByTestId, getByLabelText, queryByTestId} = renderWithEverything(<FormWithHeader {...getProps(form)}/>, {database, serverUrl});

        expect(getByLabelText('mixed')).toBeTruthy();
        expect(getByTestId('mockfield.note')).toBeTruthy();
        expect(queryByTestId('mockfield.action')).toBeNull();
    });

    it('submits the chosen button value when a nested option button is pressed', async () => {
        const submit = okSubmit();
        const form: Partial<AppForm> = {
            submit_buttons: 'action',
            fields: [section('actions', [buttonsField('action')]), text('title')],
        };

        const {getByText} = renderWithEverything(<FormWithHeader {...getProps(form, {submit})}/>, {database, serverUrl});

        await act(async () => {
            fireEvent.press(getByText('Reject'));
        });

        expect(submit).toHaveBeenCalledTimes(1);
        expect(submit.mock.calls[0][0].action).toBe('reject');
    });
});

describe('AppsFormComponent — submission payload integrity', () => {
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

    it('includes every leaf value exactly once and excludes collapsible container names', async () => {
        const submit = okSubmit();
        const form: Partial<AppForm> = {
            fields: [
                text('top', {value: 'T'}),
                section('expanded_sec', [
                    {name: 'flag', type: AppFieldTypes.BOOL, label: 'flag'} as AppField, // no value -> false
                    text('empty'), // no value -> ''
                ], {expanded: true}),
                section('collapsed_sec', [
                    {name: 'sel', type: AppFieldTypes.STATIC_SELECT, label: 'sel', value: 'opt1', options: [{label: 'Opt1', value: 'opt1'}]} as AppField,
                    section('nested', [text('deep', {value: 'D'})]),
                ], {expanded: false}),
            ],
        };

        const {getByTestId} = renderWithEverything(<FormWithHeader {...getProps(form, {submit})}/>, {database, serverUrl});

        await submitViaHeader(getByTestId);

        expect(submit).toHaveBeenCalledTimes(1);

        // Exact match: guards against both missing leaves and stray container keys.
        expect(submit.mock.calls[0][0]).toEqual({
            top: 'T',
            flag: false,
            empty: '',
            sel: 'opt1',
            deep: 'D',
        });
    });
});

describe('AppsFormComponent — refresh value preservation (valuesReducer merge)', () => {
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

    it('preserves user edits for fields the refreshed form no longer supplies, overwrites re-supplied ones, and initializes new fields', async () => {
        const submit = okSubmit();
        const props = getProps({fields: [text('a'), text('b'), text('r', {refresh: true})]}, {submit});

        const {getByTestId, rerender} = renderWithEverything(<FormWithHeader {...props}/>, {database, serverUrl});

        // 1. User edits field A.
        fireEvent.press(getByTestId('edit.a'));
        expect(getByTestId('mockfield.a').props.children).toBe('FIELD:a:EDITED_a');

        // 2. A refresh arrives as a new form object: A is dropped, B is re-supplied
        //    with a server value, and a brand-new field C is added.
        const refreshed = getProps({
            fields: [text('b', {value: 'server_b'}), text('c'), text('r', {refresh: true})],
        }, {submit});
        rerender(<FormWithHeader {...refreshed}/>);

        await submitViaHeader(getByTestId);

        const payload = submit.mock.calls[0][0];

        // A was not re-supplied by the refresh, so the user's edit survives.
        expect(payload.a).toBe('EDITED_a');

        // B was re-supplied with a server value, which wins.
        expect(payload.b).toBe('server_b');

        // C is a newly-added field, initialized to empty string.
        expect(payload.c).toBe('');
    });

    it('preserves a user-edited field nested in a section that a refresh removes entirely', async () => {
        const submit = okSubmit();
        const props = getProps({fields: [text('keep'), section('sec', [text('nested')], {expanded: true})]}, {submit});

        const {getByTestId, rerender} = renderWithEverything(<FormWithHeader {...props}/>, {database, serverUrl});

        fireEvent.press(getByTestId('edit.nested'));
        expect(getByTestId('mockfield.nested').props.children).toBe('FIELD:nested:EDITED_nested');

        // Refreshed form drops the whole section.
        const refreshed = getProps({fields: [text('keep')]}, {submit});
        rerender(<FormWithHeader {...refreshed}/>);

        await submitViaHeader(getByTestId);

        expect(submit.mock.calls[0][0].nested).toBe('EDITED_nested');
    });

    it('initializes fields (including nested ones) added by a refreshed form', async () => {
        const submit = okSubmit();
        const props = getProps({fields: [text('a')]}, {submit});

        const {getByTestId, rerender} = renderWithEverything(<FormWithHeader {...props}/>, {database, serverUrl});

        const refreshed = getProps({
            fields: [
                text('a'),
                section('new_sec', [text('new_nested', {value: 'seeded'})], {expanded: true}),
            ],
        }, {submit});
        rerender(<FormWithHeader {...refreshed}/>);

        await submitViaHeader(getByTestId);

        expect(submit.mock.calls[0][0].new_nested).toBe('seeded');
    });
});
