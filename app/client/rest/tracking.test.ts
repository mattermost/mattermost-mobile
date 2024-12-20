// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import LocalConfig from '@assets/config.json';
import {Events} from '@constants';
import test_helper from '@test/test_helper';

import * as ClientConstants from './constants';
import ClientTracking from './tracking';

import type ClientError from './error';
import type {APIClientInterface, ClientResponseMetrics} from '@mattermost/react-native-network-client';

jest.mock('react-native', () => ({
    DeviceEventEmitter: {
        emit: jest.fn(),
    },
    Platform: {
        OS: 'ios',
        select: jest.fn(({ios, default: def}: any) => {
            return ios ?? def;
        }),
    },
}));

jest.mock('@mattermost/rnutils', () => ({
    getIOSAppGroupDetails: jest.fn().mockRejectedValue(''),
    isRunningInSplitView: jest.fn().mockReturnValue({isSplit: false, isTablet: false}),
}));

jest.mock('expo-crypto', () => ({
    randomUUID: jest.fn(() => '12345678-1234-1234-1234-1234567890ab'),
}));

jest.mock('@i18n', () => ({
    t: jest.fn((key) => key),
}));

jest.mock('@utils/file', () => ({
    getFormattedFileSize: jest.fn((size) => `${size} bytes`),
}));

jest.mock('@utils/log', () => ({
    logDebug: jest.fn(),
    logInfo: jest.fn(),
}));

jest.mock('@utils/server', () => ({
    semverFromServerVersion: jest.fn((version) => version),
}));

jest.mock('@init/credentials', () => ({
    setServerCredentials: jest.fn(),
}));

jest.mock('@managers/performance_metrics_manager', () => ({
    collectNetworkRequestData: jest.fn(),
}));

