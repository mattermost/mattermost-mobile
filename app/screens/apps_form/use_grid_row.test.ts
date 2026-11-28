// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-native';

import {AppFieldTypes} from '@constants/apps';

import useGridRow, {findCollapsible, findGridRow, gridRowKey} from './use_grid_row';

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

    it('falls back to a namespaced tree path when the row has no name', () => {
        // Grid at path '0', row at raw index 2 -> '::pos::0/2'.
        expect(gridRowKey('0', section(undefined, []), 2)).toBe('::pos::0/2');
    });
});

describe('findGridRow', () => {
    it('resolves a named row by name', () => {
        const row = section('row1', [leaf('cell')]);
        const grid = section('orders', [row]);
        expect(findGridRow([grid], 'row1')).toBe(row);
    });

    it('resolves a nameless row by its namespaced tree path, even in an unnamed grid', () => {
        const row0 = section(undefined, [leaf('a')]);
        const row1 = section(undefined, [leaf('b')]);
        const grid = section(undefined, [row0, row1]);

        // grid is fields[0]; row1 is its child at index 1 -> '::pos::0/1'.
        expect(findGridRow([grid], gridRowKey('0', row1, 1))).toBe(row1);
    });

    it('keeps names and positional paths in separate namespaces so they never collide', () => {
        // A row literally named '0/1' must not be returned for a positional key
        // that happens to carry the same path, and vice versa.
        const named = section('0/1', [leaf('a')]);
        const positional = section(undefined, [leaf('b')]);
        const grid = section('orders', [named, positional]);

        // Positional key resolves by path (the second row), not the same-named row.
        expect(findGridRow([grid], '::pos::0/1')).toBe(positional);

        // The name '0/1' resolves to the named row, not by path.
        expect(findGridRow([grid], '0/1')).toBe(named);
    });

    it('returns undefined when the tree path points past the fields', () => {
        const grid = section('orders', [section(undefined, [leaf('a')])]);
        expect(findGridRow([grid], '::pos::0/5')).toBeUndefined();
    });
});

describe('useGridRow', () => {
    const grid = (rows: AppField[]) => [section('orders', rows)];

    it('drops a positional selection when the field tree is replaced', () => {
        // An unnamed row opened by positional path must not survive a refresh
        // that swaps the field tree — it could now point at a different row.
        const rowA = section(undefined, [leaf('cell_a')]);
        const first = grid([rowA]);
        const {result, rerender} = renderHook(
            ({fields}) => useGridRow(fields, undefined, {}),
            {initialProps: {fields: first}},
        );

        act(() => {
            result.current.setOpenRowName(gridRowKey('0', rowA, 0));
        });
        expect(result.current.openRow).toBe(rowA);

        // A server refresh hands back a fresh tree (new array identity).
        rerender({fields: grid([section(undefined, [leaf('cell_a')])])});
        expect(result.current.openRow).toBeUndefined();
    });

    it('keeps a named selection across a field-tree replacement', () => {
        const first = grid([section('row1', [leaf('cell_a')])]);
        const {result, rerender} = renderHook(
            ({fields}) => useGridRow(fields, undefined, {}),
            {initialProps: {fields: first}},
        );

        act(() => {
            result.current.setOpenRowName('row1');
        });
        expect(result.current.openRow?.name).toBe('row1');

        // The same row, rebuilt in a fresh tree, still resolves by name.
        const rebuilt = section('row1', [leaf('cell_a')]);
        rerender({fields: grid([rebuilt])});
        expect(result.current.openRow).toBe(rebuilt);
    });

    it('never uses a password first cell as the row title', () => {
        const row = section('row1', [
            {name: 'secret', type: AppFieldTypes.TEXT, subtype: 'password', label: 'Secret'} as AppField,
        ]);
        const {result} = renderHook(() => useGridRow(grid([row]), undefined, {secret: 'hunter2'}));

        // Falls back to the row label/name, never the typed secret.
        expect(result.current.rowTitle(row)).toBe('row1');
    });

    it('uses the typed value of the first cell as the row title', () => {
        const row = section('row1', [leaf('cell_order')]);
        const {result} = renderHook(() => useGridRow(grid([row]), undefined, {cell_order: 'SO-1042'}));

        expect(result.current.rowTitle(row)).toBe('SO-1042');
    });
});
