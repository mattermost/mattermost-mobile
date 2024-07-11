// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Fuse from 'fuse.js';

import {
    isEmoticon,
    isUnicodeEmoji,
    getEmoticonName,
    matchEmoticons,
    getValidEmojis,
    getEmojiName,
    isReactionMatch,
    isValidNamedEmoji,
    hasJumboEmojiOnly,
    doesMatchNamedEmoji,
    getEmojiFirstAlias,
    getEmojiByName,
    mapCustomEmojiNames,
    compareEmojis,
    isCustomEmojiEnabled,
    fillEmoji,
    getSkin,
    getEmojis,
    searchEmojis,
} from './helpers';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';
import type SystemModel from '@typings/database/models/servers/system';

jest.mock('@database/models/server/system');

describe('helpers.ts tests', () => {
    describe('isEmoticon', () => {
        it('should return true for valid emoticons', () => {
            expect(isEmoticon(':)')).toBe(true);
            expect(isEmoticon(';)')).toBe(true);
        });

        it('should return false for invalid emoticons', () => {
            expect(isEmoticon(':-*')).toBe(false);
            expect(isEmoticon('hello')).toBe(false);
        });
    });

    describe('isUnicodeEmoji', () => {
        it('should return true for unicode emoji', () => {
            expect(isUnicodeEmoji('😊')).toBe(true);
        });

        it('should return false for non-emoji text', () => {
            expect(isUnicodeEmoji('hello')).toBe(false);
        });
    });

    describe('getEmoticonName', () => {
        it('should return correct emoticon name', () => {
            expect(getEmoticonName(':)')).toBe('slightly_smiling_face');
        });

        it('should return undefined for invalid emoticon', () => {
            expect(getEmoticonName('hello')).toBeUndefined();
        });
    });

    describe('matchEmoticons', () => {
        it('should match named, unicode, and emoticon emojis', () => {
            const text = 'Hello :) :smile: 😊';
            const result = matchEmoticons(text);
            expect(result).toEqual([':smile:', ' :)', '😊']);
        });

        it('should return empty array for no matches', () => {
            expect(matchEmoticons('hello')).toEqual([]);
        });
    });

    describe('getValidEmojis', () => {
        it('should return valid emoji names', () => {
            const emojis = [':smile:', '😊', ':)'];
            const customEmojis = [{name: 'custom_emoji'}] as CustomEmojiModel[];
            const result = getValidEmojis(emojis, customEmojis);
            expect(result).toContain('smile');
        });

        it('should return empty array for no valid emojis', () => {
            const emojis = ['hello'];
            const customEmojis = [{name: 'custom_emoji'}] as CustomEmojiModel[];
            const result = getValidEmojis(emojis, customEmojis);
            expect(result).toEqual([]);
        });
    });

    describe('getEmojiName', () => {
        it('should return correct emoji name for named emoji', () => {
            expect(getEmojiName(':smile:', [])).toBe('smile');
        });

        it('should return correct emoji name for unicode emoji', () => {
            expect(getEmojiName('😊', [])).toBe('blush');
        });

        it('should return correct emoji name for emoticon', () => {
            expect(getEmojiName(':)', [])).toBe('slightly_smiling_face');
        });

        it('should return undefined for invalid emoji', () => {
            expect(getEmojiName('hello', [])).toBeUndefined();
        });
    });

    describe('isReactionMatch', () => {
        it('should return correct reaction match for valid reaction', () => {
            const custom = [{name: 'custom'}] as CustomEmojiModel[];
            expect(isReactionMatch('+:smile:', custom)).toEqual({add: true, emoji: 'smile'});
            expect(isReactionMatch('+:custom:', custom)).toEqual({add: true, emoji: 'custom'});
            expect(isReactionMatch('+:lala:', custom)).toEqual(null);
        });

        it('should return null for invalid reaction', () => {
            expect(isReactionMatch(':hello:', [])).toBeNull();
        });
    });

    describe('isValidNamedEmoji', () => {
        it('should return true for valid named emoji', () => {
            expect(isValidNamedEmoji('smile', [])).toBe(true);
        });

        it('should return false for invalid named emoji', () => {
            expect(isValidNamedEmoji('hello', [])).toBe(false);
        });
    });

    describe('hasJumboEmojiOnly', () => {
        it('should return true for jumbo emojis only', () => {
            expect(hasJumboEmojiOnly('😊', [])).toBe(true);
            expect(hasJumboEmojiOnly('😊 😊', [])).toBe(true);
        });

        it('should return false for non-jumbo emojis', () => {
            expect(hasJumboEmojiOnly('hello', [])).toBe(false);
        });

        it('should return false for strings with spaces only', () => {
            expect(hasJumboEmojiOnly(' ', [])).toBe(false);
        });

        it('should return true for strings with custom emojis', () => {
            const custom = ['custom'];
            expect(hasJumboEmojiOnly('😊 :custom: :blush:', custom)).toBe(true);
        });

        it('should return false for strings with more than 8 emojis', () => {
            expect(hasJumboEmojiOnly('😊 😊 😊 😊 😊 😊 😊 😊 😊', [])).toBe(false);
        });
    });

    describe('doesMatchNamedEmoji', () => {
        it('should return true for valid named emoji', () => {
            expect(doesMatchNamedEmoji(':smile:')).toBe(true);
        });

        it('should return false for invalid named emoji', () => {
            expect(doesMatchNamedEmoji('hello')).toBe(false);
        });
    });

    describe('getEmojiFirstAlias', () => {
        it('should return first alias of emoji', () => {
            expect(getEmojiFirstAlias('smile')).toBe('smile');
            expect(getEmojiFirstAlias('lolo')).toBe('lolo');
        });
    });

    describe('getEmojiByName', () => {
        it('should return emoji by name for standard emoji', () => {
            expect(getEmojiByName('smile', [])).toEqual(expect.objectContaining({short_names: ['smile'], category: 'smileys-emotion'}));
        });

        it('should return emoji by name for custom emoji', () => {
            const customEmojis = [{name: 'custom_emoji'}] as CustomEmojiModel[];
            expect(getEmojiByName('custom_emoji', customEmojis)).toEqual({name: 'custom_emoji'});
        });

        it('should return undefined for invalid emoji', () => {
            expect(getEmojiByName('hello', [])).toBeUndefined();
        });
    });

    describe('mapCustomEmojiNames', () => {
        it('should return names of custom emojis', () => {
            const customEmojis = [{name: 'custom_emoji'}] as CustomEmojiModel[];
            expect(mapCustomEmojiNames(customEmojis)).toEqual(['custom_emoji']);
        });
    });

    describe('compareEmojis', () => {
        it('should compare emojis correctly based on search term', () => {
            expect(compareEmojis('smile', 'grin', 'smi')).toBe(-1);
            expect(compareEmojis('grin', 'smile', 'smi')).toBe(1);
            expect(compareEmojis('smile', 'grin', '')).toBe(1);
            expect(compareEmojis('smile', 'smile', 'smi')).toBe(0);
        });
    });

    describe('isCustomEmojiEnabled', () => {
        it('should return true if custom emoji is enabled in config', () => {
            expect(isCustomEmojiEnabled({EnableCustomEmoji: 'true'} as any)).toBe(true);

            expect(isCustomEmojiEnabled({value: {EnableCustomEmoji: 'true'}} as SystemModel)).toBe(true);
        });

        it('should return false if custom emoji is disabled in config', () => {
            expect(isCustomEmojiEnabled({EnableCustomEmoji: 'false'} as any)).toBe(false);
        });
    });

    describe('fillEmoji', () => {
        it('should fill emoji correctly', () => {
            expect(fillEmoji('category', 1)).toEqual({name: 'smiley', aliases: ['smiley'], category: 'category'});
        });
    });

    describe('getSkin', () => {
        it('should return default for skin variations', () => {
            const emoji = {skin_variations: []};
            expect(getSkin(emoji)).toBe('default');
        });

        it('should return first skin for skins array', () => {
            const emoji = {skins: ['light']};
            expect(getSkin(emoji)).toBe('light');
        });

        it('should return null for no skin variations', () => {
            const emoji = {};
            expect(getSkin(emoji)).toBeNull();
        });
    });

    describe('getEmojis', () => {
        it('should return emojis for specified skin tone', () => {
            const custom = [{name: 'hey_custom'}] as CustomEmojiModel[];
            expect(getEmojis('dark', custom)).toEqual(expect.arrayContaining(['grinning', 'smiley', 'smile', 'grin', 'laughing', 'satisfied', 'sweat_smile', 'rolling_on_the_floor_laughing', 'rofl', 'joy', 'hey_custom']));
        });
    });

    describe('searchEmojis', () => {
        it('should return emojis matching search term', () => {
            const options = {findAllMatches: true, ignoreLocation: true, includeMatches: true, shouldSort: false, includeScore: true};
            const emojis = getEmojis('light', []);
            const fuse = new Fuse(emojis, options);
            const result = searchEmojis(fuse, 'smile');
            expect(result).toEqual(['smile', 'smile_cat', 'smiley', 'smiley_cat', 'sweat_smile']);
            expect(searchEmojis(fuse, 'cawabunga')).toEqual([]);
        });
    });
});
