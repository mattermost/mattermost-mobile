// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isValidAppSchemeUrl, isValidUrlOrAppScheme} from './index';

describe('App Scheme URL Validation', () => {
    describe('isValidAppSchemeUrl', () => {
        it('should return true for valid mattermost:// URLs', () => {
            expect(isValidAppSchemeUrl('mattermost://community.mattermost.com/core/channels/town-square')).toBe(true);
            expect(isValidAppSchemeUrl('mattermost://localhost:8065/team/channels/channel')).toBe(true);
        });

        it('should return true for other valid app scheme URLs', () => {
            expect(isValidAppSchemeUrl('slack://channel?team=T123&id=C123')).toBe(true);
            expect(isValidAppSchemeUrl('discord://channel/123/456')).toBe(true);
            expect(isValidAppSchemeUrl('custom-app://some/path')).toBe(true);
        });

        it('should return false for HTTP/HTTPS URLs', () => {
            expect(isValidAppSchemeUrl('https://example.com')).toBe(false);
            expect(isValidAppSchemeUrl('http://example.com')).toBe(false);
        });

        it('should return false for FTP and FILE URLs', () => {
            expect(isValidAppSchemeUrl('ftp://example.com')).toBe(false);
            expect(isValidAppSchemeUrl('file:///path/to/file')).toBe(false);
        });

        it('should return false for invalid URLs', () => {
            expect(isValidAppSchemeUrl('not-a-url')).toBe(false);
            expect(isValidAppSchemeUrl('://invalid')).toBe(false);
            expect(isValidAppSchemeUrl('')).toBe(false);
        });

        it('should return false for URLs without scheme', () => {
            expect(isValidAppSchemeUrl('example.com')).toBe(false);
            expect(isValidAppSchemeUrl('/path/to/resource')).toBe(false);
        });
    });

    describe('isValidUrlOrAppScheme', () => {
        it('should return true for valid HTTP/HTTPS URLs', () => {
            expect(isValidUrlOrAppScheme('https://example.com')).toBe(true);
            expect(isValidUrlOrAppScheme('http://example.com')).toBe(true);
        });

        it('should return true for valid app scheme URLs', () => {
            expect(isValidUrlOrAppScheme('mattermost://community.mattermost.com')).toBe(true);
            expect(isValidUrlOrAppScheme('custom-app://some/path')).toBe(true);
        });

        it('should return false for invalid URLs', () => {
            expect(isValidUrlOrAppScheme('not-a-url')).toBe(false);
            expect(isValidUrlOrAppScheme('')).toBe(false);
        });
    });
});
