// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules} from 'react-native';

export type ServerCertificateInfo = {
    host: string;
    fileName: string;
    subject: string;
    fingerprint: string;
    notAfter: number;
};

type NativeServerCertificateModule = {
    importCertificate: (serverUrl: string, uri: string, fileName?: string) => Promise<ServerCertificateInfo>;
    getCertificate: (serverUrl: string) => Promise<ServerCertificateInfo | null>;
    removeCertificate: (serverUrl: string) => Promise<boolean>;
    reassignCertificate: (previousServerUrl: string, newServerUrl: string) => Promise<ServerCertificateInfo>;
};

function getNativeModule(): NativeServerCertificateModule {
    const nativeModule = NativeModules.ENCMAServerCertificates as NativeServerCertificateModule | undefined;
    if (!nativeModule) {
        throw new Error('The Android server-certificate module is unavailable. Rebuild and reinstall ENCMA.');
    }
    return nativeModule;
}

export async function importServerCertificate(
    serverUrl: string,
    uri: string,
    fileName?: string,
): Promise<ServerCertificateInfo> {
    return getNativeModule().importCertificate(serverUrl, uri, fileName);
}

export async function getServerCertificate(serverUrl: string): Promise<ServerCertificateInfo | null> {
    return getNativeModule().getCertificate(serverUrl);
}

export async function removeServerCertificate(serverUrl: string): Promise<boolean> {
    const nativeModule = NativeModules.ENCMAServerCertificates as NativeServerCertificateModule | undefined;
    if (!nativeModule) {
        return false;
    }
    return nativeModule.removeCertificate(serverUrl);
}

export async function reassignServerCertificate(
    previousServerUrl: string,
    newServerUrl: string,
): Promise<ServerCertificateInfo> {
    return getNativeModule().reassignCertificate(previousServerUrl, newServerUrl);
}
