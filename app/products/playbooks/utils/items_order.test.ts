// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {areItemsOrdersEqual} from './items_order';

describe('areItemsOrdersEqual', () => {
    it('should return true for identical arrays', () => {
        const fromRaw = ['item1', 'item2', 'item3'];
        const fromRecord = ['item1', 'item2', 'item3'];

        const result = areItemsOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(true);
    });

    it('should return false when fromRecord is undefined', () => {
        const fromRaw = ['item1', 'item2', 'item3'];
        const fromRecord = undefined;

        const result = areItemsOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should return false when arrays have different lengths', () => {
        const fromRaw = ['item1', 'item2', 'item3'];
        const fromRecord = ['item1', 'item2'];

        const result = areItemsOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should return false when arrays have same length but different content', () => {
        const fromRaw = ['item1', 'item2', 'item3'];
        const fromRecord = ['item1', 'item2', 'item4'];

        const result = areItemsOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should return false when arrays have same content but different order', () => {
        const fromRaw = ['item1', 'item2', 'item3'];
        const fromRecord = ['item1', 'item3', 'item2'];

        const result = areItemsOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should return true for empty arrays', () => {
        const fromRaw: string[] = [];
        const fromRecord: string[] = [];

        const result = areItemsOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(true);
    });

    it('should return false when one array is empty and other is not', () => {
        const fromRaw = ['item1', 'item2'];
        const fromRecord: string[] = [];

        const result = areItemsOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should return false when fromRaw is empty and fromRecord has items', () => {
        const fromRaw: string[] = [];
        const fromRecord = ['item1', 'item2'];

        const result = areItemsOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should return true for single item arrays with same content', () => {
        const fromRaw = ['single-item'];
        const fromRecord = ['single-item'];

        const result = areItemsOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(true);
    });

    it('should return false for single item arrays with different content', () => {
        const fromRaw = ['item1'];
        const fromRecord = ['item2'];

        const result = areItemsOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should be case sensitive', () => {
        const fromRaw = ['Item1', 'Item2'];
        const fromRecord = ['item1', 'item2'];

        const result = areItemsOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });

    it('should handle whitespace differences', () => {
        const fromRaw = ['item1', 'item2'];
        const fromRecord = ['item1 ', 'item2'];

        const result = areItemsOrdersEqual(fromRaw, fromRecord);

        expect(result).toBe(false);
    });
});
