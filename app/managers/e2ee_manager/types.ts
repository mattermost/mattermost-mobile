// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type SignatureKeyPair = {
    publicKey: string;
    blob: ArrayBuffer;
};

export type KeyPackageBundleAdapter = {
    publicKeyPackage: ArrayBuffer;
    privateInitKey: ArrayBuffer;
    privateEncryptionKey: ArrayBuffer;
    isLastResort: boolean;
};

export interface KeyProvider {
    getKey(asyncOpts_?: {signal: AbortSignal}): Promise<ArrayBuffer>;
}

export interface AppStorage {
    writeKeyPackage(hashRef: ArrayBuffer, bundle: KeyPackageBundleAdapter): void;
}

export interface E2eeClient {
    generateSignatureKeyPair(): SignatureKeyPair;
    generateKeyPackages(userId: string, deviceId: string, signaturePublicKey: string, quantity: number, needLastResort: boolean): number;
}
