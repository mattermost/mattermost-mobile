// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bytesToBase64} from '@utils/encoding';

import type {AppStorage, KeyPackageBundleAdapter} from '@managers/e2ee_manager/types';

export type StoredKeyPackage = {
    hashRef: ArrayBuffer;
    keyPackage: KeyPackageBundleAdapter;
};

export class LocalAppStorage implements AppStorage {
    private readonly cache = new Map<string, StoredKeyPackage>();

    writeKeyPackage(hashRef: ArrayBuffer, keyPackage: KeyPackageBundleAdapter): void {
        const key = bytesToBase64(new Uint8Array(hashRef));
        this.cache.set(key, {hashRef, keyPackage});
    }

    getKeyPackage(hashRef: ArrayBuffer): StoredKeyPackage | undefined {
        const key = bytesToBase64(new Uint8Array(hashRef));
        return this.cache.get(key);
    }
}
