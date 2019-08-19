// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {filterEmojiSearchInput} from './emoji_picker.js';

describe('components/emoji_picker/EmojiPicker', () => {
    const testCases = [
        {input: 'smile', output: 'smile'},
        {input: 'SMILE', output: 'smile'},
        {input: ':smile', output: 'smile'},
        {input: ':SMILE', output: 'smile'},
        {input: 'smile:', output: 'smile'},
        {input: 'SMILE:', output: 'smile'},
        {input: ':smile:', output: 'smile'},
        {input: ':SMILE:', output: 'smile'},
    ];

    testCases.forEach((testCase) => {
        test(`'${testCase.input}' should return '${testCase.output}'`, () => {
            expect(filterEmojiSearchInput(testCase.input)).toEqual(testCase.output);
        });
    });
});
