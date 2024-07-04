// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {nonBreakingString} from './strings';

describe('nonBreakingString function', () => {
    it('should replace space with non-breaking space', () => {
        // Test case 1: Replace single space with non-breaking space
        const input1 = 'Hello World';
        const expected1 = 'Hello\xa0World';
        expect(nonBreakingString(input1)).toEqual(expected1);

        // Test case 2: Replace multiple spaces with non-breaking spaces
        const input2 = 'This is a test string';
        const expected2 = 'This\xa0is\xa0a\xa0test\xa0string';
        expect(nonBreakingString(input2)).toEqual(expected2);

        // Test case 3: No space to replace
        const input3 = 'NoSpace';
        const expected3 = 'NoSpace';
        expect(nonBreakingString(input3)).toEqual(expected3);
    });

    it('should handle empty string', () => {
        const input = '';
        const expected = '';
        expect(nonBreakingString(input)).toEqual(expected);
    });
});
