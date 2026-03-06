// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {E2eeClient, SignatureKeyPair} from './types';

/**
 * E2EEManager - Wrapper for E2EE native module
 *
 * Provides safe access to E2EE functions that gracefully degrade
 * when the native module is not available.
 */
class E2EEManagerSingleton {
    // Held to prevent GC while Rust holds the callback reference
    private client: E2eeClient | null = null;

    initialize(client: E2eeClient) {
        this.client = client;
    }

    generateSignatureKeyPair(): SignatureKeyPair | null {
        if (!this.client) {
            return null;
        }

        return this.client.generateSignatureKeyPair();
    }

    /**
     * Generate key packages will generate the specified number of key packages for the user and device,
     * and store them in the app storage via the write_key_packages callback.
     *
     * @param userId
     * @param deviceId
     * @param signaturePublicKey
     * @param quantity the number of key packages to generate
     * @param needLastResort whether to generate a last resort key package.
     * @returns
     */
    generateKeyPackages(userId: string, deviceId: string, signaturePublicKey: string, quantity: number, needLastResort: boolean): number | null {
        if (!this.client) {
            return null;
        }

        return this.client.generateKeyPackages(userId, deviceId, signaturePublicKey, quantity, needLastResort);
    }
}

const E2EEManager = new E2EEManagerSingleton();
export default E2EEManager;
