// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform, type TextStyle} from 'react-native';

import {Preferences} from '@constants';

import {
    getCodeFont,
    getMarkdownTextStyles,
    getMarkdownBlockStyles,
    getHighlightLanguageFromNameOrAlias,
    getHighlightLanguageName,
    escapeRegex,
    getMarkdownImageSize,
    computeTextStyle,
    parseSearchTerms,
    convertSearchTermToRegex,
    removeImageProxyForKey,
} from './index';

jest.mock('@utils/images', () => ({
    getViewPortWidth: jest.fn(),
}));

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
}));

describe('Utility functions', () => {
    describe('getCodeFont', () => {
        it('should return the correct font for iOS', () => {
            Platform.OS = 'ios';
            expect(getCodeFont()).toBe('Menlo');
        });

        it('should return the correct font for Android', () => {
            Platform.OS = 'android';
            expect(getCodeFont()).toBe('monospace');
        });
    });

    describe('getMarkdownTextStyles', () => {
        it('should return correct text styles', () => {
            const styles = getMarkdownTextStyles(Preferences.THEMES.denim);
            expect(styles).toHaveProperty('emph');
            expect(styles).toHaveProperty('strong');
            expect(styles).toHaveProperty('del');
            expect(styles).toHaveProperty('link');
            expect(styles).toHaveProperty('heading1');
            expect(styles).toHaveProperty('code');
            expect(styles).toHaveProperty('mention');
            expect(styles).toHaveProperty('error');
            expect(styles).toHaveProperty('table_header_row');
            expect(styles).toHaveProperty('mention_highlight');
        });
    });

    describe('getMarkdownBlockStyles', () => {
        it('should return correct block styles', () => {
            const styles = getMarkdownBlockStyles(Preferences.THEMES.denim);
            expect(styles).toHaveProperty('adjacentParagraph');
            expect(styles).toHaveProperty('horizontalRule');
            expect(styles).toHaveProperty('quoteBlockIcon');
        });
    });

    describe('getHighlightLanguageFromNameOrAlias', () => {
        it('should return correct language name or alias', () => {
            expect(getHighlightLanguageFromNameOrAlias('javascript')).toBe('javascript');
            expect(getHighlightLanguageFromNameOrAlias('js')).toBe('javascript');
            expect(getHighlightLanguageFromNameOrAlias('unknown')).toBe('');
        });
    });

    describe('getHighlightLanguageName', () => {
        it('should return correct language name', () => {
            expect(getHighlightLanguageName('javascript')).toBe('JavaScript');
            expect(getHighlightLanguageName('unknown')).toBe('');
        });
    });

    describe('escapeRegex', () => {
        it('should escape special regex characters', () => {
            expect(escapeRegex('hello.*')).toBe('hello\\.\\*');
        });
    });

    describe('getMarkdownImageSize', () => {
        it('should return correct size for sourceSize', () => {
            const size = getMarkdownImageSize(false, false, {width: 100, height: 200});
            expect(size).toEqual({width: 100, height: 200});
        });

        it('should return correct size for sourceSize without height', () => {
            const size = getMarkdownImageSize(false, false, {width: 100});
            expect(size).toEqual({width: 100, height: 100});
        });

        it('should return correct size for sourceSize without height and known size', () => {
            const size = getMarkdownImageSize(false, false, {width: 100}, {width: 100, height: 200});
            expect(size).toEqual({width: 100, height: 200});
        });

        it('should return correct size for sourceSize height height and known size', () => {
            const size = getMarkdownImageSize(false, false, {height: 100}, {width: 100, height: 200});
            expect(size).toEqual({width: 50, height: 100});
        });

        it('should return correct size for knownSize', () => {
            const size = getMarkdownImageSize(false, false, undefined, {width: 100, height: 200});
            expect(size).toEqual({width: 100, height: 200});
        });

        it('should return correct size when no metadata and source size is not specified', () => {
            const size = getMarkdownImageSize(false, false, undefined, undefined, 150, 250);
            expect(size).toEqual({width: 150, height: 250});
        });
    });

    describe('computeTextStyle', () => {
        const textStyles: { [key: string]: TextStyle } = {
            bold: {fontWeight: 'bold'},
            italic: {fontStyle: 'italic'},
            underline: {textDecorationLine: 'underline'},
        };

        const baseStyle: TextStyle = {color: 'black'};

        it('should return base style if context is empty', () => {
            expect(computeTextStyle(textStyles, baseStyle, [])).toEqual(baseStyle);
        });

        it('should return base style if context has no matching styles', () => {
            expect(computeTextStyle(textStyles, baseStyle, ['unknown'])).toEqual(baseStyle);
        });

        it('should apply a single context style', () => {
            expect(computeTextStyle(textStyles, baseStyle, ['bold'])).toEqual([baseStyle, textStyles.bold]);
        });

        it('should apply multiple context styles', () => {
            expect(computeTextStyle(textStyles, baseStyle, ['bold', 'italic'])).toEqual([baseStyle, textStyles.bold, textStyles.italic]);
        });

        it('should ignore undefined styles', () => {
            expect(computeTextStyle(textStyles, baseStyle, ['bold', 'unknown'])).toEqual([baseStyle, textStyles.bold]);
        });

        it('should handle multiple undefined styles', () => {
            expect(computeTextStyle(textStyles, baseStyle, ['unknown1', 'unknown2'])).toEqual(baseStyle);
        });
    });

    describe('parseSearchTerms', () => {
        it('should capture quoted strings', () => {
            expect(parseSearchTerms('"hello world"')).toEqual(['hello world']);
        });

        it('should ignore search flags', () => {
            expect(parseSearchTerms('in:channel before:2021-01-01')).toEqual([]);
        });

        it('should capture @ mentions', () => {
            expect(parseSearchTerms('@username')).toEqual(['username']);
        });

        it('should capture plain text up to the next quote or search flag', () => {
            expect(parseSearchTerms('plain text "quoted text"')).toEqual(['plain', 'text', 'quoted text']);
        });

        it('should split plain text into words', () => {
            expect(parseSearchTerms('this is a test')).toEqual(['this', 'is', 'a', 'test']);
        });

        it('should handle a mix of all cases', () => {
            const searchTerm = 'in:channel @username "quoted text" plain text';
            const expected = ['username', 'quoted text', 'plain', 'text'];
            expect(parseSearchTerms(searchTerm)).toEqual(expected);
        });
    });

    describe('convertSearchTermToRegex', () => {
        it('should create regex for CJK characters', () => {
            const result = convertSearchTermToRegex('你好');
            expect(result.pattern).toEqual(/()(你好)/gi);
        });

        it('should create regex for Thai characters', () => {
            const result = convertSearchTermToRegex('สวัสดี');
            expect(result.pattern).toEqual(/()(สวัสดี)/gi);
        });

        it('should create regex for wildcard at the end', () => {
            const result = convertSearchTermToRegex('hello*');
            expect(result.pattern).toEqual(/\b()(hello)/gi);
        });

        it('should create regex for mentions and hashtags', () => {
            const result = convertSearchTermToRegex('@user');
            expect(result.pattern).toEqual(/(\W|^)(@user)\b/gi);
        });

        it('should create regex for plain text', () => {
            const result = convertSearchTermToRegex('hello');
            expect(result.pattern).toEqual(/\b()(hello)\b/gi);
        });
    });

    describe('removeImageProxyForKey', () => {
        test('should return the original URL if the key contains a valid proxy URL with a query parameter', () => {
            const proxyKey = 'https://proxy.example.com/image?url=https%3A%2F%2Foriginal.example.com%2Fimage.png';
            const result = removeImageProxyForKey(proxyKey);
            expect(result).toBe('https://original.example.com/image.png');
        });

        test('should return the key itself if it does not contain a query parameter', () => {
            const key = 'https://proxy.example.com/image';
            const result = removeImageProxyForKey(key);
            expect(result).toBe(key);
        });

        test('should return the key itself if the query parameter does not contain a URL', () => {
            const key = 'https://proxy.example.com/image?otherParam=value';
            const result = removeImageProxyForKey(key);
            expect(result).toBe(key);
        });

        test('should decode the URL if it is encoded in the query parameter', () => {
            const proxyKey = 'https://proxy.example.com/image?url=https%3A%2F%2Foriginal.example.com%2Fpath%2Fto%2Fimage%3Fparam%3Dvalue';
            const result = removeImageProxyForKey(proxyKey);
            expect(result).toBe('https://original.example.com/path/to/image?param=value');
        });

        test('should handle keys with no query string gracefully', () => {
            const key = 'https://proxy.example.com/image';
            const result = removeImageProxyForKey(key);
            expect(result).toBe(key);
        });
    });
});
