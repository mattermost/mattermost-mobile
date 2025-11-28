// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import CookieManager from '@react-native-cookies/cookies';
import {Platform} from 'react-native';

import {clearCookies, clearCookiesForServer, getCSRFFromCookie, urlSafeBase64Encode} from './security';

// Mock CookieManager
jest.mock('@react-native-cookies/cookies', () => ({
    get: jest.fn(),
    clearByName: jest.fn(),
    flush: jest.fn(),
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

describe('clearCookies function', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should clear all cookies for the server URL', async () => {
        const serverUrl = 'https://example.com';
        const mockCookies = {
            MMCSRF: {name: 'MMCSRF'},
            MMAUTHTOKEN: {name: 'MMAUTHTOKEN'},
            MMUSERID: {name: 'MMUSERID'},
        };

        (CookieManager.get as jest.Mock).mockResolvedValue(mockCookies);
        (CookieManager.clearByName as jest.Mock).mockResolvedValue(true);

        await clearCookies(serverUrl, false);

        expect(CookieManager.get).toHaveBeenCalledWith(serverUrl, false);
        expect(CookieManager.clearByName).toHaveBeenCalledWith(serverUrl, 'MMCSRF', false);
        expect(CookieManager.clearByName).toHaveBeenCalledWith(serverUrl, 'MMAUTHTOKEN', false);
        expect(CookieManager.clearByName).toHaveBeenCalledWith(serverUrl, 'MMUSERID', false);
        expect(CookieManager.clearByName).toHaveBeenCalledTimes(3);
    });

    it('should use webKit parameter when clearing cookies', async () => {
        const serverUrl = 'https://example.com';
        const mockCookies = {
            MMCSRF: {name: 'MMCSRF'},
        };

        (CookieManager.get as jest.Mock).mockResolvedValue(mockCookies);
        (CookieManager.clearByName as jest.Mock).mockResolvedValue(true);

        await clearCookies(serverUrl, true);

        expect(CookieManager.get).toHaveBeenCalledWith(serverUrl, true);
        expect(CookieManager.clearByName).toHaveBeenCalledWith(serverUrl, 'MMCSRF', true);
    });

    it('should handle when no cookies exist', async () => {
        const serverUrl = 'https://example.com';
        const mockCookies = {};

        (CookieManager.get as jest.Mock).mockResolvedValue(mockCookies);

        await clearCookies(serverUrl, false);

        expect(CookieManager.get).toHaveBeenCalledWith(serverUrl, false);
        expect(CookieManager.clearByName).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
        const serverUrl = 'https://example.com';
        const mockCookies = {
            MMCSRF: {name: 'MMCSRF'},
        };

        (CookieManager.get as jest.Mock).mockResolvedValue(mockCookies);
        (CookieManager.clearByName as jest.Mock).mockRejectedValue(new Error('Clear failed'));

        // Should not throw
        await expect(clearCookies(serverUrl, false)).resolves.not.toThrow();

        expect(CookieManager.clearByName).toHaveBeenCalledWith(serverUrl, 'MMCSRF', false);
    });
});

describe('clearCookiesForServer function', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should clear cookies for iOS platform', async () => {
        Platform.OS = 'ios';
        const serverUrl = 'https://example.com';
        const mockCookies = {
            MMCSRF: {name: 'MMCSRF'},
        };

        (CookieManager.get as jest.Mock).mockResolvedValue(mockCookies);
        (CookieManager.clearByName as jest.Mock).mockResolvedValue(true);

        await clearCookiesForServer(serverUrl);

        // Should be called twice for iOS - once with webKit false, once with true
        expect(CookieManager.get).toHaveBeenCalledWith(serverUrl, false);
        expect(CookieManager.get).toHaveBeenCalledWith(serverUrl, true);
        expect(CookieManager.clearByName).toHaveBeenCalledWith(serverUrl, 'MMCSRF', false);
        expect(CookieManager.clearByName).toHaveBeenCalledWith(serverUrl, 'MMCSRF', true);
        expect(CookieManager.clearByName).toHaveBeenCalledTimes(2);
    });

    it('should flush cookies for Android platform', async () => {
        Platform.OS = 'android';
        const serverUrl = 'https://example.com';

        (CookieManager.flush as jest.Mock).mockResolvedValue(true);

        await clearCookiesForServer(serverUrl);

        // On Android, it should only flush (not clear individual cookies)
        expect(CookieManager.flush).toHaveBeenCalled();
        expect(CookieManager.get).not.toHaveBeenCalled();
        expect(CookieManager.clearByName).not.toHaveBeenCalled();
    });
});
