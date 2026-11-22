// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getOrCreateAPIClient} from '@mattermost/react-native-network-client';
import {Directory, File, Paths} from 'expo-file-system';
import {sha256} from 'js-sha256';

import * as ClientConstants from '@client/rest/constants';
import {getPreauthSecret} from '@init/credentials';

import NetworkManager from './network_manager';

jest.mock('@init/credentials', () => ({
    ...jest.requireActual('@init/credentials'),
    getPreauthSecret: jest.fn(),
}));

describe('NetworkManager.createClient', () => {
    it('should send the preauth secret header for an https server', async () => {
        await NetworkManager.createClient('https://example.com', 'token', 'secret');

        const config = jest.mocked(getOrCreateAPIClient).mock.lastCall?.[1];
        expect(config?.headers?.[ClientConstants.HEADER_X_MATTERMOST_PREAUTH_SECRET]).toBe('secret');
    });

    it('should not send the preauth secret header for an http server', async () => {
        await NetworkManager.createClient('http://example.com', 'token', 'secret');

        const config = jest.mocked(getOrCreateAPIClient).mock.lastCall?.[1];
        expect(config?.headers).not.toHaveProperty(ClientConstants.HEADER_X_MATTERMOST_PREAUTH_SECRET);
    });

    it.each([
        ['android', ['MMAUTHTOKEN']],
        ['ios', undefined],
    ] as const)('should set excludedCookies on %s to %p', async (os, expected) => {
        jest.resetModules();
        const {Platform} = require('react-native');
        const {getOrCreateAPIClient: getClient} = require('@mattermost/react-native-network-client');
        jest.mocked(Platform.select).mockImplementation((dict: Record<string, unknown>) => dict[os]);
        const PlatformNetworkManager = require('./network_manager').default;

        await PlatformNetworkManager.createClient('https://example.com', 'token');

        expect(jest.mocked(getClient).mock.lastCall?.[1]?.excludedCookies).toEqual(expected);
    });
});

describe('NetworkManager server CA', () => {
    const serverUrl = 'https://chat.example.com:8065';
    const caFileName = `${sha256(serverUrl)}.pem`;
    const pem = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n';

    const originalFileImpl = jest.mocked(File).getMockImplementation();
    const originalDirectoryImpl = jest.mocked(Directory).getMockImplementation();

    type MockCaFile = {
        exists: boolean;
        create: jest.Mock;
        write: jest.Mock;
        delete: jest.Mock;
        text: jest.Mock;
    };

    let caFile: MockCaFile;
    let caDirectory: {create: jest.Mock};

    const mockCaFile = (exists: boolean, contents = '') => {
        caFile = {
            exists,
            create: jest.fn(),
            write: jest.fn(),
            delete: jest.fn(),
            text: jest.fn(async () => contents),
        };
        jest.mocked(File).mockImplementation((() => caFile) as never);
    };

    beforeEach(() => {
        caDirectory = {create: jest.fn()};
        jest.mocked(Directory).mockImplementation((() => caDirectory) as never);
        mockCaFile(false);
    });

    afterEach(async () => {
        jest.mocked(File).mockImplementation(originalFileImpl!);
        jest.mocked(Directory).mockImplementation(originalDirectoryImpl!);
        NetworkManager.invalidateClient(serverUrl);
    });

    describe('saveServerCa', () => {
        it('should write the CA to a per-server file in the documents directory', () => {
            const changed = NetworkManager.saveServerCa(serverUrl, pem);

            expect(changed).toBe(true);
            expect(Directory).toHaveBeenCalledWith(Paths.document, 'server_ca');
            expect(caDirectory.create).toHaveBeenCalledWith({intermediates: true, idempotent: true});
            expect(File).toHaveBeenCalledWith(caDirectory, caFileName);
            expect(caFile.create).toHaveBeenCalledWith({intermediates: true, overwrite: true});
            expect(caFile.write).toHaveBeenCalledWith(pem);
            expect(caFile.delete).not.toHaveBeenCalled();
        });

        it('should delete a stored CA when called without one', () => {
            mockCaFile(true);

            const changed = NetworkManager.saveServerCa(serverUrl, undefined);

            expect(changed).toBe(true);
            expect(caFile.delete).toHaveBeenCalled();
            expect(caFile.write).not.toHaveBeenCalled();
        });

        it('should report no change when there is no CA to store or delete', () => {
            mockCaFile(false);

            const changed = NetworkManager.saveServerCa(serverUrl, undefined);

            expect(changed).toBe(false);
            expect(caFile.delete).not.toHaveBeenCalled();
            expect(caFile.write).not.toHaveBeenCalled();
        });

        it('should treat an empty CA as removing it', () => {
            mockCaFile(true);

            NetworkManager.saveServerCa(serverUrl, '');

            expect(caFile.write).not.toHaveBeenCalled();
            expect(caFile.delete).toHaveBeenCalled();
        });
    });

    describe('createClient', () => {
        it('should pass the stored CA as sessionConfiguration.serverCa', async () => {
            mockCaFile(true, pem);

            await NetworkManager.createClient(serverUrl, 'token');

            const config = jest.mocked(getOrCreateAPIClient).mock.lastCall?.[1];
            expect(config?.sessionConfiguration).toHaveProperty('serverCa', pem);
        });

        it('should not set serverCa when no CA is stored', async () => {
            mockCaFile(false);

            await NetworkManager.createClient(serverUrl, 'token');

            const config = jest.mocked(getOrCreateAPIClient).mock.lastCall?.[1];
            expect(config?.sessionConfiguration).not.toHaveProperty('serverCa');
            expect(caFile.text).not.toHaveBeenCalled();
        });

        it('should still create the client without serverCa when the CA cannot be read', async () => {
            mockCaFile(true);
            caFile.text.mockRejectedValue(new Error('read failed'));

            await NetworkManager.createClient(serverUrl, 'token');

            const config = jest.mocked(getOrCreateAPIClient).mock.lastCall?.[1];
            expect(config?.sessionConfiguration).not.toHaveProperty('serverCa');
        });
    });

    describe('setServerCa', () => {
        it('should save the CA and recreate the client with it', async () => {
            jest.mocked(getPreauthSecret).mockResolvedValue('secret');
            const existing = await NetworkManager.createClient(serverUrl, 'token');
            const invalidateSpy = jest.spyOn(existing, 'invalidate');

            mockCaFile(false);
            caFile.text.mockResolvedValue(pem);
            caFile.write.mockImplementation(() => {
                caFile.exists = true;
            });

            const client = await NetworkManager.setServerCa(serverUrl, pem, 'token');

            expect(caFile.write).toHaveBeenCalledWith(pem);
            expect(invalidateSpy).toHaveBeenCalled();
            expect(client).not.toBe(existing);
            expect(NetworkManager.getClient(serverUrl)).toBe(client);
            expect(getPreauthSecret).toHaveBeenCalledWith(serverUrl);

            const config = jest.mocked(getOrCreateAPIClient).mock.lastCall?.[1];
            expect(config?.sessionConfiguration).toHaveProperty('serverCa', pem);
            expect(config?.headers?.[ClientConstants.HEADER_X_MATTERMOST_PREAUTH_SECRET]).toBe('secret');
        });
    });
});
