// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Directory, File, Paths} from 'expo-file-system';
import {sha256} from 'js-sha256';

import {logError} from '@utils/log';

import {readServerCa, saveServerCa} from './index';

jest.mock('@utils/log', () => ({
    logError: jest.fn(),
}));

describe('server CA storage', () => {
    const serverUrl = 'https://10.0.0.5:8065';
    const caFileName = `${sha256(serverUrl)}.pem`;
    const pem = '-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----\n';

    const originalFileImpl = jest.mocked(File).getMockImplementation();
    const originalDirectoryImpl = jest.mocked(Directory).getMockImplementation();

    let caFile: {exists: boolean; create: jest.Mock; write: jest.Mock; delete: jest.Mock; text: jest.Mock};
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

    afterEach(() => {
        jest.mocked(File).mockImplementation(originalFileImpl!);
        jest.mocked(Directory).mockImplementation(originalDirectoryImpl!);
    });

    describe('saveServerCa', () => {
        it('should write the CA to a per-server file', () => {
            expect(saveServerCa(serverUrl, pem)).toBe(true);

            expect(Directory).toHaveBeenCalledWith(Paths.document, 'server_ca');
            expect(caDirectory.create).toHaveBeenCalledWith({intermediates: true, idempotent: true});
            expect(File).toHaveBeenCalledWith(caDirectory, caFileName);
            expect(caFile.create).toHaveBeenCalledWith({intermediates: true, overwrite: true});
            expect(caFile.write).toHaveBeenCalledWith(pem);
        });

        it('should name the file after the hex SHA-256 of the server URL', () => {
            saveServerCa(serverUrl, pem);

            expect(File).toHaveBeenCalledWith(caDirectory, 'c8edfdc501989360f0a7648c414055da2494e297cebd5c889daaaca4fc07fdeb.pem');
        });

        it('should use different files for URLs that differ only in special characters', () => {
            // These would collide if special characters were replaced by "_".
            saveServerCa('https://a-b.example.com', pem);
            saveServerCa('https://a_b.example.com', pem);

            const names = jest.mocked(File).mock.calls.map((call) => call[1]);
            expect(names).toHaveLength(2);
            expect(names[0]).not.toBe(names[1]);
            expect(names).toEqual([
                `${sha256('https://a-b.example.com')}.pem`,
                `${sha256('https://a_b.example.com')}.pem`,
            ]);
        });

        it('should delete a stored CA when given none', () => {
            mockCaFile(true);

            expect(saveServerCa(serverUrl, undefined)).toBe(true);
            expect(caFile.delete).toHaveBeenCalled();
            expect(caFile.write).not.toHaveBeenCalled();
        });

        it('should report no change when there is nothing to store or delete', () => {
            expect(saveServerCa(serverUrl, '')).toBe(false);
            expect(caFile.delete).not.toHaveBeenCalled();
            expect(caFile.write).not.toHaveBeenCalled();
        });
    });

    describe('readServerCa', () => {
        it('should return the stored CA', async () => {
            mockCaFile(true, pem);

            await expect(readServerCa(serverUrl)).resolves.toBe(pem);
            expect(File).toHaveBeenCalledWith(caDirectory, caFileName);
        });

        it('should return undefined when no CA is stored', async () => {
            mockCaFile(false);

            await expect(readServerCa(serverUrl)).resolves.toBeUndefined();
            expect(caFile.text).not.toHaveBeenCalled();
        });

        it('should return undefined for an empty file', async () => {
            mockCaFile(true, '');

            await expect(readServerCa(serverUrl)).resolves.toBeUndefined();
        });

        it('should return undefined and log when the CA cannot be read', async () => {
            mockCaFile(true);
            caFile.text.mockRejectedValue(new Error('read failed'));

            await expect(readServerCa(serverUrl)).resolves.toBeUndefined();
            expect(logError).toHaveBeenCalled();
        });
    });
});
