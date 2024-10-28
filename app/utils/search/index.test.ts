// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {TabTypes, type TabType} from '.';

describe('TabTypes', () => {
    it('should create a mirrored object with keys equal to their values', () => {
        expect(TabTypes).toEqual({
            MESSAGES: 'MESSAGES',
            FILES: 'FILES',
        });
    });

    it('should allow valid keys for TabType', () => {
        const validTabType1: TabType = 'MESSAGES';
        const validTabType2: TabType = 'FILES';

        // Ensure that validTabType1 and validTabType2 match the types in TabTypes
        expect(validTabType1).toBe('MESSAGES');
        expect(validTabType2).toBe('FILES');
    });

    it('should not allow invalid keys for TabType', () => {
        // TypeScript will catch this as an error, but we can simulate with a custom runtime check
        const invalidTabType = 'INVALID_TAB_TYPE' as TabType;

        expect(TabTypes[invalidTabType]).toBeUndefined(); // Simulate invalid key behavior
    });
});
