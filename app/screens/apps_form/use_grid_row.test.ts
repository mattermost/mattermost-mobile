// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {AppFieldTypes} from '@constants/apps';

import {findCollapsible} from './use_grid_row';

describe('findCollapsible', () => {
    const leaf = (name: string): AppField => ({name, type: AppFieldTypes.TEXT} as AppField);
    const section = (name: string, fields: AppField[]): AppField => ({
        name,
        type: AppFieldTypes.COLLAPSIBLE,
        collapsible_config: {fields},
    } as AppField);

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
