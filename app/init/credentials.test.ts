// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import * as KeyChain from 'react-native-keychain';

import {
    getAllServerCredentials,
    getServerCredentials,
    setServerCredentials,
    removeServerCredentials,
    removePreauthSecret,
    clearCachedServerCredentials,
    hasCachedCredentials,
} from './credentials';

jest.mock('react-native-keychain', () => ({
    SECURITY_LEVEL: {
        SECURE_SOFTWARE: 'SECURE_SOFTWARE',
    },
    STORAGE_TYPE: {
        FB: 'FB',
        AES: 'AES',
        RSA: 'RSA',
    },
    setInternetCredentials: jest.fn(),
    getInternetCredentials: jest.fn(),
    resetInternetCredentials: jest.fn(),
    setGenericPassword: jest.fn(),
    getGenericPassword: jest.fn(),
    resetGenericPassword: jest.fn(),
    getAllInternetPasswordServers: jest.fn(),
    getAllGenericPasswordServices: jest.fn(),
}));
jest.mock('@utils/log');
jest.mock('@utils/mattermost_managed', () => ({
    getIOSAppGroupDetails: jest.fn().mockReturnValue({
        appGroupIdentifier: 'group.com.mattermost.test',
    }),
}));
jest.mock('@database/manager', () => ({
    getActiveServerUrl: jest.fn().mockResolvedValue('https://example.com'),
    serverDatabases: {},
}));
jest.mock('@init/launch_profiler', () => ({
    launchMark: jest.fn(),
}));

