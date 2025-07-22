// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */
import {DeviceEventEmitter} from 'react-native';

import LocalConfig from '@assets/config.json';
import {Events} from '@constants';
import test_helper from '@test/test_helper';

import * as ClientConstants from './constants';
import ClientError from './error';
import ClientTracking, {testExports} from './tracking';

import type {APIClientInterface, ClientResponseMetrics} from '@mattermost/react-native-network-client';

type ParallelGroup = typeof testExports.ParallelGroup;

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

    beforeEach(() => {
        client = new ClientTracking(apiClientMock as unknown as APIClientInterface);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        LocalConfig.CollectNetworkMetrics = false;
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
        } catch (error: unknown) {
            expect(error).toBeInstanceOf(ClientError);

            const clientError = error as ClientError;

            expect((clientError as {message: string}).message).toBe('Custom error message');
            expect((clientError as {server_error_id: string}).server_error_id).toBe('error_id_123');
            expect((clientError as {status_code: number}).status_code).toBe(400);
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

            expect((clientError as {message: string}).message).toBe('Response with status code 500');
            expect((clientError as {status_code: number}).status_code).toBe(500);
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
        const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');
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
        expect(emitSpy).toHaveBeenCalledWith(
            Events.SERVER_VERSION_CHANGED,
            {serverUrl: 'https://example.com', serverVersion: '5.30.0'},
        );
    });

    it('should not update server version when cache control present', async () => {
        client.serverVersion = '5.20.0';

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

        expect(client.serverVersion).toBe('5.20.0');
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

    it('should return true when checking allRequestsCompleted for non-existent group', () => {
        // Try to check completion status for a non-existent group
        const result = client.allRequestsCompleted('Non Existent Group' as RequestGroupLabel);

        // Should return true since there are no pending requests
        expect(result).toBe(true);
    });

    describe('Request Categorization and Speed Calculations', () => {
        it('should create multiple parallel groups for non-overlapping requests', () => {
            client.initTrackGroup('Cold Start');
            const group = client.requestGroups.get('Cold Start')!;
            const baseTime = Date.now();

            // First parallel group (2 concurrent requests)
            group.urls = {
                'https://example.com/api1': {
                    count: 1,
                    metrics: {
                        latency: 100,
                        startTime: baseTime,
                        endTime: baseTime + 200,
                        size: 1000,
                        compressedSize: 500,
                    } as ClientResponseMetrics,
                },
                'https://example.com/api2': {
                    count: 1,
                    metrics: {
                        latency: 150,
                        startTime: baseTime + 50,
                        endTime: baseTime + 250,
                        size: 1000,
                        compressedSize: 500,
                    } as ClientResponseMetrics,
                },

                // Second parallel group (3 concurrent requests)
                'https://example.com/api3': {
                    count: 1,
                    metrics: {
                        latency: 120,
                        startTime: baseTime + 300,
                        endTime: baseTime + 500,
                        size: 1000,
                        compressedSize: 500,
                    } as ClientResponseMetrics,
                },
                'https://example.com/api4': {
                    count: 1,
                    metrics: {
                        latency: 180,
                        startTime: baseTime + 320,
                        endTime: baseTime + 520,
                        size: 1000,
                        compressedSize: 500,
                    } as ClientResponseMetrics,
                },
                'https://example.com/api5': {
                    count: 1,
                    metrics: {
                        latency: 160,
                        startTime: baseTime + 340,
                        endTime: baseTime + 540,
                        size: 1000,
                        compressedSize: 500,
                    } as ClientResponseMetrics,
                },
            };

            const result = client.categorizeRequests('Cold Start');

            // Verify parallel groups
            expect(result.parallelGroups).toHaveLength(2);
            expect(result.maxConcurrency).toBe(3);

            // First group should have 2 requests
            expect(result.parallelGroups[0].requests).toHaveLength(2);
            expect(result.parallelGroups[0].latency).toBe(150); // Max latency of first group

            // Second group should have 3 requests
            expect(result.parallelGroups[1].requests).toHaveLength(3);
            expect(result.parallelGroups[1].latency).toBe(180); // Max latency of second group
        });

        it('should handle overlapping parallel groups correctly', () => {
            client.initTrackGroup('Cold Start');
            const group = client.requestGroups.get('Cold Start')!;
            const baseTime = Date.now();

            group.urls = {

                // First request starts early and ends late
                'https://example.com/api1': {
                    count: 1,
                    metrics: {
                        latency: 500,
                        startTime: baseTime,
                        endTime: baseTime + 1000,
                        size: 1000,
                        compressedSize: 500,
                    } as ClientResponseMetrics,
                },

                // These requests start during the first request
                'https://example.com/api2': {
                    count: 1,
                    metrics: {
                        latency: 200,
                        startTime: baseTime + 100,
                        endTime: baseTime + 300,
                        size: 1000,
                        compressedSize: 500,
                    } as ClientResponseMetrics,
                },
                'https://example.com/api3': {
                    count: 1,
                    metrics: {
                        latency: 200,
                        startTime: baseTime + 200,
                        endTime: baseTime + 400,
                        size: 1000,
                        compressedSize: 500,
                    } as ClientResponseMetrics,
                },
            };

            const result = client.categorizeRequests('Cold Start');

            // Should create a single parallel group since all requests overlap
            expect(result.parallelGroups).toHaveLength(1);
            expect(result.maxConcurrency).toBe(3);

            // The group should contain all 3 requests
            expect(result.parallelGroups[0].requests).toHaveLength(3);
            expect(result.parallelGroups[0].latency).toBe(500); // Should take the max latency
        });

        it('should handle requests with latency extending beyond group end time', () => {
            client.initTrackGroup('Cold Start');
            const group = client.requestGroups.get('Cold Start')!;
            const baseTime = Date.now();
            const dataTransferTime = 200;

            group.urls = {

                // First request starts and ends quickly
                'https://example.com/api1': {
                    count: 1,
                    metrics: {
                        latency: 100,
                        startTime: baseTime,
                        endTime: baseTime + dataTransferTime + 100,
                        size: 1000,
                        compressedSize: 500,
                    } as ClientResponseMetrics,
                },

                // Second request starts at same time but has much longer latency
                'https://example.com/api2': {
                    count: 1,
                    metrics: {
                        latency: 500, // Long latency
                        startTime: baseTime,
                        endTime: baseTime + dataTransferTime + 500, // Ends much later
                        size: 1000,
                        compressedSize: 500,
                    } as ClientResponseMetrics,
                },
            };

            const result = client.categorizeRequests('Cold Start');

            // Should create a single parallel group
            expect(result.parallelGroups).toHaveLength(1);
            expect(result.maxConcurrency).toBe(2);

            const group1 = result.parallelGroups[0];

            // Group end time should be the earliest end time
            expect(group1.endTime).toBe(baseTime + dataTransferTime + 100);

            // But latency should be from the longest request
            expect(group1.latency).toBe(500);
        });

        it('should handle requests with latency extending beyond group end time and separate parallel groups', () => {
            client.initTrackGroup('Cold Start');
            const group = client.requestGroups.get('Cold Start')!;
            const baseTime = Date.now();
            const dataTransferTime = 200;
            const firstGroupMinEndTime = baseTime + dataTransferTime + 100;

            group.urls = {

                // First parallel group
                'https://example.com/api1': {
                    count: 1,
                    metrics: {
                        latency: 100,
                        startTime: baseTime,
                        endTime: firstGroupMinEndTime,
                        size: 1000,
                        compressedSize: 500,
                    } as ClientResponseMetrics,
                },
                'https://example.com/api2': {
                    count: 1,
                    metrics: {
                        latency: 500,
                        startTime: baseTime,
                        endTime: baseTime + dataTransferTime + 500,
                        size: 1000,
                        compressedSize: 500,
                    } as ClientResponseMetrics,
                },

                // Second parallel group - starts after first group has ended
                'https://example.com/api3': {
                    count: 1,
                    metrics: {
                        latency: 300,
                        startTime: firstGroupMinEndTime + 1, // Starts after first group
                        endTime: firstGroupMinEndTime + dataTransferTime + 300,
                        size: 1000,
                        compressedSize: 500,
                    } as ClientResponseMetrics,
                },
                'https://example.com/api4': {
                    count: 1,
                    metrics: {
                        latency: 600,
                        startTime: firstGroupMinEndTime + 1, // Starts with api3
                        endTime: firstGroupMinEndTime + 100 + 600,
                        size: 1000,
                        compressedSize: 500,
                    } as ClientResponseMetrics,
                },
            };

            const result = client.categorizeRequests('Cold Start');

            // Should create two parallel groups
            expect(result.parallelGroups).toHaveLength(2);
            expect(result.maxConcurrency).toBe(2);

            const group1 = result.parallelGroups[0];
            const group2 = result.parallelGroups[1];

            // First group assertions
            expect(group1.endTime).toBe(baseTime + dataTransferTime + 100);

            // longest latency on the first group is 500, but the first group ends after 300ms, so the effective latency is only 300ms
            expect(group1.latency).toBe(300);
            expect(group1.requests).toHaveLength(2);

            // Second group assertions
            expect(group2.endTime).toBe(firstGroupMinEndTime + dataTransferTime + 300);

            // second group min endTime after 500ms, but it's the last group to end, so the effective latency for the group
            // is 600ms (longest latency)
            expect(group2.latency).toBe(600);
            expect(group2.requests).toHaveLength(2);
        });

        it('should calculate average speed and effective latency for multiple parallel groups', () => {
            const baseTime = Date.now();

            // Create test parallel groups with known data sizes and timings
            const parallelGroups: ParallelGroup[] = [
                {
                    startTime: baseTime,
                    endTime: baseTime + 1000,
                    latency: 200,
                    requests: [
                        {
                            latency: 200,
                            startTime: baseTime,
                            endTime: baseTime + 1000,
                            compressedSize: 1000000, // 1MB
                        } as ClientResponseMetrics,
                        {
                            latency: 150,
                            startTime: baseTime + 100,
                            endTime: baseTime + 900,
                            compressedSize: 500000, // 0.5MB
                        } as ClientResponseMetrics,
                    ],
                },
                {
                    startTime: baseTime + 1100,
                    endTime: baseTime + 2000,
                    latency: 300,
                    requests: [
                        {
                            latency: 300,
                            startTime: baseTime + 1100,
                            endTime: baseTime + 2000,
                            compressedSize: 2000000, // 2MB
                        } as ClientResponseMetrics,
                        {
                            latency: 250,
                            startTime: baseTime + 1200,
                            endTime: baseTime + 1900,
                            compressedSize: 1500000, // 1.5MB
                        } as ClientResponseMetrics,
                    ],
                },
            ];

            // Total compressed size: 5MB (5,000,000 bytes)
            // Total elapsed time: 2 seconds
            // Total effective latency: 500ms (200ms + 300ms)
            const result = client.calculateAverageSpeedWithCategories(parallelGroups, 2);

            // Expected average speed:
            // Total bits = 5,000,000 * 8 = 40,000,000 bits
            // Data transfer time = 2 seconds - (500ms / 1000) = 1.5 seconds
            // Speed = 40,000,000 / 1.5 = 26,666,666.67 bps = 26.67 Mbps
            expect(result.averageSpeedMbps).toBeCloseTo(26.67, 1);
            expect(result.effectiveLatency).toBe(500); // Sum of max latencies from each group
        });

        it('should handle zero transfer time in speed calculation', () => {
            client.initTrackGroup('Cold Start');
            const group = client.requestGroups.get('Cold Start')!;
            const now = Date.now();

            // Set up metrics where transfer time would be zero
            group.urls = {
                'https://example.com/api': {
                    count: 1,
                    metrics: {
                        latency: 1000,
                        startTime: now,
                        endTime: now + 1000,
                        speedInMbps: 0,
                        networkType: 'Wi-Fi',
                        tlsCipherSuite: 'none',
                        tlsVersion: 'none',
                        isCached: false,
                        httpVersion: 'h2',
                        size: 1000,
                        compressedSize: 500,
                        connectionTime: 0,
                    } as ClientResponseMetrics,
                },
            };

            const parallelGroups: ParallelGroup[] = [{
                startTime: now,
                endTime: now + 1000,
                latency: 1000,
                requests: [group.urls['https://example.com/api'].metrics!],
            }];

            const result = client.calculateAverageSpeedWithCategories(
                parallelGroups,
                1, // 1 second elapsed
            );

            expect(result.averageSpeedMbps).toBe(0); // Should be 0 since data transfer time is 0/negative
            expect(result.effectiveLatency).toBe(1000);
        });

        it('should return empty result when groupData is not found', () => {
            // Try to categorize requests for a non-existent group
            const result = client.categorizeRequests('Non Existent Group' as RequestGroupLabel);

            // Verify empty result structure
            expect(result.parallelGroups).toEqual([]);
            expect(result.maxConcurrency).toBe(0);
        });

        it('should return default latency when groupData is not found', () => {
            // Try to get average latency for a non-existent group
            const result = client.getAverageLatency('Non Existent Group' as RequestGroupLabel);

            // Should return default latency of 100ms
            expect(result).toBe(100);
        });
    });
});
/* eslint-enable max-lines */
