// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppFieldTypes} from '@constants/apps';

import {findCollapsible, findGridRow, gridRowKey} from './use_grid_row';

const leaf = (name: string): AppField => ({name, type: AppFieldTypes.TEXT} as AppField);
const section = (name: string | undefined, fields: AppField[]): AppField => ({
    name,
    type: AppFieldTypes.COLLAPSIBLE,
    collapsible_config: {fields},
} as AppField);

describe('findCollapsible', () => {

    it('returns undefined for empty or missing input', () => {
        expect(findCollapsible(undefined, 'x')).toBeUndefined();
        expect(findCollapsible([], 'x')).toBeUndefined();
    });

    it('finds a collapsible at the top level by name', () => {
        const row = section('row1', [leaf('cell')]);
        expect(findCollapsible([leaf('other'), row], 'row1')).toBe(row);
    });

    it('skips leaf fields and only matches collapsibles', () => {
        // A leaf sharing the name must not match; only collapsibles are rows.
        expect(findCollapsible([leaf('row1')], 'row1')).toBeUndefined();
    });

    it('finds a collapsible nested inside another collapsible', () => {
        const inner = section('inner', [leaf('cell')]);
        const outer = section('outer', [leaf('a'), inner]);
        expect(findCollapsible([outer], 'inner')).toBe(inner);
    });

    it('returns undefined when no collapsible matches', () => {
        const outer = section('outer', [section('inner', [leaf('cell')])]);
        expect(findCollapsible([outer], 'missing')).toBeUndefined();
    });
});

describe('gridRowKey', () => {
    it('uses the row name when it has one', () => {
        expect(gridRowKey('orders', leaf('row1'), 2)).toBe('row1');
    });

    it('falls back to a positional path when the row has no name', () => {
        expect(gridRowKey('orders', section(undefined, []), 2)).toBe('orders::row::2');
    });
});

describe('findGridRow', () => {
    it('resolves a named row by name', () => {
        const row = section('row1', [leaf('cell')]);
        const grid = section('orders', [row]);
        expect(findGridRow([grid], 'row1')).toBe(row);
    });

    it('resolves a nameless row by its positional path', () => {
        const row0 = section(undefined, [leaf('a')]);
        const row1 = section(undefined, [leaf('b')]);
        const grid = section('orders', [row0, row1]);
        expect(findGridRow([grid], 'orders::row::1')).toBe(row1);
    });

    it('returns undefined when the positional path points past the rows', () => {
        const grid = section('orders', [section(undefined, [leaf('a')])]);
        expect(findGridRow([grid], 'orders::row::5')).toBeUndefined();
    });
});
