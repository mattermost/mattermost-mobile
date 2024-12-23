// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import test_helper from '@test/test_helper';

import * as ClientConstants from './constants';
import ClientTracking from './tracking';

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

describe('ClientTraking', () => {
    const apiClientMock = {
        baseUrl: 'https://example.com',
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
    };

    let client: ClientTracking;

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
        client.initTrackGroup('testGroup');
        expect(client.requestGroups.has('testGroup')).toBe(true);

        client.trackRequest('testGroup', 'https://example.com/api', {size: 100, compressedSize: 50} as ClientResponseMetrics);
        const group = client.requestGroups.get('testGroup')!;
        expect(group.totalSize).toBe(100);
        expect(group.totalCompressedSize).toBe(50);
        expect(group.urls['https://example.com/api'].count).toBe(1);
    });

    it('should increment and decrement request count', () => {
        client.initTrackGroup('testGroup');
        client.incrementRequestCount('testGroup');
        let group = client.requestGroups.get('testGroup')!;
        expect(group.activeCount).toBe(1);

        client.decrementRequestCount('testGroup');
        group = client.requestGroups.get('testGroup')!;
        expect(group.activeCount).toBe(0);
    });

    it('should handle request completion', () => {
        client.initTrackGroup('testGroup');
        client.handleRequestCompletion('testGroup');

        expect(require('@utils/log').logDebug).toHaveBeenCalledWith('Group "testGroup" completed.');
    });

    it('should clear completion timer', () => {
        client.initTrackGroup('testGroup');
        const group = client.requestGroups.get('testGroup')!;
        group.completionTimer = setTimeout(() => {}, 100);

        client.clearCompletionTimer('testGroup');
        expect(group.completionTimer).toBeUndefined();
    });

    it('should check if all requests are completed', () => {
        client.initTrackGroup('testGroup');
        const result = client.allRequestsCompleted('testGroup');
        expect(result).toBe(true);
    });

    it('should send telemetry event', () => {
        client.initTrackGroup('testGroup');
        const group = client.requestGroups.get('testGroup')!;
        group.urls = {
            'https://example.com/api': {
                count: 2,
                metrics: {latency: 200, networkType: 'Wi-Fi', tlsCipherSuite: 'none', tlsVersion: 'none', isCached: false, httpVersion: 'h2', compressedSize: 10 * 1024, size: 6 * 1024 * 1024, connectionTime: 0, startTime: 0, endTime: 100, speedInMbps: 1},
            },
        };

        client.sendTelemetryEvent('testGroup', group, 1000);
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
            groupLabel: 'testGroup',
        };

        const result = await client.doFetchWithTracking('https://example.com/api', options);
        expect(result).toEqual({success: true});
    });

    it('should handle fetch errors', async () => {
        apiClientMock.get.mockRejectedValue(new Error('Request failed'));

        const options = {
            method: 'GET',
            groupLabel: 'testGroup',
        };

        await expect(client.doFetchWithTracking('https://example.com/api', options)).rejects.toThrow('Received invalid response from the server.');
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
                        metrics: {latency: 200, size: 500, compressedSize: 300},
                    });
                }, 200); // Simulate a 100ms network delay
            });
        });

        client.initTrackGroup('testGroup');

        // Simulate multiple fetch calls
        const promises = [
            client.doFetchWithTracking('https://example.com/api1', {method: 'GET', groupLabel: 'testGroup'}),
            client.doFetchWithTracking('https://example.com/api2', {method: 'GET', groupLabel: 'testGroup'}),
            client.doFetchWithTracking('https://example.com/api3', {method: 'GET', groupLabel: 'testGroup'}),
        ];

        // Wait for all fetches to resolve
        await Promise.all(promises);

        const group = client.requestGroups.get('testGroup')!;
        expect(group.activeCount).toBe(0);

        await test_helper.wait(100);

        expect(handleRequestCompletionSpy).toHaveBeenCalledTimes(1);
        expect(incrementSpy).toHaveBeenCalledTimes(3);
        expect(decrementSpy).toHaveBeenCalledTimes(3);
    });

    it('should track duplicate requests correctly and log duplicate details', async () => {
        const logDebugSpy = jest.spyOn(require('@utils/log'), 'logDebug');
        apiClientMock.get.mockResolvedValue({
            ok: true,
            data: {success: true},
            headers: {},
            metrics: {latency: 150, size: 200, compressedSize: 100},
        });

        client.initTrackGroup('testGroup');

        // Simulate multiple fetch calls to the same URL
        const promises = [
            client.doFetchWithTracking('https://example.com/api', {method: 'GET', groupLabel: 'testGroup'}),
            client.doFetchWithTracking('https://example.com/api', {method: 'GET', groupLabel: 'testGroup'}),
            client.doFetchWithTracking('https://example.com/api', {method: 'GET', groupLabel: 'testGroup'}),
        ];

        // Wait for all fetches to resolve
        await Promise.all(promises);

        // Verify that the group tracked duplicates correctly
        const group = client.requestGroups.get('testGroup')!;
        expect(group.urls['https://example.com/api'].count).toBe(3); // URL was requested 3 times
        expect(group.totalSize).toBe(600); // Total size = 3 * 200
        expect(group.totalCompressedSize).toBe(300); // Total compressed size = 3 * 100

        await test_helper.wait(100);

        // Verify duplicate logging
        expect(logDebugSpy).toHaveBeenCalledWith(
            'Duplicate URLs:\n',
            expect.stringContaining('https://example.com/api'),
        );
    });
});