describe('ClientTracking', () => {
    const apiClientMock = {
        baseUrl: 'https://example.com',
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
    };

    let client: ClientTracking;

    beforeAll(() => {
        LocalConfig.CollectNetworkMetrics = true;
    });

    afterAll(() => {
        LocalConfig.CollectNetworkMetrics = false;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        client = new ClientTracking(apiClientMock as unknown as APIClientInterface);
    });

    it('should set bearer token', () => {
        const token = 'testToken';
        client.setBearerToken(token);

        expect(client.requestHeaders[ClientConstants.HEADER_AUTH]).toBe(`${ClientConstants.HEADER_BEARER} ${token}`);
        expect(require('@init/credentials').setServerCredentials).toHaveBeenCalledWith(apiClientMock.baseUrl, token);
    });

    it('should set CSRF token', () => {
        const token = 'csrfToken';
        client.setCSRFToken(token);

        expect(client.csrfToken).toBe(token);
    });

    it('should get request headers', () => {
        client.setCSRFToken('csrfToken');
        client.setBearerToken('testToken');

        const headers = client.getRequestHeaders('POST');
        expect(headers[ClientConstants.HEADER_AUTH]).toBe(`${ClientConstants.HEADER_BEARER} testToken`);
        expect(headers[ClientConstants.HEADER_X_CSRF_TOKEN]).toBe('csrfToken');
    });

    it('should initialize and track group data', () => {
        client.initTrackGroup('Cold Start');
        expect(client.requestGroups.has('Cold Start')).toBe(true);

        client.trackRequest('Cold Start', 'https://example.com/api', {size: 100, compressedSize: 50} as ClientResponseMetrics);
        const group = client.requestGroups.get('Cold Start')!;
        expect(group.totalSize).toBe(100);
        expect(group.totalCompressedSize).toBe(50);
        expect(group.urls['https://example.com/api'].count).toBe(1);
    });

    it('should increment and decrement request count', () => {
        client.initTrackGroup('Cold Start');
        client.incrementRequestCount('Cold Start');
        let group = client.requestGroups.get('Cold Start')!;
        expect(group.activeCount).toBe(1);

        client.decrementRequestCount('Cold Start');
        group = client.requestGroups.get('Cold Start')!;
        expect(group.activeCount).toBe(0);
    });

    it('should handle request completion', () => {
        client.initTrackGroup('Cold Start');
        client.handleRequestCompletion('Cold Start');

        expect(require('@utils/log').logDebug).toHaveBeenCalledWith('Group "Cold Start" completed.');
    });

    it('should clear completion timer', () => {
        client.initTrackGroup('Cold Start');
        const group = client.requestGroups.get('Cold Start')!;
        group.completionTimer = setTimeout(() => {}, 100);

        client.clearCompletionTimer('Cold Start');
        expect(group.completionTimer).toBeUndefined();
    });

    it('should check if all requests are completed', () => {
        client.initTrackGroup('Cold Start');
        const result = client.allRequestsCompleted('Cold Start');
        expect(result).toBe(true);
    });

    it('should send telemetry event', () => {
        client.initTrackGroup('Cold Start');
        const group = client.requestGroups.get('Cold Start')!;
        group.urls = {
            'https://example.com/api': {
                count: 2,
                metrics: {
                    latency: 200,
                    startTime: Date.now(),
                    endTime: Date.now() + 300,
                    speedInMbps: 1,
                    networkType: 'Wi-Fi',
                    tlsCipherSuite: 'none',
                    tlsVersion: 'none',
                    isCached: false,
                    httpVersion: 'h2',
                    compressedSize: 10 * 1024,
                    size: 6 * 1024 * 1024,
                    connectionTime: 0,
                },
            },
        };

        client.sendTelemetryEvent('Cold Start', group, 1000);
        expect(require('@utils/log').logInfo).toHaveBeenCalled();
    });

    it('should build request options', () => {
        const options = {
            body: {key: 'value'},
            method: 'POST',
            noRetry: true,
            timeoutInterval: 5000,
            headers: {custom: 'header'},
        };

        const result = client.buildRequestOptions(options);
        expect(result.headers?.custom).toBe('header');
        expect(result.retryPolicyConfiguration?.retryLimit).toBe(0);
        expect(result.timeoutInterval).toBe(5000);
    });

    it('should perform fetch with tracking', async () => {
        apiClientMock.get.mockResolvedValue({
            ok: true,
            data: {success: true},
            headers: {},
        });

        const options = {
            method: 'GET',
            groupLabel: 'Cold Start' as RequestGroupLabel,
        };

        const result = await client.doFetchWithTracking('https://example.com/api', options);
        expect(result).toEqual({success: true});
    });

    it('should handle fetch errors', async () => {
        apiClientMock.get.mockRejectedValue(new Error('Request failed'));

        const options = {
            method: 'GET',
            groupLabel: 'Cold Start' as RequestGroupLabel,
        };

        await expect(client.doFetchWithTracking('https://example.com/api', options)).rejects.toThrow('Received invalid response from the server.');
    });

    it('should handle non-ok response with error details', async () => {
        apiClientMock.get.mockResolvedValue({
            ok: false,
            data: {
                message: 'Custom error message',
                id: 'error_id_123',
            },
            code: 400,
        });

        const options = {
            method: 'GET',
            groupLabel: 'Cold Start' as RequestGroupLabel,
        };

        try {
            await client.doFetchWithTracking('https://example.com/api', options);
            fail('Expected error to be thrown');
        } catch (error: unknown) {
            const clientError = error as ClientError;

            expect((clientError.details as {message: string}).message).toBe('Custom error message');
            expect((clientError.details as {server_error_id: string}).server_error_id).toBe('error_id_123');
            expect((clientError.details as {status_code: string}).status_code).toBe(400);
        }
    });

    it('should handle non-ok response without error details', async () => {
        apiClientMock.get.mockResolvedValue({
            ok: false,
            data: {},
            code: 500,
        });

        const options = {
            method: 'GET',
            groupLabel: 'Cold Start' as RequestGroupLabel,
        };

        try {
            await client.doFetchWithTracking('https://example.com/api', options);
            fail('Expected error to be thrown');
        } catch (error: unknown) {
            const clientError = error as ClientError;

            expect((clientError.details as {message: string}).message).toBe('Response with status code 500');
            expect((clientError.details as {status_code: string}).status_code).toBe(500);
        }
    });

    it('should handle response with bearer token header', async () => {
        apiClientMock.get.mockResolvedValue({
            ok: true,
            data: {success: true},
            headers: {
                Token: 'new_bearer_token',
            },
        });

        const options = {
            method: 'GET',
            groupLabel: 'Cold Start' as RequestGroupLabel,
        };

        await client.doFetchWithTracking('https://example.com/api', options);
        expect(client.requestHeaders[ClientConstants.HEADER_AUTH]).toBe(`${ClientConstants.HEADER_BEARER} new_bearer_token`);
    });

    it('should handle response with lowercase bearer token header', async () => {
        apiClientMock.get.mockResolvedValue({
            ok: true,
            data: {success: true},
            headers: {
                token: 'new_lowercase_token',
            },
        });

        const options = {
            method: 'GET',
            groupLabel: 'Cold Start' as RequestGroupLabel,
        };

        await client.doFetchWithTracking('https://example.com/api', options);
        expect(client.requestHeaders[ClientConstants.HEADER_AUTH]).toBe(`${ClientConstants.HEADER_BEARER} new_lowercase_token`);
    });

    it('should call increment and decrement the same number of times as doFetchWithTracking, and handleRequestCompletion only once', async () => {
        const incrementSpy = jest.spyOn(client, 'incrementRequestCount');
        const decrementSpy = jest.spyOn(client, 'decrementRequestCount');
        const handleRequestCompletionSpy = jest.spyOn(client, 'handleRequestCompletion');

        apiClientMock.get.mockImplementation(() => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        ok: true,
                        data: {success: true},
                        headers: {},
                        metrics: {latency: 200, size: 500, compressedSize: 300, startTime: Date.now(), endTime: Date.now() + 100, speedInMbps: 1},
                    });
                }, 200); // Simulate a 100ms network delay
            });
        });

        client.initTrackGroup('Cold Start');

        // Simulate multiple fetch calls
        const promises = [
            client.doFetchWithTracking('https://example.com/api1', {method: 'GET', groupLabel: 'Cold Start'}),
            client.doFetchWithTracking('https://example.com/api2', {method: 'GET', groupLabel: 'Cold Start'}),
            client.doFetchWithTracking('https://example.com/api3', {method: 'GET', groupLabel: 'Cold Start'}),
        ];

        // Wait for all fetches to resolve
        await Promise.all(promises);

        const group = client.requestGroups.get('Cold Start')!;
        expect(group.activeCount).toBe(0);

        await test_helper.wait(300);

        expect(handleRequestCompletionSpy).toHaveBeenCalledTimes(1);
        expect(incrementSpy).toHaveBeenCalledTimes(3);
        expect(decrementSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle invalid HTTP method', async () => {
        const options = {
            method: 'INVALID' as string,
            groupLabel: 'Cold Start' as RequestGroupLabel,
        };

        const result = await client.doFetchWithTracking('https://example.com/api', options) as unknown as {error: string};
        expect(result.error).toEqual(new Error('Invalid request method'));
    });

    it('should handle server version changes without cache control', async () => {
        apiClientMock.get.mockResolvedValue({
            ok: true,
            data: {success: true},
            headers: {
                'x-version-id': '5.30.0',
            },
        });

        await client.doFetchWithTracking('https://example.com/api', {
            method: 'GET',
            groupLabel: 'Cold Start',
        });

        expect(client.serverVersion).toBe('5.30.0');
        expect(DeviceEventEmitter.emit).toHaveBeenCalledWith(
            Events.SERVER_VERSION_CHANGED,
            {serverUrl: 'https://example.com', serverVersion: '5.30.0'},
        );
    });

    it('should not update server version when cache control present', async () => {
        client.serverVersion = '5.30.0';
        apiClientMock.get.mockResolvedValue({
            ok: true,
            data: {success: true},
            headers: {
                'x-version-id': '5.31.0',
                'Cache-Control': 'no-cache',
            },
        });

        await client.doFetchWithTracking('https://example.com/api', {
            method: 'GET',
            groupLabel: 'Cold Start',
        });

        expect(client.serverVersion).toBe('5.30.0'); // Should not change from previous test
    });

    it('should handle zero transfer time in speed calculation', async () => {
        client.initTrackGroup('Cold Start');
        const group = client.requestGroups.get('Cold Start')!;

        // Set up metrics where transfer time would be zero
        group.urls = {
            'https://example.com/api': {
                count: 1,
                metrics: {
                    latency: 1000,
                    startTime: Date.now(),
                    endTime: Date.now() + 1000,
                    speedInMbps: 0,
                    size: 1000,
                    compressedSize: 500,
                } as unknown as ClientResponseMetrics,
            },
        };

        const result = client.calculateAverageSpeedWithCategories(
            {parallel: [], sequential: [group.urls['https://example.com/api'].metrics!]},
            1, // 1 second elapsed
        );

        expect(result.averageSpeedMbps).toBe(0);
        expect(result.effectiveLatency).toBe(0);
    });

    it('should track duplicate requests correctly and log duplicate details', async () => {
        const logDebugSpy = jest.spyOn(require('@utils/log'), 'logDebug');
        apiClientMock.get.mockResolvedValue({
            ok: true,
            data: {success: true},
            headers: {},
            metrics: {latency: 150, size: 200, compressedSize: 100, startTime: Date.now(), endTime: Date.now() + 100, speedInMbps: 1},
        });

        client.initTrackGroup('Cold Start');

        // Simulate multiple fetch calls to the same URL
        const promises = [
            client.doFetchWithTracking('https://example.com/api', {method: 'GET', groupLabel: 'Cold Start'}),
            client.doFetchWithTracking('https://example.com/api', {method: 'GET', groupLabel: 'Cold Start'}),
            client.doFetchWithTracking('https://example.com/api', {method: 'GET', groupLabel: 'Cold Start'}),
        ];

        // Wait for all fetches to resolve
        await Promise.all(promises);

        // Verify that the group tracked duplicates correctly
        const group = client.requestGroups.get('Cold Start')!;
        expect(group.urls['https://example.com/api'].count).toBe(3); // URL was requested 3 times
        expect(group.totalSize).toBe(600); // Total size = 3 * 200
        expect(group.totalCompressedSize).toBe(300); // Total compressed size = 3 * 100

        await test_helper.wait(300);

        // Verify duplicate logging
        expect(logDebugSpy).toHaveBeenCalledWith(
            expect.stringContaining('Duplicate URLs:\n1 - https://example.com/api'),
        );
    });
});
