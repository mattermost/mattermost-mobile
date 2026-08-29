// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientChannelsMix} from './channels';

describe('ClientBase route methods', () => {
    let client: ClientChannelsMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
    });

    test('getAPIRoute joins base route and api version', () => {
        expect(client.getAPIRoute()).toBe(`${client.getBaseRoute()}${client.urlVersion}`);
    });

    describe('shared channels and remote cluster routes', () => {
        test('getSharedChannelsRoute returns sharedchannels path', () => {
            expect(client.getSharedChannelsRoute()).toBe(`${client.urlVersion}/sharedchannels`);
        });

        test('getRemoteClustersRoute returns remotecluster path', () => {
            expect(client.getRemoteClustersRoute()).toBe(`${client.urlVersion}/remotecluster`);
        });

        test('getChannelRemotesRoute returns channel remotes path', () => {
            const channelId = 'channel-id-1';
            expect(client.getChannelRemotesRoute(channelId)).toBe(
                `${client.urlVersion}/sharedchannels/${channelId}/remotes`,
            );
        });

        test('getRemoteClusterChannelRoute returns remote cluster channel path', () => {
            const remoteId = 'remote-id-1';
            const channelId = 'channel-id-1';
            expect(client.getRemoteClusterChannelRoute(remoteId, channelId)).toBe(
                `${client.urlVersion}/remotecluster/${remoteId}/channels/${channelId}`,
            );
        });
    });
});

describe('doFetch transient transport retry', () => {
    let client: ClientChannelsMix & ClientBase;
    let doFetchWithTracking: jest.SpyInstance;

    const lostConnection = () => new Error('URLSessionTask failed with error: The network connection was lost.');

    beforeEach(() => {
        client = TestHelper.createClient();
        doFetchWithTracking = jest.spyOn(client, 'doFetchWithTracking');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should retry a lost connection once and return the second result', async () => {
        doFetchWithTracking.mockRejectedValueOnce(lostConnection()).mockResolvedValueOnce('ok');

        await expect(client.doFetch('/url', {method: 'put'})).resolves.toBe('ok');
        expect(doFetchWithTracking).toHaveBeenCalledTimes(2);
    });

    it('should not retry more than once', async () => {
        doFetchWithTracking.mockRejectedValue(lostConnection());

        await expect(client.doFetch('/url', {method: 'put'})).rejects.toThrow('network connection was lost');
        expect(doFetchWithTracking).toHaveBeenCalledTimes(2);
    });

    it('should not retry when the caller passes noRetry', async () => {
        doFetchWithTracking.mockRejectedValue(lostConnection());

        await expect(client.doFetch('/url', {method: 'put', noRetry: true})).rejects.toThrow();
        expect(doFetchWithTracking).toHaveBeenCalledTimes(1);
    });

    it('should not retry a non-idempotent post', async () => {
        doFetchWithTracking.mockRejectedValue(lostConnection());

        await expect(client.doFetch('/url', {method: 'post'})).rejects.toThrow();
        expect(doFetchWithTracking).toHaveBeenCalledTimes(1);
    });

    it('should retry a read-only post that opts in with retryOnTransient', async () => {
        doFetchWithTracking.mockRejectedValueOnce(lostConnection()).mockResolvedValueOnce('ok');

        await expect(client.doFetch('/url', {method: 'post', retryOnTransient: true})).resolves.toBe('ok');
        expect(doFetchWithTracking).toHaveBeenCalledTimes(2);
    });

    // Hostnames can contain the digits of the NSURLError codes, so matching on raw codes
    // would retry permanent failures.
    it('should not retry a permanent error whose message contains the server hostname', async () => {
        doFetchWithTracking.mockRejectedValue(
            new Error('You do not have permission: https://mobile-pr-10050-ios-site-1.test.mattermost.cloud/api/v4/users/me'),
        );

        await expect(client.doFetch('/url', {method: 'put'})).rejects.toThrow('do not have permission');
        expect(doFetchWithTracking).toHaveBeenCalledTimes(1);
    });
});
