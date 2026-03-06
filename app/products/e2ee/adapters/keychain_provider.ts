// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import E2EE from '@e2ee/constants/e2ee';
import * as KeyChain from 'react-native-keychain';

import {base64ToBytes} from '@utils/encoding';

import type {KeyProvider} from '@managers/e2ee_manager/types';

export class KeychainKeyProvider implements KeyProvider {
    private readonly serverUrl: string;

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
    }

    async getKey(): Promise<ArrayBuffer> {
        const creds = await getFromKeychain(this.serverUrl);
        if (!creds) {
            throw new Error('[KeychainKeyProvider.getKey] key not found in keychain');
        }
        return base64ToBytes(creds.password).buffer as ArrayBuffer;
    }
}

export const getFromKeychain = async (serverUrl: string) => {
    return KeyChain.getGenericPassword({
        server: serverUrl,
        service: E2EE.KeychainSigningKey,
    });
};
