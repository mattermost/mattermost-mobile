// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getDeviceToken} from '@queries/app/global';
import {getExpandedLinks, getPushVerificationStatus} from '@queries/servers/system';

import {getDeviceIdForPing, doPing, getRedirectLocation} from './general';
import {forceLogoutIfNecessary} from './session';

jest.mock('@database/manager');
jest.mock('@managers/network_manager');
jest.mock('@queries/servers/system', () => ({
    getPushVerificationStatus: jest.fn(),
    getExpandedLinks: jest.fn(),
}));
jest.mock('@queries/app/global', () => ({
    getDeviceToken: jest.fn(),
}));
jest.mock('@utils/log', () => ({
    logDebug: jest.fn(),
}));
jest.mock('./session', () => ({
    forceLogoutIfNecessary: jest.fn(),
}));

describe('general.ts', () => {
    describe('getDeviceIdForPing', () => {
        it('should return undefined if checkDeviceId is false', async () => {
            const result = await getDeviceIdForPing('http://testserver.com', false);
            expect(result).toBeUndefined();
        });

        it('should return undefined if push verification is verified', async () => {
            (getPushVerificationStatus as jest.Mock).mockResolvedValueOnce(PUSH_PROXY_STATUS_VERIFIED);
            const result = await getDeviceIdForPing('http://testserver.com', true);
            expect(result).toBeUndefined();
        });

        it('should return device token if push verification fails', async () => {
            (getPushVerificationStatus as jest.Mock).mockResolvedValueOnce('NOT_VERIFIED');
            (getDeviceToken as jest.Mock).mockResolvedValueOnce('mock-device-token');
            const result = await getDeviceIdForPing('http://testserver.com', true);
            expect(result).toBe('mock-device-token');
        });

        it('should handle errors gracefully', async () => {
            (getPushVerificationStatus as jest.Mock).mockRejectedValueOnce(new Error('Database error'));
            const result = await getDeviceIdForPing('http://testserver.com', true);
            expect(result).toBeUndefined();
        });
    });

    describe('doPing', () => {
        const serverUrl = 'http://testserver.com';

        it('should return error if client creation fails', async () => {
            (NetworkManager.createClient as jest.Mock).mockRejectedValueOnce(new Error('Client creation failed'));
            const result = await doPing(serverUrl, false);
            expect(result.error).toBeTruthy();
        });

        it('should handle unauthorized responses', async () => {
            const mockClient = {
                ping: jest.fn().mockResolvedValue({code: 401}),
            };
            (NetworkManager.createClient as jest.Mock).mockResolvedValueOnce(mockClient);
            const result = await doPing(serverUrl, false);
            const error = result.error as { intl?: { id: string; defaultMessage: string } };
            expect(error.intl?.id).toBe('mobile.server_requires_client_certificate');
        });

        it('should handle non-ok responses', async () => {
            const mockClient = {
                ping: jest.fn().mockResolvedValue({ok: false}),
            };
            (NetworkManager.createClient as jest.Mock).mockResolvedValueOnce(mockClient);
            const result = await doPing(serverUrl, false);
            const error = result.error as { intl?: { id: string; defaultMessage: string } };
            expect(error.intl?.id).toBe('mobile.server_ping_failed');
        });

        it('should handle exceptions during ping', async () => {
            const mockClient = {
                ping: jest.fn().mockImplementation(() => {
                    throw new Error('Ping failed');
                }),
            };
            (NetworkManager.createClient as jest.Mock).mockResolvedValueOnce(mockClient);
            const result = await doPing(serverUrl, false);
            const error = result.error as { intl?: { id: string; defaultMessage: string } };
            expect(error.intl?.id).toBe('mobile.server_ping_failed');
        });

        it('should handle push proxy verification', async () => {
            const mockClient = {
                ping: jest.fn().mockResolvedValue({ok: true, data: {CanReceiveNotifications: true}}),
            };
            (NetworkManager.createClient as jest.Mock).mockResolvedValueOnce(mockClient);
            const result = await doPing(serverUrl, true);
            expect(result.canReceiveNotifications).toBe(true);
        });
    });

    describe('getRedirectLocation', () => {
        const serverUrl = 'http://testserver.com';
        const link = 'http://somelink.com';

        it('should return expanded link and update database', async () => {
            const mockClient = {
                getRedirectLocation: jest.fn().mockResolvedValue({location: 'http://expandedlink.com'}),
            };
            const mockOperator = {handleSystem: jest.fn()};
            (NetworkManager.getClient as jest.Mock).mockReturnValueOnce(mockClient);
            (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockReturnValueOnce({
                database: {},
                operator: mockOperator,
            });
            (getExpandedLinks as jest.Mock).mockResolvedValueOnce({});
            const result = await getRedirectLocation(serverUrl, link);
            expect(result.expandedLink?.location).toBe('http://expandedlink.com');
            expect(mockOperator.handleSystem).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            const mockClient = {
                getRedirectLocation: jest.fn().mockRejectedValue(new Error('Error fetching link')),
            };
            (NetworkManager.getClient as jest.Mock).mockReturnValueOnce(mockClient);
            const result = await getRedirectLocation(serverUrl, link);
            expect(result.error).toBeTruthy();
            expect(forceLogoutIfNecessary).toHaveBeenCalled();
        });
    });
});
