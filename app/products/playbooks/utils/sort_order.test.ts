// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getSortOrder, areSortOrdersEqual} from './sort_order';

describe('getSortOrder', () => {
    it('should return array of ids from items', () => {
        const items = [
            {id: 'item1'},
            {id: 'item2'},
            {id: 'item3'},
        ];

        const result = getSortOrder(items);

        expect(result).toEqual(['item1', 'item2', 'item3']);
    });

    it('should return empty array for empty items array', () => {
        const items: Array<{id: string}> = [];

        const result = getSortOrder(items);

        expect(result).toEqual([]);
    });

    it('should handle single item', () => {
        const items = [{id: 'single-item'}];

        const result = getSortOrder(items);

        expect(result).toEqual(['single-item']);
    });

    it('should preserve order of items', () => {
        const items = [
            {id: 'third'},
            {id: 'first'},
            {id: 'second'},
        ];

        const result = getSortOrder(items);

        expect(result).toEqual(['third', 'first', 'second']);
    });
});

describe('areSortOrdersEqual', () => {
    it('should return true for identical arrays', () => {
        const fromRaw = ['item1', 'item2', 'item3'];
        const fromRecord = ['item1', 'item2', 'item3'];

        const result = areSortOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(true);
    });

    it('should return false when fromRecord is undefined', () => {
        const fromRaw = ['item1', 'item2', 'item3'];
        const fromRecord = undefined;

        const result = areSortOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should return false when arrays have different lengths', () => {
        const fromRaw = ['item1', 'item2', 'item3'];
        const fromRecord = ['item1', 'item2'];

        const result = areSortOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should return false when arrays have same length but different content', () => {
        const fromRaw = ['item1', 'item2', 'item3'];
        const fromRecord = ['item1', 'item2', 'item4'];

        const result = areSortOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should return false when arrays have same content but different order', () => {
        const fromRaw = ['item1', 'item2', 'item3'];
        const fromRecord = ['item1', 'item3', 'item2'];

        const result = areSortOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should return true for empty arrays', () => {
        const fromRaw: string[] = [];
        const fromRecord: string[] = [];

        const result = areSortOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(true);
    });

    it('should return false when one array is empty and other is not', () => {
        const fromRaw = ['item1', 'item2'];
        const fromRecord: string[] = [];

        const result = areSortOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should return false when fromRaw is empty and fromRecord has items', () => {
        const fromRaw: string[] = [];
        const fromRecord = ['item1', 'item2'];

        const result = areSortOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should return true for single item arrays with same content', () => {
        const fromRaw = ['single-item'];
        const fromRecord = ['single-item'];

        const result = areSortOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(true);
    });

    it('should return false for single item arrays with different content', () => {
        const fromRaw = ['item1'];
        const fromRecord = ['item2'];

        const result = areSortOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should be case sensitive', () => {
        const fromRaw = ['Item1', 'Item2'];
        const fromRecord = ['item1', 'item2'];

        const result = areSortOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should handle whitespace differences', () => {
        const fromRaw = ['item1', 'item2'];
        const fromRecord = ['item1 ', 'item2'];

        const result = areSortOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });
});
