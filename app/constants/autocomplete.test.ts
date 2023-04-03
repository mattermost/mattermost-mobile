// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MENTIONS_REGEX} from './autocomplete';

describe('test regular expressions', () => {
    test.each([
        ['test @mention', ['@mention']],
        ['test @mention.', ['@mention']],
        ['test @mention_', ['@mention_']],
        ['test @user_.name', ['@user_.name']],
        ['test @user_.name.', ['@user_.name']],
        ['test@mention', null],
        ['test @mention1 @mention2 mentions', ['@mention1', '@mention2']],
        ['test @mention1 @mention2. Mentions...', ['@mention1', '@mention2']],

        ['where is @jessica.hyde?', ['@jessica.hyde']],
        ['where is @jessica.hyde.', ['@jessica.hyde']],
        ['test @user.name. @user2.name', ['@user.name', '@user2.name']],
        ['test @user.name.@user2.name', ['@user.name', '@user2.name']],

        ['non latin @桜 mention', ['@桜']],
        ['@γεια non latin', ['@γεια']],
        ['non latin @γεια.', ['@γεια']],

        // since word boundaries don't work with non latin characters
        // the following is a known bug
        ['άντε@γεια.com', ['@γεια.com']],
    ])('MENTIONS_REGEX %s => %s', (text, expected) => {
        expect(text.match(MENTIONS_REGEX)).toEqual(expected);
    });
});
