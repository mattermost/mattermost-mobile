// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    parsePropertyFieldAttrs,
    getPropertyFieldSortOrder,
    sortPropertyFieldsByOrder,
    formatPropertyFieldOptionsForSelector,
    getOptionNameById,
    getPropertyValueDisplay,
} from './property_fields';

import type PlaybookRunPropertyFieldModel from '@playbooks/database/models/playbook_run_attribute';
import type PlaybookRunPropertyValueModel from '@playbooks/database/models/playbook_run_attribute_value';

describe('property_fields utils', () => {
    const makeField = (overrides: Partial<PlaybookRunPropertyFieldModel> = {}): PlaybookRunPropertyFieldModel => ({
        id: 'field-id',
        groupId: 'group-id',
        name: 'Field Name',
        type: 'text',
        targetId: 'run-id',
        targetType: 'run',
        createAt: 0,
        updateAt: 0,
        deleteAt: 0,
        attrs: undefined,
        ...overrides,
    } as PlaybookRunPropertyFieldModel);

    const makeValue = (overrides: Partial<PlaybookRunPropertyValueModel> = {}): PlaybookRunPropertyValueModel => ({
        id: 'value-id',
        attributeId: 'field-id',
        runId: 'run-id',
        value: '',
        updateAt: 0,
        ...overrides,
    } as PlaybookRunPropertyValueModel);

    test('parsePropertyFieldAttrs parses valid JSON', () => {
        const json = JSON.stringify({
            options: [{id: '1', name: 'One'}],
            parent_id: 'p',
            sort_order: 2,
            value_type: 'text',
            visibility: 'when_set',
        });
        const parsed = parsePropertyFieldAttrs(json);
        expect(parsed).toEqual({
            options: [{id: '1', name: 'One'}],
            parent_id: 'p',
            sort_order: 2,
            value_type: 'text',
        });
    });

    test('parsePropertyFieldAttrs handles invalid/missing JSON', () => {
        expect(parsePropertyFieldAttrs(undefined)).toBeNull();
        expect(parsePropertyFieldAttrs('not-json')).toBeNull();
        expect(parsePropertyFieldAttrs(JSON.stringify('string'))).toBeNull();
    });

    test('getPropertyFieldSortOrder defaults to 999', () => {
        const field = makeField();
        expect(getPropertyFieldSortOrder(field)).toBe(999);
    });

    test('getPropertyFieldSortOrder reads sort_order from attrs', () => {
        const field = makeField({attrs: JSON.stringify({sort_order: 5})});
        expect(getPropertyFieldSortOrder(field)).toBe(5);
    });

    test('sortPropertyFieldsByOrder sorts by sort_order with default last', () => {
        const a = makeField({attrs: JSON.stringify({sort_order: 10}), name: 'a'} as any);
        const b = makeField({attrs: JSON.stringify({sort_order: 1}), name: 'b'} as any);
        const c = makeField({name: 'c'} as any);
        const sorted = sortPropertyFieldsByOrder([a, b, c]);
        expect(sorted).toEqual([b, a, c]);
    });

    test('formatPropertyFieldOptionsForSelector returns formatted options for select', () => {
        const field = makeField({
            type: 'select',
            attrs: JSON.stringify({options: [{id: 'id1', name: 'Name 1'}]}),
        });
        expect(formatPropertyFieldOptionsForSelector(field)).toEqual([
            {text: 'Name 1', value: 'id1'},
        ]);
    });

    test('formatPropertyFieldOptionsForSelector returns [] for non-select or missing options', () => {
        const textField = makeField({type: 'text'});
        const selectNoOptions = makeField({type: 'select', attrs: JSON.stringify({})});
        expect(formatPropertyFieldOptionsForSelector(textField)).toEqual([]);
        expect(formatPropertyFieldOptionsForSelector(selectNoOptions)).toEqual([]);
    });

    test('getOptionNameById returns name or falls back to id', () => {
        const options = [{id: 'x', name: 'Ex'}];
        expect(getOptionNameById(options, 'x')).toBe('Ex');
        expect(getOptionNameById(options, 'y')).toBe('y');
    });

    test('getPropertyValueDisplay returns text for text fields', () => {
        const field = makeField({type: 'text'});
        const value = makeValue({value: 'hello'});
        expect(getPropertyValueDisplay(field, value)).toBe('hello');
    });

    test('getPropertyValueDisplay maps select id to name and falls back to id', () => {
        const field = makeField({
            type: 'select',
            attrs: JSON.stringify({options: [{id: 'id1', name: 'Name 1'}]}),
        });
        expect(getPropertyValueDisplay(field, makeValue({value: 'id1'}))).toBe('Name 1');
        expect(getPropertyValueDisplay(field, makeValue({value: 'unknown'}))).toBe('unknown');
    });

    test('getPropertyValueDisplay formats multiselect as comma-separated names', () => {
        const field = makeField({
            type: 'multiselect',
            attrs: JSON.stringify({options: [
                {id: 'a', name: 'Alpha'},
                {id: 'b', name: 'Beta'},
            ]}),
        });
        const value = makeValue({value: JSON.stringify(['a', 'b'])});
        expect(getPropertyValueDisplay(field, value)).toBe('Alpha, Beta');
    });

    test('getPropertyValueDisplay handles multiselect fallbacks and empty', () => {
        const field = makeField({type: 'multiselect', attrs: JSON.stringify({options: []})});
        expect(getPropertyValueDisplay(field, makeValue({value: ''}))).toBe('');

        // Comma string fallback
        expect(getPropertyValueDisplay(field, makeValue({value: 'x,y'}))).toBe('x, y');
    });
});

