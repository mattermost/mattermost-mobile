// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import * as KeyChain from 'react-native-keychain';

import {
    LEGACY_PREAUTH_SECRET_ACCOUNT,
    getAllServerCredentials,
    getLegacyPreauthSecret,
    getPreauthSecret,
    getServerCredentials,
    setPreauthSecret,
    setServerCredentials,
    removeLegacyPreauthSecret,
    removeServerCredentials,
    removePreauthSecret,
    clearCachedServerCredentials,
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

describe('credentials', () => {
    const mockServerUrl = 'https://example.com';
    const mockToken = 'test-token-123';
    const mockUserId = 'user-id-123';
    const mockPreauthSecret = 'preauth-secret-123';
    const originalPlatform = Platform.OS;
    const iosPreauthOptions = {service: mockServerUrl, accessGroup: 'group.com.mattermost.test'};
    const androidPreauthOptions = {service: `preauth-secret::${mockServerUrl}`, accessGroup: undefined};

    beforeEach(() => {
        jest.clearAllMocks();
        clearCachedServerCredentials();
        Platform.OS = 'ios';
        jest.mocked(KeyChain.setInternetCredentials).mockResolvedValue({
            service: mockServerUrl,
            storage: 'keychain',
        } as any);
        jest.mocked(KeyChain.setGenericPassword).mockResolvedValue({
            service: mockServerUrl,
            storage: 'keychain',
        } as any);
        jest.mocked(KeyChain.resetGenericPassword).mockResolvedValue(true);
    });

    afterEach(() => {
        Platform.OS = originalPlatform;
    });

    describe('setServerCredentials', () => {
        it('should store the session token', async () => {
            await setServerCredentials(mockServerUrl, mockToken);

            expect(KeyChain.setInternetCredentials).toHaveBeenCalledWith(
                mockServerUrl,
                mockToken,
                mockToken,
                expect.objectContaining({
                    securityLevel: KeyChain.SECURITY_LEVEL.SECURE_SOFTWARE,
                }),
            );
        });

        it('should never touch the pre-auth secret entry', async () => {
            await setServerCredentials(mockServerUrl, mockToken);

            expect(KeyChain.resetGenericPassword).not.toHaveBeenCalled();
            expect(KeyChain.setGenericPassword).not.toHaveBeenCalled();
        });

        it('should not store credentials when serverUrl is missing', async () => {
            await setServerCredentials('', mockToken);

            expect(KeyChain.setInternetCredentials).not.toHaveBeenCalled();
            expect(KeyChain.setGenericPassword).not.toHaveBeenCalled();
        });

        it('should not store credentials when token is missing', async () => {
            await setServerCredentials(mockServerUrl, '');

            expect(KeyChain.setInternetCredentials).not.toHaveBeenCalled();
            expect(KeyChain.setGenericPassword).not.toHaveBeenCalled();
        });

        it('should use iOS app group on iOS platform', async () => {
            Platform.OS = 'ios';

            await setServerCredentials(mockServerUrl, mockToken);

            expect(KeyChain.setInternetCredentials).toHaveBeenCalledWith(
                mockServerUrl,
                mockToken,
                mockToken,
                expect.objectContaining({
                    accessGroup: 'group.com.mattermost.test',
                }),
            );
        });

        it('should not use app group on Android platform', async () => {
            Platform.OS = 'android';

            await setServerCredentials(mockServerUrl, mockToken);

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

    describe('setPreauthSecret', () => {
        it('should store the secret keyed by server URL on iOS', async () => {
            Platform.OS = 'ios';

            await setPreauthSecret(mockServerUrl, mockPreauthSecret);

            expect(KeyChain.setGenericPassword).toHaveBeenCalledWith(
                'preauth_secret',
                mockPreauthSecret,
                {...iosPreauthOptions, securityLevel: KeyChain.SECURITY_LEVEL.SECURE_SOFTWARE},
            );
        });

        it('should prefix the service on Android so it cannot collide with the token alias', async () => {
            Platform.OS = 'android';

            await setPreauthSecret(mockServerUrl, mockPreauthSecret);

            expect(KeyChain.setGenericPassword).toHaveBeenCalledWith(
                'preauth_secret',
                mockPreauthSecret,
                {...androidPreauthOptions, securityLevel: KeyChain.SECURITY_LEVEL.SECURE_SOFTWARE},
            );
        });

        it('should keep each server secret separate', async () => {
            await setPreauthSecret('https://a.com', 'secret-a');
            await setPreauthSecret('https://b.com', 'secret-b');

            expect(KeyChain.setGenericPassword).toHaveBeenNthCalledWith(
                1, 'preauth_secret', 'secret-a', expect.objectContaining({service: 'https://a.com'}),
            );
            expect(KeyChain.setGenericPassword).toHaveBeenNthCalledWith(
                2, 'preauth_secret', 'secret-b', expect.objectContaining({service: 'https://b.com'}),
            );
        });

        it('should report true when the secret was stored', async () => {
            await expect(setPreauthSecret(mockServerUrl, mockPreauthSecret)).resolves.toBe(true);
        });

        it('should report false when Keychain refuses the write without throwing', async () => {
            jest.mocked(KeyChain.setGenericPassword).mockResolvedValue(false);

            await expect(setPreauthSecret(mockServerUrl, mockPreauthSecret)).resolves.toBe(false);
        });

        it('should report false when the write throws', async () => {
            jest.mocked(KeyChain.setGenericPassword).mockRejectedValue(new Error('Keystore error'));

            await expect(setPreauthSecret(mockServerUrl, mockPreauthSecret)).resolves.toBe(false);
        });

        it('should not store an empty secret', async () => {
            await expect(setPreauthSecret(mockServerUrl, '')).resolves.toBe(false);

            expect(KeyChain.setGenericPassword).not.toHaveBeenCalled();
        });

        it('should not store without a server URL', async () => {
            await setPreauthSecret('', mockPreauthSecret);

            expect(KeyChain.setGenericPassword).not.toHaveBeenCalled();
        });
    });

    describe('getLegacyPreauthSecret', () => {
        it('should return the password only when the account is the legacy preauth account', async () => {
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue({
                username: 'preauth_secret',
                password: 'should-not-adopt',
                service: 'com.mattermost.rn',
                storage: 'keychain' as any,
            });

            await expect(getLegacyPreauthSecret()).resolves.toBeUndefined();

            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue({
                username: LEGACY_PREAUTH_SECRET_ACCOUNT,
                password: 'legacy-secret',
                service: 'com.mattermost.rn',
                storage: 'keychain' as any,
            });

            await expect(getLegacyPreauthSecret()).resolves.toBe('legacy-secret');
            expect(KeyChain.getGenericPassword).toHaveBeenCalledWith({
                accessGroup: 'group.com.mattermost.test',
            });
        });

        it('should omit the access group on Android', async () => {
            Platform.OS = 'android';
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            await getLegacyPreauthSecret();

            expect(KeyChain.getGenericPassword).toHaveBeenCalledWith({accessGroup: undefined});
        });

        it('should throw when the keychain read fails', async () => {
            jest.mocked(KeyChain.getGenericPassword).mockRejectedValue(new Error('Keystore error'));

            await expect(getLegacyPreauthSecret()).rejects.toThrow('Keystore error');
        });
    });

    describe('removeLegacyPreauthSecret', () => {
        it('should reset the legacy shared entry without a service', async () => {
            await removeLegacyPreauthSecret();

            expect(KeyChain.resetGenericPassword).toHaveBeenCalledWith({
                accessGroup: 'group.com.mattermost.test',
            });
        });

        it('should omit the access group on Android', async () => {
            Platform.OS = 'android';

            await removeLegacyPreauthSecret();

            expect(KeyChain.resetGenericPassword).toHaveBeenCalledWith({accessGroup: undefined});
        });
    });

    describe('getPreauthSecret', () => {
        it('should read the secret keyed by server URL', async () => {
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue({
                username: 'preauth_secret',
                password: mockPreauthSecret,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });

            await expect(getPreauthSecret(mockServerUrl)).resolves.toBe(mockPreauthSecret);
            expect(KeyChain.getGenericPassword).toHaveBeenCalledWith(iosPreauthOptions);
        });

        it('should use the prefixed service on Android', async () => {
            Platform.OS = 'android';
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            await getPreauthSecret(mockServerUrl);

            expect(KeyChain.getGenericPassword).toHaveBeenCalledWith(androidPreauthOptions);
        });

        it('should return undefined when there is no secret', async () => {
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            await expect(getPreauthSecret(mockServerUrl)).resolves.toBeUndefined();
        });

        it('should return undefined when the read fails', async () => {
            jest.mocked(KeyChain.getGenericPassword).mockRejectedValue(new Error('Keystore error'));

            await expect(getPreauthSecret(mockServerUrl)).resolves.toBeUndefined();
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
                username: 'preauth_secret',
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
        it('should remove the pre-auth secret for that server only', async () => {
            await removePreauthSecret(mockServerUrl);

            expect(KeyChain.resetGenericPassword).toHaveBeenCalledWith(iosPreauthOptions);
        });

        it('should use the prefixed service on Android', async () => {
            Platform.OS = 'android';

            await removePreauthSecret(mockServerUrl);

            expect(KeyChain.resetGenericPassword).toHaveBeenCalledWith(androidPreauthOptions);
        });

        it('should gracefully handle errors when pre-auth secret does not exist', async () => {
            jest.mocked(KeyChain.resetGenericPassword).mockRejectedValue(new Error('Not found'));

            await expect(removePreauthSecret(mockServerUrl)).resolves.not.toThrow();

            expect(KeyChain.resetGenericPassword).toHaveBeenCalledWith(iosPreauthOptions);
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

        it('should ignore pre-auth and legacy aliases when listing Android services', async () => {
            Platform.OS = 'android';

            jest.mocked(KeyChain.getAllGenericPasswordServices).mockResolvedValue([
                'https://server1.com',
                'preauth-secret::https://server1.com',
                '',
            ]);
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: 'user1',
                password: 'token1',
                service: 'https://server1.com',
                storage: 'keychain' as any,
            });
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            const result = await getAllServerCredentials();

            expect(result).toHaveLength(1);
            expect(result[0].serverUrl).toBe('https://server1.com');
            expect(KeyChain.getInternetCredentials).toHaveBeenCalledTimes(1);
            expect(KeyChain.getInternetCredentials).toHaveBeenCalledWith('https://server1.com');
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
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(false);

            const result = await getAllServerCredentials(['https://server1.com']);

            expect(result).toHaveLength(1);
            expect(result[0].serverUrl).toBe('https://server1.com');
            expect(KeyChain.getAllGenericPasswordServices).not.toHaveBeenCalled();
        });

        it('should fall back to listing when known URLs is empty', async () => {
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

            const second = await getAllServerCredentials();
            const one = await getServerCredentials(mockServerUrl);

            expect(second).toEqual(first);
            expect(one).toEqual(first[0]);
            expect((KeyChain as any).getAllInternetPasswordServers).not.toHaveBeenCalled();
            expect(KeyChain.getInternetCredentials).not.toHaveBeenCalled();
        });
    });

    describe('credential cache', () => {
        const loadCache = async (preauthSecret?: string) => {
            jest.mocked((KeyChain as any).getAllInternetPasswordServers).mockResolvedValue([mockServerUrl]);
            jest.mocked(KeyChain.getInternetCredentials).mockResolvedValue({
                username: mockUserId,
                password: mockToken,
                service: mockServerUrl,
                storage: 'keychain' as any,
            });
            jest.mocked(KeyChain.getGenericPassword).mockResolvedValue(preauthSecret ? {
                username: 'preauth_secret',
                password: preauthSecret,
                service: mockServerUrl,
                storage: 'keychain' as any,
            } : false);
            await getAllServerCredentials();
        };

        it('should upsert the cached credential after a successful write', async () => {
            await loadCache();
            await setServerCredentials(mockServerUrl, 'new-token');

            await expect(getServerCredentials(mockServerUrl)).resolves.toEqual({
                serverUrl: mockServerUrl,
                userId: 'new-token',
                token: 'new-token',
                preauthSecret: undefined,
            });
        });

        it('should preserve the cached pre-auth secret across a token write', async () => {
            await loadCache(mockPreauthSecret);
            await setServerCredentials(mockServerUrl, 'new-token');

            await expect(getServerCredentials(mockServerUrl)).resolves.toEqual({
                serverUrl: mockServerUrl,
                userId: 'new-token',
                token: 'new-token',
                preauthSecret: mockPreauthSecret,
            });
        });

        it('should update the cached secret after a successful secret write', async () => {
            await loadCache();
            await setPreauthSecret(mockServerUrl, mockPreauthSecret);

            await expect(getServerCredentials(mockServerUrl)).resolves.toMatchObject({
                token: mockToken,
                preauthSecret: mockPreauthSecret,
            });
        });

        it('should leave the cache unchanged when a Keychain write fails', async () => {
            await loadCache();
            jest.mocked(KeyChain.setInternetCredentials).mockResolvedValue(false);

            await setServerCredentials(mockServerUrl, 'new-token');

            await expect(getServerCredentials(mockServerUrl)).resolves.toEqual({
                serverUrl: mockServerUrl,
                userId: mockUserId,
                token: mockToken,
                preauthSecret: undefined,
            });
        });

        it('should leave the cached secret unchanged when the write is not stored', async () => {
            await loadCache();
            jest.mocked(KeyChain.setGenericPassword).mockResolvedValue(false);

            await setPreauthSecret(mockServerUrl, mockPreauthSecret);

            await expect(getServerCredentials(mockServerUrl)).resolves.toMatchObject({
                preauthSecret: undefined,
            });
        });

        it('should drop the cached credential on remove', async () => {
            await loadCache();
            jest.mocked(KeyChain.getInternetCredentials).mockClear();

            await removeServerCredentials(mockServerUrl);

            await expect(getAllServerCredentials()).resolves.toEqual([]);
            expect(KeyChain.getInternetCredentials).not.toHaveBeenCalled();
        });

        it('should clear the cached preauthSecret after a successful reset', async () => {
            await loadCache(mockPreauthSecret);

            await removePreauthSecret(mockServerUrl);

            await expect(getServerCredentials(mockServerUrl)).resolves.toMatchObject({preauthSecret: undefined});
        });

        it('should keep the cached preauthSecret when the reset fails', async () => {
            await loadCache(mockPreauthSecret);
            jest.mocked(KeyChain.resetGenericPassword).mockRejectedValue(new Error('Keystore error'));

            await removePreauthSecret(mockServerUrl);

            await expect(getServerCredentials(mockServerUrl)).resolves.toMatchObject({preauthSecret: mockPreauthSecret});
        });

        it('should not let callers mutate cached credentials', async () => {
            await loadCache();
            const all = await getAllServerCredentials();
            all[0].preauthSecret = 'mutated';

            await expect(getServerCredentials(mockServerUrl)).resolves.toMatchObject({preauthSecret: undefined});
        });
    });
});
