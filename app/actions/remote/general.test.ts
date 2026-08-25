// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PUSH_PROXY_RESPONSE_VERIFIED, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getDeviceToken} from '@queries/app/global';
import {getExpandedLinks, getPushVerificationStatus} from '@queries/servers/system';
import TestHelper from '@test/test_helper';

import {doPing, getRedirectLocation} from './general';

jest.mock('@managers/network_manager', () => ({
    createClient: jest.fn(),
    getClient: jest.fn(),
    invalidateClient: jest.fn(),
}));
jest.mock('@queries/app/global', () => ({getDeviceToken: jest.fn()}));
jest.mock('@queries/servers/system', () => ({
    ...jest.requireActual('@queries/servers/system'),
    getExpandedLinks: jest.fn(),
    getPushVerificationStatus: jest.fn(),
}));
jest.mock('./session', () => ({forceLogoutIfNecessary: jest.fn()}));
jest.mock('@utils/log', () => ({logDebug: jest.fn()}));

const serverUrl = 'http://server.com';

const makePingClient = (overrides: Partial<{ping: jest.Mock}> = {}) => ({
    ping: jest.fn().mockResolvedValue({ok: true, code: 200, data: {}, headers: {}}),
    ...overrides,
});

describe('doPing', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return error when createClient fails and no client provided', async () => {
        (NetworkManager.createClient as jest.Mock).mockRejectedValue(new Error('network error'));

        const result = await doPing(serverUrl, false);
        expect(result).toHaveProperty('error');
    });

    it('should return empty object on successful ping without push proxy verification', async () => {
        const mockClient = makePingClient();
        (NetworkManager.createClient as jest.Mock).mockResolvedValue(mockClient);

        const result = await doPing(serverUrl, false);
        expect(result).toEqual({});
    });

    it('should return certificate error on 401 response', async () => {
        const mockClient = makePingClient({ping: jest.fn().mockResolvedValue({ok: false, code: 401, headers: {}})});
        (NetworkManager.createClient as jest.Mock).mockResolvedValue(mockClient);

        const result = await doPing(serverUrl, false);
        expect(result).toHaveProperty('error');
        expect((result as any).error.intl.id).toBe('mobile.server_requires_client_certificate');
    });

    it('should return ping error and invalidate client on non-ok response', async () => {
        const mockClient = makePingClient({ping: jest.fn().mockResolvedValue({ok: false, code: 500, headers: {}})});
        (NetworkManager.createClient as jest.Mock).mockResolvedValue(mockClient);

        const result = await doPing(serverUrl, false);
        expect(result).toHaveProperty('error');
        expect(NetworkManager.invalidateClient).toHaveBeenCalledWith(serverUrl);
    });

    it('should not invalidate client when client is provided externally', async () => {
        const mockClient = makePingClient({ping: jest.fn().mockResolvedValue({ok: false, code: 500, headers: {}})});

        const result = await doPing(serverUrl, false, 5000, undefined, mockClient as any);
        expect(result).toHaveProperty('error');
        expect(NetworkManager.invalidateClient).not.toHaveBeenCalled();
    });

    it('should return ping error on network exception', async () => {
        const mockClient = makePingClient({ping: jest.fn().mockRejectedValue(new Error('timeout'))});
        (NetworkManager.createClient as jest.Mock).mockResolvedValue(mockClient);

        const result = await doPing(serverUrl, false);
        expect(result).toHaveProperty('error');
        expect(NetworkManager.invalidateClient).toHaveBeenCalledWith(serverUrl);
    });

    it('should return canReceiveNotifications when verifyPushProxy is true and device token returned', async () => {
        (getPushVerificationStatus as jest.Mock).mockResolvedValue('unknown');
        (getDeviceToken as jest.Mock).mockResolvedValue('token123');
        const mockClient = makePingClient({
            ping: jest.fn().mockResolvedValue({ok: true, code: 200, data: {CanReceiveNotifications: PUSH_PROXY_RESPONSE_VERIFIED}, headers: {}}),
        });
        (NetworkManager.createClient as jest.Mock).mockResolvedValue(mockClient);

        const result = await doPing(serverUrl, true) as any;
        expect(result.canReceiveNotifications).toBe(PUSH_PROXY_RESPONSE_VERIFIED);
    });

    it('should skip device token fetch when push proxy already verified', async () => {
        await TestHelper.setupServerDatabase(serverUrl);
        (getPushVerificationStatus as jest.Mock).mockResolvedValue(PUSH_PROXY_STATUS_VERIFIED);
        const mockClient = makePingClient({
            ping: jest.fn().mockResolvedValue({ok: true, code: 200, data: {CanReceiveNotifications: null}, headers: {}}),
        });

        const result = await doPing(serverUrl, true, 5000, undefined, mockClient as any) as any;
        expect(getDeviceToken).not.toHaveBeenCalled();
        expect(result.canReceiveNotifications).toBe(PUSH_PROXY_RESPONSE_VERIFIED);

        await DatabaseManager.destroyServerDatabase(serverUrl);
    });
});

describe('getRedirectLocation', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        await TestHelper.setupServerDatabase(serverUrl);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should store the expanded link and return it', async () => {
        const mockClient = {getRedirectLocation: jest.fn().mockResolvedValue({location: 'https://expanded.url/page'})};
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);
        (getExpandedLinks as jest.Mock).mockResolvedValue({});

        const result = await getRedirectLocation(serverUrl, 'https://short.url') as any;
        expect(result.expandedLink.location).toBe('https://expanded.url/page');
    });

    it('should return expandedLink without storing when no location in response', async () => {
        const mockClient = {getRedirectLocation: jest.fn().mockResolvedValue({})};
        (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

        const result = await getRedirectLocation(serverUrl, 'https://short.url') as any;
        expect(result.expandedLink).toEqual({});
    });

    it('should return error when client throws', async () => {
        (NetworkManager.getClient as jest.Mock).mockImplementation(() => {
            throw new Error('no client');
        });

        const result = await getRedirectLocation(serverUrl, 'https://short.url') as any;
        expect(result).toHaveProperty('error');
    });
});
