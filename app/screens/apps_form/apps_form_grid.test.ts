// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppFieldTypes} from '@constants/apps';

import {displayCellValue} from './apps_form_grid';

describe('displayCellValue', () => {
    const textField = {name: 'f', type: AppFieldTypes.TEXT} as AppField;

    it('renders an empty string for empty-ish values so the cell shows its own dash', () => {
        expect(displayCellValue(textField, undefined)).toBe('');
        expect(displayCellValue(textField, null as unknown as AppFormValue)).toBe('');
        expect(displayCellValue(textField, false)).toBe('');
        expect(displayCellValue(textField, '')).toBe('');
    });

    it('masks a password value rather than showing it in the overview', () => {
        const passwordField = {name: 'secret', type: AppFieldTypes.TEXT, subtype: 'password'} as AppField;
        expect(displayCellValue(passwordField, 'hunter2')).toBe('••••••');
    });

    it('formats a date value through moment instead of showing the raw string', () => {
        const dateField = {name: 'due', type: AppFieldTypes.DATE, datetime_config: {location_timezone: 'UTC'}} as AppField;
        const result = displayCellValue(dateField, '2026-01-15');
        expect(result).toContain('2026');
        expect(result).not.toBe('2026-01-15');
    });

    it('joins a multiselect array into its option labels', () => {
        const value = [{label: 'Line 1', value: 'l1'}, {label: 'Line 2', value: 'l2'}] as AppFormValue;
        expect(displayCellValue(textField, value)).toBe('Line 1, Line 2');
    });

    it('shows the label of a single resolved select option', () => {
        const value = {label: 'Shipped', value: 'shipped'} as AppFormValue;
        expect(displayCellValue(textField, value)).toBe('Shipped');
    });

    it('resolves a primitive select value to its option label', () => {
        const selectField = {name: 'status', type: AppFieldTypes.STATIC_SELECT, options: [{label: 'Shipped', value: 'shipped'}]} as AppField;
        expect(displayCellValue(selectField, 'shipped')).toBe('Shipped');
    });

    it('falls back to the raw value for a select value with no matching option', () => {
        const selectField = {name: 'status', type: AppFieldTypes.STATIC_SELECT, options: [{label: 'Shipped', value: 'shipped'}]} as AppField;
        expect(displayCellValue(selectField, 'unknown')).toBe('unknown');
    });

    it('stringifies a plain value', () => {
        expect(displayCellValue(textField, 'SO-1042')).toBe('SO-1042');
        expect(displayCellValue(textField, 42 as unknown as AppFormValue)).toBe('42');
    });
});
