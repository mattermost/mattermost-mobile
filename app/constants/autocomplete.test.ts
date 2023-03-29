// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MENTIONS_REGEX} from './autocomplete';

describe('test regular expressions', () => {
    test.each([
        ['test @mention', ['@mention']],
        ['test @mention1 @mention2', ['@mention1', '@mention2']],
        ['where is @jessica.hyde?', ['@jessica.hyde']],
        ['@桜', ['@桜']],

        ['test@mention', null],

        // since word boundaries don't work with non latin characters
        // the following is a known bug
        ['άντε@γεια', ['@γεια']],
    ])('MENTIONS_REGEX %s => %s', (text, expected) => {
        expect(text.match(MENTIONS_REGEX)).toEqual(expected);
    });
});
