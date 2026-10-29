// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules} from 'react-native';

import {
    getServerCertificate,
    importServerCertificate,
    reassignServerCertificate,
    removeServerCertificate,
} from './server_certificate_manager';

const nativeModule = {
    importCertificate: jest.fn(),
    getCertificate: jest.fn(),
    removeCertificate: jest.fn(),
    reassignCertificate: jest.fn(),
};

describe('server certificate manager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        NativeModules.ENCMAServerCertificates = nativeModule;
    });

    afterEach(() => {
        delete NativeModules.ENCMAServerCertificates;
    });

    it('passes only the server URL, document URI, and display filename to native code', async () => {
        const imported = {host: 'chat.example.test', fileName: 'cert.crt'};
        nativeModule.importCertificate.mockResolvedValue(imported);

        await expect(importServerCertificate('https://chat.example.test', 'content://certificate', 'cert.crt')).resolves.toEqual(imported);
        expect(nativeModule.importCertificate).toHaveBeenCalledWith(
            'https://chat.example.test',
            'content://certificate',
            'cert.crt',
        );
    });

    it('keeps cross-platform server cleanup safe when the Android module is absent', async () => {
        delete NativeModules.ENCMAServerCertificates;

        await expect(removeServerCertificate('https://chat.example.test')).resolves.toBe(false);
        expect(nativeModule.removeCertificate).not.toHaveBeenCalled();
    });

    it('loads, reassigns, and removes the certificate association', async () => {
        nativeModule.getCertificate.mockResolvedValue(null);
        nativeModule.reassignCertificate.mockResolvedValue({host: 'new.example.test'});
        nativeModule.removeCertificate.mockResolvedValue(true);

        await expect(getServerCertificate('https://old.example.test')).resolves.toBeNull();
        await reassignServerCertificate('https://old.example.test', 'https://new.example.test');
        await expect(removeServerCertificate('https://new.example.test')).resolves.toBe(true);

        expect(nativeModule.getCertificate).toHaveBeenCalledWith('https://old.example.test');
        expect(nativeModule.reassignCertificate).toHaveBeenCalledWith('https://old.example.test', 'https://new.example.test');
        expect(nativeModule.removeCertificate).toHaveBeenCalledWith('https://new.example.test');
    });
});
