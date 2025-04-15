// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import GenericClient, {type ClientResponse} from '@mattermost/react-native-network-client';
import {Linking} from 'react-native';

import {
    cleanUpUrlable,
    cleanUrlForLogging,
    extractFilenameFromUrl,
    extractFirstLink,
    extractStartLink,
    getScheme,
    getServerUrlAfterRedirect,
    getShortenedURL,
    getUrlAfterRedirect,
    getYouTubeVideoId,
    isImageLink,
    isParsableUrl,
    isValidUrl,
    isYoutubeLink,
    normalizeProtocol,
    removeProtocol,
    safeDecodeURIComponent,
    sanitizeUrl,
    stripTrailingSlashes,
    tryOpenURL,
} from './index';

jest.mock('@mattermost/react-native-network-client', () => ({
    head: jest.fn(),
}));

const mockedOpenURL = jest.spyOn(Linking, 'openURL');

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

describe('isValidUrl', () => {
    test('should return true for valid http URL', () => {
        const url = 'http://example.com';
        const result = isValidUrl(url);
        expect(result).toBe(true);
    });

    test('should return true for valid https URL', () => {
        const url = 'https://example.com';
        const result = isValidUrl(url);
        expect(result).toBe(true);
    });

    test('should return false for invalid URL without protocol', () => {
        const url = 'example.com';
        const result = isValidUrl(url);
        expect(result).toBe(false);
    });

    test('should return false for invalid URL with unsupported protocol', () => {
        const url = 'ftp://example.com';
        const result = isValidUrl(url);
        expect(result).toBe(false);
    });

    test('should return false for no arguments', () => {
        const result = isValidUrl();
        expect(result).toBe(false);
    });
});

describe('sanitizeUrl', () => {
    test('should return sanitized URL with https protocol', () => {
        const url = 'example.com';
        const result = sanitizeUrl(url);
        expect(result).toBe('https://example.com');
    });

    test('should return sanitized URL with http protocol when useHttp is true for url without protocol', () => {
        const url = 'example.com';
        const result = sanitizeUrl(url, true);
        expect(result).toBe('http://example.com');
    });

    test('should return sanitized URL with https protocol for url without protocol', () => {
        const url = 'example.com';
        const result = sanitizeUrl(url, false);
        expect(result).toBe('https://example.com');
    });

    test('should return sanitized URL with trailing slashes removed', () => {
        const url = 'https://example.com/';
        const result = sanitizeUrl(url);
        expect(result).toBe('https://example.com');
    });

    test('should return sanitized URL using https', () => {
        const url = 'http://example.com/';
        const result = sanitizeUrl(url, false);
        expect(result).toBe('https://example.com');
    });
});

describe('getUrlAfterRedirect', () => {
    test('should return the final URL after redirect', async () => {
        global.fetch = jest.fn().mockResolvedValue({url: 'https://final-url.com'});
        const url = 'https://example.com';
        const result = await getUrlAfterRedirect(url);
        expect(result).toEqual({url: 'https://final-url.com'});
    });

    test('should return error if fetch fails', async () => {
        const error = new Error('Network error');
        global.fetch = jest.fn().mockRejectedValue(error);
        const url = 'https://example.com';
        const result = await getUrlAfterRedirect(url);
        expect(result).toEqual({error});
    });
});

describe('getServerUrlAfterRedirect', () => {
    const mockedHead = jest.mocked(GenericClient.head);

    test('should return the final server URL after redirect', async () => {
        mockedHead.mockResolvedValue({redirectUrls: ['https://redirect-url.com', 'https://final-url.com']} as ClientResponse);
        const serverUrl = 'https://example.com';
        const result = await getServerUrlAfterRedirect(serverUrl);
        expect(result).toEqual({url: 'https://final-url.com'});
    });

    test('should return error if GenericClient.head fails', async () => {
        const error = new Error('Network error');
        mockedHead.mockRejectedValue(error);
        const serverUrl = 'https://example.com';
        const result = await getServerUrlAfterRedirect(serverUrl);
        expect(result).toEqual({error});
    });
});

describe('stripTrailingSlashes', () => {
    test('should remove trailing slashes from URL', () => {
        const url = 'https://example.com/';
        const result = stripTrailingSlashes(url);
        expect(result).toBe('https://example.com');
    });

    test('should remove leading and trailing slashes from URL', () => {
        const url = '/example.com/';
        const result = stripTrailingSlashes(url);
        expect(result).toBe('example.com');
    });

    test('should remove spaces and trailing slashes from URL', () => {
        const url = ' https://example.com/ ';
        const result = stripTrailingSlashes(url);
        expect(result).toBe('https://example.com');
    });

    test('should return blank for no arguments', () => {
        const result = stripTrailingSlashes();
        expect(result).toBe('');
    });
});

describe('removeProtocol', () => {
    test('should remove protocol from URL', () => {
        const url = 'https://example.com';
        const result = removeProtocol(url);
        expect(result).toBe('example.com');
    });

    test('should return URL without protocol if no protocol is present', () => {
        const url = 'example.com';
        const result = removeProtocol(url);
        expect(result).toBe('example.com');
    });

    test('should return blank for no arguments', () => {
        const result = removeProtocol();
        expect(result).toBe('');
    });
});

describe('extractFirstLink', () => {
    test('should extract the first link from text', () => {
        const text = 'Check this out: https://example.com and this https://another.com';
        const result = extractFirstLink(text);
        expect(result).toBe('https://example.com');
    });

    test('should return empty string if no link is found', () => {
        const text = 'No links here';
        const result = extractFirstLink(text);
        expect(result).toBe('');
    });
});

