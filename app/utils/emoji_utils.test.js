// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {doesMatchNamedEmoji, hasEmojisOnly, compareEmojis} from './emoji_utils';

describe('hasEmojisOnly with named emojis', () => {
    const testCases = [{
        name: 'Named emoji',
        message: ':smile:',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Valid custom emoji',
        message: ':valid_custom:',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Invalid custom emoji',
        message: ':invalid_custom:',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'Named emojis',
        message: ':smile: :heart:',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Named emojis with white spaces',
        message: '   :smile:    :heart:   ',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Named emojis with potential custom emojis',
        message: ':smile: :heart: :valid_custom: :one:',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Named emojis of 4 plus invalid :exceed: named emoji',
        message: ':smile: :heart: :valid_custom: :one: :exceed:',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'Named emojis greater than max of 4',
        message: ':smile: :heart: :valid_custom: :one: :heart:',
        expected: {isEmojiOnly: true, isJumboEmoji: false},
    }, {
        name: 'Not valid named emoji',
        message: 'smile',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'Not valid named emoji',
        message: 'smile:',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'Not valid named emoji',
        message: ':smile',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'Not valid named emoji',
        message: ':smile::',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'Not valid named emoji',
        message: '::smile:',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'Mixed valid and invalid named emojis',
        message: '   :smile:  invalid  :heart:   ',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'This should render a codeblock instead',
        message: '    :D',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'Mixed emojis with whitespace and newlines',
        message: `:fire: 
        :-)`,
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Emojis with whitespace and newlines',
        message: ':fire: \n:smile:',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Emojis with newlines',
        message: ':fire:\n:smile:',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
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
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Unicode emoji',
        message: '🙌',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Unicode emoji',
        message: '🤟',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Unicode emojis',
        message: '🙌 👏',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Unicode emojis without whitespace in between',
        message: '🙌👏',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Unicode emojis without whitespace in between',
        message: '🙌🤟',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Unicode emojis with white spaces',
        message: '  😣   😖  ',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Unicode emojis with white spaces',
        message: '  😣   🤟  ',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: '4 unicode emojis',
        message: '😣 😖 🙌 👏',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Unicode emojis greater than max of 4',
        message: '😣 😖 🙌 👏 💩',
        expected: {isEmojiOnly: true, isJumboEmoji: false},
    }, {
        name: 'Unicode emoji',
        message: '\ud83d\udd5f',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Not valid unicode emoji',
        message: '\ud83d\udd5fnotvalid',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'Mixed valid and invalid unicode emojis',
        message: '😣 invalid 😖',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
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
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Emoticon',
        message: ':+1:',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Emoticons',
        message: ':) :-o',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Emoticons with white spaces',
        message: '   :)    :-o   ',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: '4 emoticons',
        message: ':) :-o :+1: :|',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'Emoticons greater than max of 4',
        message: ':) :-o :+1: :| :p',
        expected: {isEmojiOnly: true, isJumboEmoji: false},
    }, {
        name: 'Not valid emoticon',
        message: ':|:p',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'Not valid named emoji',
        message: ':) :-o :+1::|',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'Mixed valid and invalid named emojis',
        message: ':) :-o invalid :|',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
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
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'not with empty message',
        message: '   ',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'not with no emoji pattern',
        message: 'smile',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'with invalid custom emoji',
        message: ':smile: :) :invalid_custom:',
        expected: {isEmojiOnly: false, isJumboEmoji: false},
    }, {
        name: 'with named emoji and emoticon',
        message: ':smile: :) :valid_custom:',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'with unicode emoji and emoticon',
        message: '👍 :)',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'with unicode emoji and emoticon',
        message: '🤟 :)',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'with named and unicode emojis',
        message: ':smile: 👍',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'with named and unicode emojis',
        message: ':smile: 🤟',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'with named & unicode emojis and emoticon',
        message: ':smile: 👍 :)',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'with named & unicode emojis and emoticon',
        message: ':smile: 🤟 :)',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'with 4 named & unicode emojis and emoticon',
        message: ':smile: 👍 :) :heart:',
        expected: {isEmojiOnly: true, isJumboEmoji: true},
    }, {
        name: 'with named & unicode emojis and emoticon greater than max of 4',
        message: ':smile: 👍 :) :heart: 👏',
        expected: {isEmojiOnly: true, isJumboEmoji: false},
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

describe('compareEmojis', () => {
    test('should sort an array of emojis alphabetically', () => {
        const goatEmoji = {
            name: 'goat',
        };

        const dashEmoji = {
            name: 'dash',
        };

        const smileEmoji = {
            name: 'smile',
        };

        const emojiArray = [goatEmoji, dashEmoji, smileEmoji];
        emojiArray.sort((a, b) => compareEmojis(a, b));

        expect(emojiArray).toEqual([dashEmoji, goatEmoji, smileEmoji]);
    });

    test('should have partial matched emoji first', () => {
        const goatEmoji = {
            name: 'goat',
        };

        const dashEmoji = {
            name: 'dash',
        };

        const smileEmoji = {
            name: 'smile',
        };

        const emojiArray = [goatEmoji, dashEmoji, smileEmoji];
        emojiArray.sort((a, b) => compareEmojis(a, b, 'smi'));

        expect(emojiArray).toEqual([smileEmoji, dashEmoji, goatEmoji]);
    });

    test('should be able to sort on aliases', () => {
        const goatEmoji = {
            aliases: [':goat:'],
        };

        const dashEmoji = {
            aliases: [':dash:'],
        };

        const smileEmoji = {
            aliases: [':smile:'],
        };

        const emojiArray = [goatEmoji, dashEmoji, smileEmoji];
        emojiArray.sort((a, b) => compareEmojis(a, b));

        expect(emojiArray).toEqual([dashEmoji, goatEmoji, smileEmoji]);
    });

    test('special case for thumbsup emoji should sort it before thumbsdown by aliases', () => {
        const thumbsUpEmoji = {
            aliases: ['+1'],
        };

        const thumbsDownEmoji = {
            aliases: ['-1'],
        };

        const smileEmoji = {
            aliases: ['smile'],
        };

        const emojiArray = [thumbsDownEmoji, thumbsUpEmoji, smileEmoji];
        emojiArray.sort((a, b) => compareEmojis(a, b));

        expect(emojiArray).toEqual([thumbsUpEmoji, thumbsDownEmoji, smileEmoji]);
    });

    test('special case for thumbsup emoji should sort it before thumbsdown by names', () => {
        const thumbsUpEmoji = {
            name: 'thumbsup',
        };

        const thumbsDownEmoji = {
            name: 'thumbsdown',
        };

        const smileEmoji = {
            name: 'smile',
        };

        const emojiArray = [thumbsDownEmoji, thumbsUpEmoji, smileEmoji];
        emojiArray.sort((a, b) => compareEmojis(a, b));

        expect(emojiArray).toEqual([smileEmoji, thumbsUpEmoji, thumbsDownEmoji]);
    });

    test('special case for thumbsup emoji should sort it when emoji is matched', () => {
        const thumbsUpEmoji = {
            name: 'thumbsup',
        };

        const thumbsDownEmoji = {
            name: 'thumbsdown',
        };

        const smileEmoji = {
            name: 'smile',
        };

        const emojiArray = [thumbsDownEmoji, thumbsUpEmoji, smileEmoji];
        emojiArray.sort((a, b) => compareEmojis(a, b, 'thumb'));

        expect(emojiArray).toEqual([thumbsUpEmoji, thumbsDownEmoji, smileEmoji]);
    });

    test('it compares emojis when emojis are strings', () => {
        const thumbsUpEmoji = 'thumbsup';
        const thumbsDownEmoji = 'thumbsdown';
        const smileEmoji = {
            name: 'smile',
        };

        const emojiArray = [thumbsDownEmoji, thumbsUpEmoji, smileEmoji];
        emojiArray.sort((a, b) => compareEmojis(a, b, 'thumb'));

        expect(emojiArray).toEqual([thumbsUpEmoji, thumbsDownEmoji, smileEmoji]);
    });

    test('it sorts emojis that start with search term first, then includes search term, then alphabetically', () => {
        const printerEmoji = 'printer';
        const pointDownEmoji = 'point_down';
        const paintBrushEmoji = 'paintbrush';
        const footPrintsEmoji = 'footprints';
        const disappointedEmoji = 'disappointed';
        const sixPointedStarEmoji = 'six_pointed_star';

        const emojiArray = [printerEmoji, pointDownEmoji, paintBrushEmoji, footPrintsEmoji, disappointedEmoji, sixPointedStarEmoji];
        emojiArray.sort((a, b) => compareEmojis(a, b, 'point'));

        expect(emojiArray).toEqual([pointDownEmoji, disappointedEmoji, sixPointedStarEmoji, footPrintsEmoji, paintBrushEmoji, printerEmoji]);
    });
});
