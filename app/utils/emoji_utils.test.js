// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shouldRenderJumboEmoji} from './emoji_utils';

describe('shouldRenderJumboEmoji with named emojis', () => {
    const testCases = [{
        name: 'Named emoji',
        message: ':smile:',
        expected: true,
    }, {
        name: 'Valid custom emoji',
        message: ':valid_custom:',
        expected: true,
    }, {
        name: 'Invalid custom emoji',
        message: ':invalid_custom:',
        expected: false,
    }, {
        name: 'Named emojis',
        message: ':smile: :heart:',
        expected: true,
    }, {
        name: 'Named emojis with white spaces',
        message: '   :smile:    :heart:   ',
        expected: true,
    }, {
        name: 'Named emojis with potential custom emojis',
        message: ':smile: :heart: :valid_custom: :one:',
        expected: true,
    }, {
        name: 'Named emojis greater than max of 4',
        message: ':smile: :heart: :valid_custom: :one: :exceed:',
        expected: false,
    }, {
        name: 'Not valid named emoji',
        message: 'smile',
        expected: false,
    }, {
        name: 'Not valid named emoji',
        message: 'smile:',
        expected: false,
    }, {
        name: 'Not valid named emoji',
        message: ':smile',
        expected: false,
    }, {
        name: 'Not valid named emoji',
        message: ':smile::',
        expected: false,
    }, {
        name: 'Not valid named emoji',
        message: '::smile:',
        expected: false,
    }, {
        name: 'Mixed valid and invalid named emojis',
        message: '   :smile:  invalid  :heart:   ',
        expected: false,
    }];

    const customEmojis = new Map([['valid_custom', 0]]);
    for (const testCase of testCases) {
        it(`${testCase.name} - ${testCase.message}`, () => {
            expect(shouldRenderJumboEmoji(testCase.message, customEmojis)).toEqual(testCase.expected);
        });
    }
});

describe('shouldRenderJumboEmoji with unicode emojis', () => {
    const testCases = [{
        name: 'Unicode emoji',
        message: '👍',
        expected: true,
    }, {
        name: 'Unicode emoji',
        message: '🙌',
        expected: true,
    }, {
        name: 'Unicode emojis',
        message: '🙌 👏',
        expected: true,
    }, {
        name: 'Unicode emojis without whitespace in between',
        message: '🙌👏',
        expected: true,
    }, {
        name: 'Unicode emojis with white spaces',
        message: '  😣   😖  ',
        expected: true,
    }, {
        name: '4 unicode emojis',
        message: '😣 😖 🙌 👏',
        expected: true,
    }, {
        name: 'Unicode emojis greater than max of 4',
        message: '😣 😖 🙌 👏 💩',
        expected: false,
    }, {
        name: 'Unicode emoji',
        message: '\ud83d\udd5f',
        expected: true,
    }, {
        name: 'Not valid unicode emoji',
        message: '\ud83d\udd5fnotvalid',
        expected: false,
    }, {
        name: 'Mixed valid and invalid unicode emojis',
        message: '😣 invalid 😖',
        expected: false,
    }];

    const customEmojis = new Map();
    for (const testCase of testCases) {
        it(`${testCase.name} - ${testCase.message}`, () => {
            expect(shouldRenderJumboEmoji(testCase.message, customEmojis)).toEqual(testCase.expected);
        });
    }
});

describe('shouldRenderJumboEmoji with emoticons', () => {
    const testCases = [{
        name: 'Emoticon',
        message: ':)',
        expected: true,
    }, {
        name: 'Emoticon',
        message: ':+1:',
        expected: true,
    }, {
        name: 'Emoticons',
        message: ':) :-o',
        expected: true,
    }, {
        name: 'Emoticons with white spaces',
        message: '   :)    :-o   ',
        expected: true,
    }, {
        name: '4 emoticons',
        message: ':) :-o :+1: :|',
        expected: true,
    }, {
        name: 'Emoticons greater than max of 4',
        message: ':) :-o :+1: :| :p',
        expected: false,
    }, {
        name: 'Not valid emoticon',
        message: ':|:p',
        expected: false,
    }, {
        name: 'Not valid named emoji',
        message: ':) :-o :+1::|',
        expected: false,
    }, {
        name: 'Mixed valid and invalid named emojis',
        message: ':) :-o invalid :|',
        expected: false,
    }];

    const customEmojis = new Map();
    for (const testCase of testCases) {
        it(`${testCase.name} - ${testCase.message}`, () => {
            expect(shouldRenderJumboEmoji(testCase.message, customEmojis)).toEqual(testCase.expected);
        });
    }
});

describe('shouldRenderJumboEmoji with empty and mixed emojis', () => {
    const testCases = [{
        name: 'not with empty message',
        message: '',
        expected: false,
    }, {
        name: 'not with empty message',
        message: '   ',
        expected: false,
    }, {
        name: 'not with no emoji pattern',
        message: 'smile',
        expected: false,
    }, {
        name: 'with invalid custom emoji',
        message: ':smile: :) :invalid_custom:',
        expected: false,
    }, {
        name: 'with named emoji and emoticon',
        message: ':smile: :) :valid_custom:',
        expected: true,
    }, {
        name: 'with unicode emoji and emoticon',
        message: '👍 :)',
        expected: true,
    }, {
        name: 'with named and unicode emojis',
        message: ':smile: 👍',
        expected: true,
    }, {
        name: 'with named & unicode emojis and emoticon',
        message: ':smile: 👍 :)',
        expected: true,
    }, {
        name: 'with 4 named & unicode emojis and emoticon',
        message: ':smile: 👍 :) :heart:',
        expected: true,
    }, {
        name: 'with named & unicode emojis and emoticon greater than max of 4',
        message: ':smile: 👍 :) :heart: 👏',
        expected: false,
    }];

    const customEmojis = new Map([['valid_custom', 0]]);
    for (const testCase of testCases) {
        it(`${testCase.name} - ${testCase.message}`, () => {
            expect(shouldRenderJumboEmoji(testCase.message, customEmojis)).toEqual(testCase.expected);
        });
    }
});