describe('extractStartLink', () => {
    test('should extract the start link from text', () => {
        const text = 'https://example.com is a great site';
        const result = extractStartLink(text);
        expect(result).toBe('https://example.com');
    });

    test('should return empty string if no link is found', () => {
        const text = 'No links here';
        const result = extractStartLink(text);
        expect(result).toBe('');
    });
});

describe('isYoutubeLink', () => {
    test('should return true for a valid YouTube link', () => {
        const link = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        const result = isYoutubeLink(link);
        expect(result).toBeTruthy();
    });

    test('should return false for an invalid YouTube link', () => {
        const link = 'https://example.com';
        const result = isYoutubeLink(link);
        expect(result).toBeFalsy();
    });
});

describe('isImageLink', () => {
    test('should return true for a valid image link', () => {
        const link = 'https://example.com/image.png';
        const result = isImageLink(link);
        expect(result).toBe(true);
    });

    test('should return false for an invalid image link', () => {
        const link = 'https://example.com';
        const result = isImageLink(link);
        expect(result).toBe(false);
    });
});

describe('normalizeProtocol', () => {
    test('should normalize the protocol to lowercase', () => {
        const url = 'HTTPS://example.com';
        const result = normalizeProtocol(url);
        expect(result).toBe('https://example.com');
    });

    test('should return the URL if no protocol is present', () => {
        const url = 'example.com';
        const result = normalizeProtocol(url);
        expect(result).toBe('example.com');
    });
});

describe('getShortenedURL', () => {
    test('should return shortened URL', () => {
        const url = 'https://example.com/this/is/a/very/long/url/that/needs/to/be/shortened';
        const result = getShortenedURL(url);
        expect(result).toBe('https://ex.../be/shortened/');
    });

    test('should return shortened URL with specified cutoff length', () => {
        const url = 'https://example.com/this/is/a/very/long/url/that/needs/to/be/shortened';
        const result = getShortenedURL(url, 30);
        expect(result).toBe('https://ex.../to/be/shortened/');
    });

    test('should return the original URL', () => {
        const url = 'https://example.com/short/url';
        const result = getShortenedURL(url);
        expect(result).toBe('https://example.com/short/url/');
    });

    test('should return / for no argument', () => {
        const result = getShortenedURL();
        expect(result).toBe('/');
    });
});

describe('cleanUpUrlable', () => {
    test('should clean up the input to be URL-friendly', () => {
        const input = 'Hello World!';
        const result = cleanUpUrlable(input);
        expect(result).toBe('hello-world');
    });

    test('should remove special characters and spaces', () => {
        const input = 'Hello @ World!';
        const result = cleanUpUrlable(input);
        expect(result).toBe('hello-world');
    });
});

describe('getScheme', () => {
    test('should return the scheme of the URL', () => {
        const url = 'https://example.com';
        const result = getScheme(url);
        expect(result).toBe('https');
    });

    test('should return null if no scheme is present', () => {
        const url = 'example.com';
        const result = getScheme(url);
        expect(result).toBeNull();
    });
});

describe('getYouTubeVideoId', () => {
    test('should return the video ID from a YouTube link', () => {
        const link = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        const result = getYouTubeVideoId(link);
        expect(result).toBe('dQw4w9WgXcQ');
    });

    test('should return empty string if no video ID is found', () => {
        const link = 'https://example.com';
        const result = getYouTubeVideoId(link);
        expect(result).toBe('');
    });
});

describe('tryOpenURL', () => {
    const url = 'https://example.com';

    test('should open the URL successfully', (done) => {
        const onError = jest.fn();
        const onSuccess = jest.fn(done());

        mockedOpenURL.mockResolvedValue(true);

        tryOpenURL(url, onError, onSuccess);

        expect(mockedOpenURL).toHaveBeenCalledWith(url);
    });

    test('should call onError if opening the URL fails', (done) => {
        const onError = jest.fn(done());
        const onSuccess = jest.fn();

        mockedOpenURL.mockRejectedValue(new Error('Network error'));

        tryOpenURL(url, onError, onSuccess);

        expect(mockedOpenURL).toHaveBeenCalledWith(url);
    });

    test('should open the URL successfully with default arguments', () => {
        mockedOpenURL.mockResolvedValue(true);

        tryOpenURL(url);

        expect(mockedOpenURL).toHaveBeenCalledWith(url);
    });
});

describe('cleanUrlForLogging', () => {
    const baseUrl = 'https://example.com';

    test('should clean the URL for logging', () => {
        const apiUrl = 'https://example.com/api/v4/users/me';
        const result = cleanUrlForLogging(baseUrl, apiUrl);
        expect(result).toBe('/api/v4/users/me');
    });

    test('should filter the query string from the URL', () => {
        const apiUrl = 'https://example.com/api/v4/users/me?token=123';
        const result = cleanUrlForLogging(baseUrl, apiUrl);
        expect(result).toBe('/api/v4/users/me?<filtered>');
    });

    test('should filter out unrecognized parts of the URL', () => {
        const apiUrl = 'https://example.com/api/v4/users/me/unknown';
        const result = cleanUrlForLogging(baseUrl, apiUrl);
        expect(result).toBe('/api/v4/users/me/<filtered>');
    });
});

describe('extractFilenameFromUrl', () => {
    test('should extract the filename from the URL', () => {
        const url = 'https://example.com/path/to/file.txt';
        const result = extractFilenameFromUrl(url);
        expect(result).toBe('file.txt');
    });

    test('should return blank if no filename is found', () => {
        const url = 'https://example.com/path/to/';
        const result = extractFilenameFromUrl(url);
        expect(result).toBe('');
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
        expect(isParsableUrl('example.com')).toBe(false); // Missing protocol
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
