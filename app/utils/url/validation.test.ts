// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isValidLinkURL} from './validation';

describe('isValidLinkURL', () => {
    describe('valid URLs', () => {
        it('should accept valid http URLs', () => {
            expect(isValidLinkURL('http://example.com')).toBe(true);
            expect(isValidLinkURL('http://example.com/path')).toBe(true);
        });

        it('should accept valid https URLs', () => {
            expect(isValidLinkURL('https://example.com')).toBe(true);
            expect(isValidLinkURL('https://example.com/path/to/page')).toBe(true);
            expect(isValidLinkURL('https://example.com?param=value')).toBe(true);
        });

        it('should accept valid mattermost:// URLs', () => {
            expect(isValidLinkURL('mattermost://team/channels/channel')).toBe(true);
            expect(isValidLinkURL('mattermost://team/pl/postid')).toBe(true);
        });
    });

    describe('dangerous schemes', () => {
        it('should reject javascript: URLs', () => {
            expect(isValidLinkURL('javascript:alert("xss")')).toBe(false);
        });

        it('should reject data: URLs', () => {
            expect(isValidLinkURL('data:text/html,<script>alert("xss")</script>')).toBe(false);
        });

        it('should reject file: URLs', () => {
            expect(isValidLinkURL('file:///etc/passwd')).toBe(false);
        });

        it('should reject vbscript: URLs', () => {
            expect(isValidLinkURL('vbscript:msgbox("xss")')).toBe(false);
        });

        it('should reject about: URLs', () => {
            expect(isValidLinkURL('about:blank')).toBe(false);
        });
    });

    describe('unsupported schemes', () => {
        it('should reject custom app schemes', () => {
            expect(isValidLinkURL('customapp://path')).toBe(false);
            expect(isValidLinkURL('slack://channel')).toBe(false);
        });
    });

    describe('malformed URLs', () => {
        it('should reject URLs without scheme', () => {
            expect(isValidLinkURL('example.com')).toBe(false);
        });

        it('should reject empty strings', () => {
            expect(isValidLinkURL('')).toBe(false);
        });

        it('should reject http without host', () => {
            expect(isValidLinkURL('http://')).toBe(false);
        });

        it('should reject https without host', () => {
            expect(isValidLinkURL('https://')).toBe(false);
        });
    });
});
