// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {isParsableUrl, safeDecodeURIComponent} from './index';

describe('safeDecodeURIComponent', () => {
    test('should decode a valid URI component', () => {
        const encoded = 'Hello%20World';
        const decoded = safeDecodeURIComponent(encoded);
        expect(decoded).toBe('Hello World');
    });

    test('should return the input if it is not a valid URI component', () => {
        const invalidEncoded = '%E0%A4%A';
        const result = safeDecodeURIComponent(invalidEncoded);
        expect(result).toBe(invalidEncoded);
    });

    test('should decode a complex URI component', () => {
        const encoded = 'Hello%20World%21%20How%20are%20you%3F';
        const decoded = safeDecodeURIComponent(encoded);
        expect(decoded).toBe('Hello World! How are you?');
    });

    test('should return empty string if input is empty', () => {
        const encoded = '';
        const decoded = safeDecodeURIComponent(encoded);
        expect(decoded).toBe('');
    });
});

describe('isParsableUrl', () => {
    it('should return true for valid URLs', () => {
        expect(isParsableUrl('http://example.com')).toBe(true);
        expect(isParsableUrl('https://example.com')).toBe(true);
        expect(isParsableUrl('https://example.com/path')).toBe(true);
        expect(isParsableUrl('https://example.com:8080/path?query=1')).toBe(true);
        expect(isParsableUrl('https://sub.domain.example.com')).toBe(true);
        expect(isParsableUrl('ftp://example.com')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
        expect(isParsableUrl('example')).toBe(false);
        expect(isParsableUrl('://example.com')).toBe(false);
        expect(isParsableUrl('http//example.com')).toBe(false);
        expect(isParsableUrl('')).toBe(false);
    });

    it('should return false for non-URL strings', () => {
        expect(isParsableUrl('plain text')).toBe(false);
        expect(isParsableUrl('12345')).toBe(false);
    });

    it('should handle URLs with special characters correctly', () => {
        expect(isParsableUrl('https://example.com/path?query=value&other=value')).toBe(true);
        expect(isParsableUrl('https://example.com/path#hash')).toBe(true);
        expect(isParsableUrl('https://example.com:3000/path?query=1')).toBe(true);
    });

    it('should handle edge cases gracefully', () => {
        expect(isParsableUrl('   ')).toBe(false);
        expect(isParsableUrl(null as unknown as string)).toBe(false);
        expect(isParsableUrl(undefined as unknown as string)).toBe(false);
    });
});
