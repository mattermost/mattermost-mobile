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
        expect(gridRowKey('0', leaf('row1'), 2)).toBe('row1');
    });

    it('falls back to the row tree path when the row has no name', () => {
        // Grid at path '0', row at raw index 2 -> '0/2'.
        expect(gridRowKey('0', section(undefined, []), 2)).toBe('0/2');
    });
});

describe('findGridRow', () => {
    it('resolves a named row by name', () => {
        const row = section('row1', [leaf('cell')]);
        const grid = section('orders', [row]);
        expect(findGridRow([grid], 'row1')).toBe(row);
    });

    it('resolves a nameless row by its tree path, even in an unnamed grid', () => {
        const row0 = section(undefined, [leaf('a')]);
        const row1 = section(undefined, [leaf('b')]);
        const grid = section(undefined, [row0, row1]);

        // grid is fields[0]; row1 is its child at index 1 -> path '0/1'.
        expect(findGridRow([grid], '0/1')).toBe(row1);
    });

    it('returns undefined when the tree path points past the fields', () => {
        const grid = section('orders', [section(undefined, [leaf('a')])]);
        expect(findGridRow([grid], '0/5')).toBeUndefined();
    });
});
