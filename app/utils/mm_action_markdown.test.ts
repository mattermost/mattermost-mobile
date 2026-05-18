// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {parseMmActionMarkdownHref} from './mm_action_markdown';

describe('parseMmActionMarkdownHref', () => {
    it('should parse mmaction links with action id in host or path', () => {
        expect(parseMmActionMarkdownHref('mmaction:approve')).toEqual({
            actionId: 'approve',
            query: {},
        });
        expect(parseMmActionMarkdownHref('mmaction://submit')).toEqual({
            actionId: 'submit',
            query: {},
        });
    });

    it('should parse query parameters', () => {
        expect(parseMmActionMarkdownHref('mmaction:go?foo=bar&baz=1')).toEqual({
            actionId: 'go',
            query: {foo: 'bar', baz: '1'},
        });
    });

    it('should decode path action ids', () => {
        expect(parseMmActionMarkdownHref('mmaction:my%2Fact')).toEqual({
            actionId: 'my/act',
            query: {},
        });
    });

    it('should return null for non-mmaction links', () => {
        expect(parseMmActionMarkdownHref('https://example.com')).toBeNull();
        expect(parseMmActionMarkdownHref('mmaction:')).toBeNull();
    });
});
