// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {doesMatchNamedEmoji, hasEmojisOnly} from './emoji_utils';

describe('hasEmojisOnly with named emojis', () => {
    const testCases = [{
        name: 'Named emoji',
        message: ':smile:',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Valid custom emoji',
        message: ':valid_custom:',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Invalid custom emoji',
        message: ':invalid_custom:',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'Named emojis',
        message: ':smile: :heart:',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Named emojis with white spaces',
        message: '   :smile:    :heart:   ',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Named emojis with potential custom emojis',
        message: ':smile: :heart: :valid_custom: :one:',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Named emojis of 4 plus invalid :exceed: named emoji',
        message: ':smile: :heart: :valid_custom: :one: :exceed:',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'Named emojis greater than max of 4',
        message: ':smile: :heart: :valid_custom: :one: :heart:',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: false},
    }, {
        name: 'Not valid named emoji',
        message: 'smile',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'Not valid named emoji',
        message: 'smile:',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'Not valid named emoji',
        message: ':smile',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'Not valid named emoji',
        message: ':smile::',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'Not valid named emoji',
        message: '::smile:',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'Mixed valid and invalid named emojis',
        message: '   :smile:  invalid  :heart:   ',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'This should render a codeblock instead',
        message: '    :D',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }];

    const customEmojis = new Map([['valid_custom', 0]]);
    for (const testCase of testCases) {
        it(`${testCase.name} - ${testCase.message}`, () => {
            expect(hasEmojisOnly(testCase.message, customEmojis)).toEqual(testCase.expected);
        });
    }
});

describe('hasEmojisOnly with unicode emojis', () => {
    const testCases = [{
        name: 'Unicode emoji',
        message: '👍',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Unicode emoji',
        message: '🙌',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Unicode emoji',
        message: '🤟',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Unicode emojis',
        message: '🙌 👏',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Unicode emojis without whitespace in between',
        message: '🙌👏',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Unicode emojis without whitespace in between',
        message: '🙌🤟',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Unicode emojis with white spaces',
        message: '  😣   😖  ',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Unicode emojis with white spaces',
        message: '  😣   🤟  ',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: '4 unicode emojis',
        message: '😣 😖 🙌 👏',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Unicode emojis greater than max of 4',
        message: '😣 😖 🙌 👏 💩',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: false},
    }, {
        name: 'Unicode emoji',
        message: '\ud83d\udd5f',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Not valid unicode emoji',
        message: '\ud83d\udd5fnotvalid',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'Mixed valid and invalid unicode emojis',
        message: '😣 invalid 😖',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }];

    const customEmojis = new Map();
    for (const testCase of testCases) {
        it(`${testCase.name} - ${testCase.message}`, () => {
            expect(hasEmojisOnly(testCase.message, customEmojis)).toEqual(testCase.expected);
        });
    }
});

describe('hasEmojisOnly with emoticons', () => {
    const testCases = [{
        name: 'Emoticon',
        message: ':)',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Emoticon',
        message: ':+1:',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Emoticons',
        message: ':) :-o',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Emoticons with white spaces',
        message: '   :)    :-o   ',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: '4 emoticons',
        message: ':) :-o :+1: :|',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'Emoticons greater than max of 4',
        message: ':) :-o :+1: :| :p',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: false},
    }, {
        name: 'Not valid emoticon',
        message: ':|:p',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'Not valid named emoji',
        message: ':) :-o :+1::|',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'Mixed valid and invalid named emojis',
        message: ':) :-o invalid :|',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }];

    const customEmojis = new Map();
    for (const testCase of testCases) {
        it(`${testCase.name} - ${testCase.message}`, () => {
            expect(hasEmojisOnly(testCase.message, customEmojis)).toEqual(testCase.expected);
        });
    }
});

describe('hasEmojisOnly with empty and mixed emojis', () => {
    const testCases = [{
        name: 'not with empty message',
        message: '',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'not with empty message',
        message: '   ',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'not with no emoji pattern',
        message: 'smile',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'with invalid custom emoji',
        message: ':smile: :) :invalid_custom:',
        expected: {isEmojiOnly: false, shouldRenderJumboEmoji: false},
    }, {
        name: 'with named emoji and emoticon',
        message: ':smile: :) :valid_custom:',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'with unicode emoji and emoticon',
        message: '👍 :)',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'with unicode emoji and emoticon',
        message: '🤟 :)',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'with named and unicode emojis',
        message: ':smile: 👍',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'with named and unicode emojis',
        message: ':smile: 🤟',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'with named & unicode emojis and emoticon',
        message: ':smile: 👍 :)',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'with named & unicode emojis and emoticon',
        message: ':smile: 🤟 :)',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'with 4 named & unicode emojis and emoticon',
        message: ':smile: 👍 :) :heart:',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: true},
    }, {
        name: 'with named & unicode emojis and emoticon greater than max of 4',
        message: ':smile: 👍 :) :heart: 👏',
        expected: {isEmojiOnly: true, shouldRenderJumboEmoji: false},
    }];

    const customEmojis = new Map([['valid_custom', 0]]);
    for (const testCase of testCases) {
        it(`${testCase.name} - ${testCase.message}`, () => {
            expect(hasEmojisOnly(testCase.message, customEmojis)).toEqual(testCase.expected);
        });
    }
});

describe('doesMatchNamedEmoji', () => {
    const testCases = [{
        input: ':named_emoji:',
        output: true,
    }, {
        input: 'named_emoji',
        output: false,
    }, {
        input: ':named_emoji',
        output: false,
    }, {
        input: 'named_emoji:',
        output: false,
    }, {
        input: '::named_emoji:',
        output: false,
    }, {
        input: 'named emoji',
        output: false,
    }, {
        input: ':named emoji:',
        output: false,
    }, {
        input: ':named_emoji:!',
        output: false,
    }, {
        input: ':named_emoji:aa',
        output: false,
    }];

    for (const testCase of testCases) {
        it(`test for - ${testCase.input}`, () => {
            expect(doesMatchNamedEmoji(testCase.input)).toEqual(testCase.output);
        });
    }
});