describe('credentials', () => {
    const mockServerUrl = 'https://example.com';
    const mockToken = 'test-token-123';
    const mockUserId = 'user-id-123';
    const mockPreauthSecret = 'preauth-secret-123';

    beforeEach(() => {
        jest.clearAllMocks();
        clearCachedServerCredentials();
    });

    describe('setServerCredentials', () => {
        it('should store credentials with pre-auth secret', () => {
            setServerCredentials(mockServerUrl, mockToken, mockPreauthSecret);

            expect(KeyChain.setInternetCredentials).toHaveBeenCalledWith(
                mockServerUrl,
                mockToken,
                mockToken,
                expect.objectContaining({
                    securityLevel: KeyChain.SECURITY_LEVEL.SECURE_SOFTWARE,
                }),
            );

            expect(KeyChain.setGenericPassword).toHaveBeenCalledWith(
                'preshared_secret',
                mockPreauthSecret,
                expect.objectContaining({
                    server: mockServerUrl,
                    securityLevel: KeyChain.SECURITY_LEVEL.SECURE_SOFTWARE,
                }),
            );
        });

        it('should store credentials without pre-auth secret', () => {
            setServerCredentials(mockServerUrl, mockToken);

            expect(KeyChain.setInternetCredentials).toHaveBeenCalledWith(
                mockServerUrl,
                mockToken,
                mockToken,
                expect.any(Object),
            );

            expect(KeyChain.resetGenericPassword).toHaveBeenCalledWith(
                expect.objectContaining({
                    server: mockServerUrl,
                }),
            );
        });

        it('should not store credentials when serverUrl is missing', () => {
            setServerCredentials('', mockToken, mockPreauthSecret);

            expect(KeyChain.setInternetCredentials).not.toHaveBeenCalled();
            expect(KeyChain.setGenericPassword).not.toHaveBeenCalled();
        });

        it('should not store credentials when token is missing', () => {
            setServerCredentials(mockServerUrl, '', mockPreauthSecret);

            expect(KeyChain.setInternetCredentials).not.toHaveBeenCalled();
            expect(KeyChain.setGenericPassword).not.toHaveBeenCalled();
        });

        it('should use iOS app group on iOS platform', () => {
            Platform.OS = 'ios';

            setServerCredentials(mockServerUrl, mockToken, mockPreauthSecret);

            expect(KeyChain.setInternetCredentials).toHaveBeenCalledWith(
                mockServerUrl,
                mockToken,
                mockToken,
                expect.objectContaining({
                    accessGroup: 'group.com.mattermost.test',
                }),
            );
        });

        it('should not use app group on Android platform', () => {
            Platform.OS = 'android';

            setServerCredentials(mockServerUrl, mockToken, mockPreauthSecret);

            expect(KeyChain.setInternetCredentials).toHaveBeenCalledWith(
                mockServerUrl,
                mockToken,
                mockToken,
                expect.objectContaining({
                    accessGroup: undefined,
                }),
            );
        });
    });

    describe('getServerCredentials', () => {
        it('should retrieve credentials with pre-auth secret', async () => {
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: mockUserId,
                password: mockToken,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });

            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue({
                username: 'preshared_secret',
                password: mockPreauthSecret,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });

            const result = await getServerCredentials(mockServerUrl);

            expect(result).toEqual({
                serverUrl: mockServerUrl,
                userId: mockUserId,
                token: mockToken,
                preauthSecret: mockPreauthSecret,
            });
        });

        it('should retrieve credentials without pre-auth secret', async () => {
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: mockUserId,
                password: mockToken,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });

            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            const result = await getServerCredentials(mockServerUrl);

            expect(result).toEqual({
                serverUrl: mockServerUrl,
                userId: mockUserId,
                token: mockToken,
                preauthSecret: undefined,
            });
        });

        it('should handle legacy token format with device token', async () => {
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: 'device-token-123,user-id-456',
                password: mockToken,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });

            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            const result = await getServerCredentials(mockServerUrl);

            expect(result).toEqual({
                serverUrl: mockServerUrl,
                userId: 'user-id-456',
                token: mockToken,
                preauthSecret: undefined,
            });
        });

        it('should return null when credentials do not exist', async () => {
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue(false);

            const result = await getServerCredentials(mockServerUrl);

            expect(result).toBeNull();
        });

        it('should return null when token is undefined', async () => {
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: mockUserId,
                password: 'undefined',
                service: mockServerUrl,
                storage: 'keychain' as any,
            });

            const result = await getServerCredentials(mockServerUrl);

            expect(result).toBeNull();
        });

        it('should gracefully handle errors when retrieving pre-auth secret', async () => {
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: mockUserId,
                password: mockToken,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });

            jest.mocked(KeyChain.getGenericPassword).mockRejectedValue(new Error('Keychain error'));

            const result = await getServerCredentials(mockServerUrl);

            expect(result).toEqual({
                serverUrl: mockServerUrl,
                userId: mockUserId,
                token: mockToken,
                preauthSecret: undefined,
            });
        });

        it('should return null on error retrieving main credentials', async () => {
            jest.mocked(KeyChain.getInternetCredentials).mockRejectedValue(new Error('Keychain error'));

            const result = await getServerCredentials(mockServerUrl);

            expect(result).toBeNull();
        });
    });

    describe('removeServerCredentials', () => {
        it('should remove internet credentials only', async () => {
            await removeServerCredentials(mockServerUrl);

            expect(KeyChain.resetInternetCredentials).toHaveBeenCalledWith({
                server: mockServerUrl,
            });

            // Should NOT remove pre-auth secret
            expect(KeyChain.resetGenericPassword).not.toHaveBeenCalled();
        });
    });

    describe('removePreauthSecret', () => {
        it('should remove pre-auth secret', async () => {
            await removePreauthSecret(mockServerUrl);

            expect(KeyChain.resetGenericPassword).toHaveBeenCalledWith({
                server: mockServerUrl,
            });
        });

        it('should gracefully handle errors when pre-auth secret does not exist', async () => {
            jest.mocked(KeyChain.resetGenericPassword).mockRejectedValue(new Error('Not found'));

            await expect(removePreauthSecret(mockServerUrl)).resolves.not.toThrow();

            expect(KeyChain.resetGenericPassword).toHaveBeenCalledWith({
                server: mockServerUrl,
            });
        });
    });

    describe('getAllServerCredentials', () => {
        beforeEach(() => {
            Platform.OS = 'ios';
        });

        it('should retrieve all server credentials on iOS', async () => {
            const serverUrls = [
                'https://server1.com',
                'https://server2.com',
            ];

            jest.mocked((KeyChain as any).getAllInternetPasswordServers).mockResolvedValue(serverUrls);

            jest.mocked(KeyChain.getInternetCredentials).mockImplementation(async (url) => {
                if (url === 'https://server1.com') {
                    return {
                        username: 'user1',
                        password: 'token1',
                        service: url,
                        storage: 'keychain' as any,
                    };
                } else if (url === 'https://server2.com') {
                    return {
                        username: 'user2',
                        password: 'token2',
                        service: url,
                        storage: 'keychain' as any,
                    };
                }
                return false;
            });

            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            const result = await getAllServerCredentials();

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({
                serverUrl: 'https://server1.com',
                userId: 'user1',
                token: 'token1',
                preauthSecret: undefined,
            });
            expect(result[1]).toEqual({
                serverUrl: 'https://server2.com',
                userId: 'user2',
                token: 'token2',
                preauthSecret: undefined,
            });
        });

        it('should retrieve all server credentials on Android', async () => {
            Platform.OS = 'android';

            const serverUrls = ['https://server1.com'];

            jest.mocked(KeyChain.getAllGenericPasswordServices).mockResolvedValue(serverUrls);

            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: 'user1',
                password: 'token1',
                service: 'https://server1.com',
                storage: 'keychain' as any,
            });

            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            const result = await getAllServerCredentials();

            expect(result).toHaveLength(1);
            expect(KeyChain.getAllGenericPasswordServices).toHaveBeenCalled();
            expect((KeyChain as any).getAllInternetPasswordServers).not.toHaveBeenCalled();
        });

        it('should filter out null credentials', async () => {
            const serverUrls = [
                'https://server1.com',
                'https://server2.com',
            ];

            jest.mocked((KeyChain as any).getAllInternetPasswordServers).mockResolvedValue(serverUrls);

            jest.mocked(KeyChain.getInternetCredentials).mockImplementation(async (url) => {
                if (url === 'https://server1.com') {
                    return {
                        username: 'user1',
                        password: 'token1',
                        service: url,
                        storage: 'keychain' as any,
                    };
                }
                return false;
            });

            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            const result = await getAllServerCredentials();

            expect(result).toHaveLength(1);
            expect(result[0].serverUrl).toBe('https://server1.com');
        });

        it('should skip Android service listing when known URLs are provided', async () => {
            Platform.OS = 'android';

            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: 'user1',
                password: 'token1',
                service: 'https://server1.com',
                storage: 'keychain' as any,
            });
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue({
                username: 'preshared_secret',
                password: mockPreauthSecret,
                service: 'https://server1.com',
                storage: 'keychain' as any,
            });

            const result = await getAllServerCredentials(['https://server1.com']);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({
                serverUrl: 'https://server1.com',
                userId: 'user1',
                token: 'token1',
                preauthSecret: mockPreauthSecret,
            });
            expect(KeyChain.getAllGenericPasswordServices).not.toHaveBeenCalled();
            expect(KeyChain.getInternetCredentials).toHaveBeenCalledWith('https://server1.com');
            expect(KeyChain.getGenericPassword).toHaveBeenCalledWith({server: 'https://server1.com'});
        });

        it('should skip iOS internet-password listing when known URLs are provided', async () => {
            Platform.OS = 'ios';

            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: 'user1',
                password: 'token1',
                service: 'https://server1.com',
                storage: 'keychain' as any,
            });
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            const result = await getAllServerCredentials(['https://server1.com']);

            expect(result).toHaveLength(1);
            expect((KeyChain as any).getAllInternetPasswordServers).not.toHaveBeenCalled();
            expect(KeyChain.getInternetCredentials).toHaveBeenCalledWith('https://server1.com');
            expect(KeyChain.getGenericPassword).toHaveBeenCalledWith({server: 'https://server1.com'});
        });

        it('should fall back to listing when known URLs is empty', async () => {
            Platform.OS = 'ios';

            jest.mocked((KeyChain as any).getAllInternetPasswordServers).mockResolvedValue([mockServerUrl]);
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: mockUserId,
                password: mockToken,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            const result = await getAllServerCredentials([]);

            expect(result).toHaveLength(1);
            expect((KeyChain as any).getAllInternetPasswordServers).toHaveBeenCalled();
        });

        it('should return the cache on a second call without listing or decrypting', async () => {
            Platform.OS = 'ios';

            jest.mocked((KeyChain as any).getAllInternetPasswordServers).mockResolvedValue([mockServerUrl]);
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: mockUserId,
                password: mockToken,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            const first = await getAllServerCredentials();
            jest.mocked((KeyChain as any).getAllInternetPasswordServers).mockClear();
            jest.mocked(KeyChain.getInternetCredentials).mockClear();
            jest.mocked(KeyChain.getGenericPassword).mockClear();

            const second = await getAllServerCredentials();

            expect(second).toEqual(first);
            expect((KeyChain as any).getAllInternetPasswordServers).not.toHaveBeenCalled();
            expect(KeyChain.getInternetCredentials).not.toHaveBeenCalled();
            expect(KeyChain.getGenericPassword).not.toHaveBeenCalled();
        });
    });

    describe('credential cache', () => {
        it('should report null until credentials have been loaded', () => {
            expect(hasCachedCredentials()).toBeNull();
        });

        it('should cache credentials loaded from the keychain', async () => {
            jest.mocked((KeyChain as any).getAllInternetPasswordServers).mockResolvedValue([mockServerUrl]);
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: mockUserId,
                password: mockToken,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            await getAllServerCredentials();

            expect(hasCachedCredentials()).toBe(true);
        });

        it('should cache an empty list when no credentials exist', async () => {
            jest.mocked((KeyChain as any).getAllInternetPasswordServers).mockResolvedValue([]);

            await getAllServerCredentials();

            expect(hasCachedCredentials()).toBe(false);
        });

        it('should return cached credentials without reading the keychain again', async () => {
            Platform.OS = 'ios';
            jest.mocked((KeyChain as any).getAllInternetPasswordServers).mockResolvedValue([mockServerUrl]);
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: mockUserId,
                password: mockToken,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            await getAllServerCredentials();
            jest.mocked(KeyChain.getInternetCredentials).mockClear();

            const result = await getServerCredentials(mockServerUrl);

            expect(result).toEqual({
                serverUrl: mockServerUrl,
                userId: mockUserId,
                token: mockToken,
                preauthSecret: undefined,
            });
            expect(KeyChain.getInternetCredentials).not.toHaveBeenCalled();
        });

        it('should upsert the cached credential when set after load', async () => {
            Platform.OS = 'ios';
            jest.mocked((KeyChain as any).getAllInternetPasswordServers).mockResolvedValue([mockServerUrl]);
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: mockUserId,
                password: mockToken,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            await getAllServerCredentials();
            setServerCredentials(mockServerUrl, 'new-token', mockPreauthSecret);

            const result = await getServerCredentials(mockServerUrl);

            expect(result).toEqual({
                serverUrl: mockServerUrl,
                userId: 'new-token',
                token: 'new-token',
                preauthSecret: mockPreauthSecret,
            });
        });

        it('should drop the cached credential on remove', async () => {
            Platform.OS = 'ios';
            jest.mocked((KeyChain as any).getAllInternetPasswordServers).mockResolvedValue([mockServerUrl]);
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: mockUserId,
                password: mockToken,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            await getAllServerCredentials();
            await removeServerCredentials(mockServerUrl);

            expect(hasCachedCredentials()).toBe(false);
        });

        it('should clear preauthSecret on the cached credential', async () => {
            Platform.OS = 'ios';
            jest.mocked((KeyChain as any).getAllInternetPasswordServers).mockResolvedValue([mockServerUrl]);
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: mockUserId,
                password: mockToken,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue({
                username: 'preshared_secret',
                password: mockPreauthSecret,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });

            await getAllServerCredentials();
            jest.mocked(KeyChain.getInternetCredentials).mockClear();

            await removePreauthSecret(mockServerUrl);
            const result = await getServerCredentials(mockServerUrl);

            expect(result).toEqual({
                serverUrl: mockServerUrl,
                userId: mockUserId,
                token: mockToken,
                preauthSecret: undefined,
            });
            expect(KeyChain.getInternetCredentials).not.toHaveBeenCalled();
            expect(KeyChain.resetGenericPassword).toHaveBeenCalledWith({
                server: mockServerUrl,
            });
        });

        it('should not let callers mutate cached credentials', async () => {
            Platform.OS = 'ios';
            jest.mocked((KeyChain as any).getAllInternetPasswordServers).mockResolvedValue([mockServerUrl]);
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: mockUserId,
                password: mockToken,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            const all = await getAllServerCredentials();
            expect(all).toHaveLength(1);
            all[0].preauthSecret = 'mutated';
            const fromGetAll = await getAllServerCredentials();
            const fromGetOne = await getServerCredentials(mockServerUrl);

            expect(fromGetAll).toHaveLength(1);
            expect(fromGetAll[0].preauthSecret).toBeUndefined();
            expect(fromGetOne?.preauthSecret).toBeUndefined();
        });
    });
});
