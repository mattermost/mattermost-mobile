// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules} from 'react-native';

import {logWarning} from '@utils/log';

import type {E2EESpec} from './types';
import type {SignatureKeyPairAdapter} from '@mattermost/e2ee';

// Check native module availability first (doesn't throw like require would)
const isNativeModuleAvailable = Boolean(NativeModules.MattermostE2ee);

let E2EE: E2EESpec | null = null;
logWarning('E2EE library available:', isNativeModuleAvailable);
if (isNativeModuleAvailable) {
    try {
        E2EE = require('@mattermost/e2ee');
    } catch (e) {
        logWarning('E2EE library failed to load:', e);
    }
}

/**
 * E2EEManager - Wrapper for E2EE native module
 *
 * Provides safe access to E2EE functions that gracefully degrade
 * when the native module is not available.
 */
class E2EEManagerSingleton {
    /**
     * Generates a new ed25519 signature key pair
     *
     * @returns type containing public key and a blob representing the key pair as bytes
     */
    generateSignatureKeyPair(): SignatureKeyPairAdapter | null {
        if (!E2EE) {
            return null;
        }

        return E2EE.generateSignatureKeyPair();
    }
}

const E2EEManager = new E2EEManagerSingleton();
export default E2EEManager;
