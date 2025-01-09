// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getDistanceBW2Points, getNearestPoint, fetchOpenGraph, testExports} from './opengraph';

const {fetchRaw, getFavIcon} = testExports;

let mockedFetch: jest.SpyInstance;

beforeEach(() => {
    mockedFetch = jest.spyOn(global, 'fetch');
});

afterEach(() => {
    jest.clearAllMocks();
});

describe('Utility Functions', () => {
    describe('getDistanceBW2Points', () => {
        test('calculates the distance correctly', () => {
            const point1 = {x: 1, y: 1};
            const point2 = {x: 4, y: 5};
            const distance = getDistanceBW2Points(point1, point2);
            expect(distance).toBeCloseTo(5);
        });

        test('calculates the distance correctly with custom attributes', () => {
            const point1 = {a: 1, b: 1};
            const point2 = {a: 4, b: 5};
            const distance = getDistanceBW2Points(point1, point2, 'a', 'b');
            expect(distance).toBeCloseTo(5);
        });
    });

    describe('getNearestPoint', () => {
        test('finds the nearest point correctly', () => {
            const pivotPoint = {height: 0, width: 0};
            const points = [
                {x: 1, y: 1},
                {x: 2, y: 2},
                {x: -1, y: -1},
            ] as never[];
            const nearestPoint = getNearestPoint(pivotPoint, points);
            expect(nearestPoint).toEqual({x: 1, y: 1});
        });

        test('returns an empty object if points array is empty', () => {
            const pivotPoint = {height: 0, width: 0};
            const points: never[] = [];
            const nearestPoint = getNearestPoint(pivotPoint, points);
            expect(nearestPoint).toEqual({});
        });

        test('finds the nearest point with custom attributes', () => {
            const pivotPoint = {height: 0, width: 0};
            const points = [
                {a: 1, b: 1},
                {a: 2, b: 2},
                {a: -1, b: -1},
            ] as never[];
            const nearestPoint = getNearestPoint(pivotPoint, points, 'a', 'b');
            expect(nearestPoint).toEqual({a: 1, b: 1});
        });

        test('updates nearest point based on distance comparison', () => {
            const pivotPoint = {height: 0, width: 0};
            const points = [
                {x: 5, y: 5},
                {x: 2, y: 2},
                {x: 3, y: 3},
            ] as never[];
            const nearestPoint = getNearestPoint(pivotPoint, points);
            expect(nearestPoint).toEqual({x: 2, y: 2});
        });
    });
});

describe('fetchRaw', () => {
    it('should fetch raw HTML from a URL', async () => {
        const mockResponse = {
            ok: true,
            text: jest.fn().mockResolvedValue('<html></html>'),
        };
        mockedFetch.mockResolvedValue(mockResponse as any);

        const result = await fetchRaw('http://example.com');
        expect(fetch).toHaveBeenCalledWith('http://example.com', {
            headers: {
                'User-Agent': 'OpenGraph',
                'Cache-Control': 'no-cache',
                Accept: '*/*',
                Connection: 'keep-alive',
            },
        });
        expect(result).toBe('<html></html>');
    });

    it('should return response if not ok', async () => {
        const mockResponse = {
            ok: false,
        };
        mockedFetch.mockResolvedValue(mockResponse as any);

        const result = await fetchRaw('http://example.com');
        expect(result).toBe(mockResponse);
    });

    it('should return error message on fetch failure', async () => {
        const mockError = new Error('Network error');
        mockedFetch.mockRejectedValue(mockError);

        const result = await fetchRaw('http://example.com');
        expect(result).toEqual({message: 'Network error'});
    });
});

describe('getFavIcon', () => {
    it('should return the largest favicon URL', () => {
        const mockHtml = '<html><head><link rel="icon" href="/favicon-32x32.png" sizes="32x32"><link rel="icon" href="/favicon-16x16.png" sizes="16x16"></head></html>';
        const result = getFavIcon('http://example.com', mockHtml);
        expect(result).toBe('http://example.com/favicon-32x32.png');
    });

    it('should return default favicon URL if no icons found', () => {
        const mockHtml = '<html><head></head></html>';
        const result = getFavIcon('http://example.com', mockHtml);
        expect(result).toBe('http://example.com/favicon.ico');
    });

    it('should handle shortcut icon rel attribute', () => {
        const mockHtml = '<html><head><link rel="shortcut icon" href="/favicon.png"></head></html>';
        const result = getFavIcon('http://example.com', mockHtml);
        expect(result).toBe('http://example.com/favicon.png');
    });

    it('should handle absolute URLs in href', () => {
        const mockHtml = '<html><head><link rel="icon" href="https://cdn.example.com/favicon.png"></head></html>';
        const result = getFavIcon('http://example.com', mockHtml);
        expect(result).toBe('https://cdn.example.com/favicon.png');
    });

    it('should handle icons without sizes attribute', () => {
        const mockHtml = '<html><head><link rel="icon" href="/favicon.png"><link rel="icon" href="/favicon-32x32.png" sizes="32x32"></head></html>';
        const result = getFavIcon('http://example.com', mockHtml);
        expect(result).toBe('http://example.com/favicon-32x32.png');
    });
});

describe('fetchOpenGraph', () => {
    it('should fetch OpenGraph data from a URL', async () => {
        const mockHtml = '<html><head><title>Example</title><meta property="og:title" content="OpenGraph Title"><meta property="og:image" content="http://example.com/image.png"></head></html>';
        const mockResponse = {
            ok: true,
            text: jest.fn().mockResolvedValue(mockHtml),
        };
        mockedFetch.mockResolvedValue(mockResponse as any);

        const result = await fetchOpenGraph('http://example.com', true);
        expect(result).toEqual({
            link: 'http://example.com',
            imageURL: 'http://example.com/image.png',
            favIcon: 'http://example.com/favicon.ico',
            title: 'OpenGraph Title',
        });
    });

    it('should return error if fetchRaw fails', async () => {
        const mockError = {message: 'Network error'};
        mockedFetch.mockRejectedValue(mockError);

        const result = await fetchOpenGraph('http://example.com');
        expect(result).toEqual({
            link: 'http://example.com',
            error: new Error('Network error'),
        });
    });

    it('should return default title if og:title is not found', async () => {
        const mockHtml = '<html><head><title>Example</title></head></html>';
        const mockResponse = {
            ok: true,
            text: jest.fn().mockResolvedValue(mockHtml),
        };
        mockedFetch.mockResolvedValue(mockResponse as any);

        const result = await fetchOpenGraph('http://example.com');
        expect(result).toEqual({
            link: 'http://example.com',
            imageURL: null,
            favIcon: undefined,
            title: 'Example',
        });
    });
});
