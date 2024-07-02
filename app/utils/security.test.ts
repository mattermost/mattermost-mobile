// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CookieManager from '@react-native-cookies/cookies';

import {getCSRFFromCookie, urlSafeBase64Encode} from './security';

// Mock CookieManager
jest.mock('@react-native-cookies/cookies', () => ({
    get: jest.fn(),
}));

describe('getCSRFFromCookie function', () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear all mock calls after each test
    });

    it('should return MMCSRF value from cookies', async () => {
        const url = 'https://example.com';
        const mockCookies = {
            MMCSRF: {value: 'mock_CSRF_token'},
        };

        (CookieManager.get as jest.Mock).mockResolvedValue(mockCookies);

        const result = await getCSRFFromCookie(url);

        expect(CookieManager.get).toHaveBeenCalledWith(url, false);
        expect(result).toEqual('mock_CSRF_token');
    });

    it('should return undefined if MMCSRF value is not found', async () => {
        const url = 'https://example.com';
        const mockCookies = {};

        (CookieManager.get as jest.Mock).mockResolvedValue(mockCookies);

        const result = await getCSRFFromCookie(url);

        expect(CookieManager.get).toHaveBeenCalledWith(url, false);
        expect(result).toBeUndefined();
    });
});

describe('urlSafeBase64Encode function', () => {
    it('should encode a string to URL-safe Base64', () => {
        const input = 'Hello, World!';
        const expectedOutput = 'SGVsbG8sIFdvcmxkIQ==';

        const result = urlSafeBase64Encode(input);

        expect(result).toEqual(expectedOutput);
    });

    it('should handle special characters in the input string', () => {
        const input = 'a+b/c=d';
        const expectedOutput = 'YStiL2M9ZA==';

        const result = urlSafeBase64Encode(input);

        expect(result).toEqual(expectedOutput);
    });

    it('should handle empty input', () => {
        const input = '';
        const expectedOutput = '';

        const result = urlSafeBase64Encode(input);

        expect(result).toEqual(expectedOutput);
    });
});
