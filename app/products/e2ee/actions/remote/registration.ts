// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {updateDevices} from '@e2ee/actions/local/devices';
import E2EE from '@e2ee/constants/e2ee';
import {generateSignatureKeyPair} from '@mattermost/e2ee';
import {nativeApplicationVersion} from 'expo-application';
import {deviceName, isDevice, modelName, osName, osVersion} from 'expo-device';
import {sortBy} from 'lodash';
import * as KeyChain from 'react-native-keychain';

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import {bytesToBase64} from '@utils/encoding';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError, logInfo} from '@utils/log';

import {fetchEnabledDevices, registerDevice} from './devices';

function getDisplayDeviceName(): string {
    if (!isDevice) {
        return osName === 'iOS' || osName === 'iPadOS' ? 'iOS Simulator' : 'Android Emulator';
    }

    if (deviceName?.trim()) {
        return deviceName.trim();
    }

    return modelName?.trim() ?? osName ?? '';
}

export const initE2eeDevice = async (serverUrl: string, userId: string) => {
    const result = await checkIsE2eePluginEnabled(serverUrl);
    if (result.error) {
        logError(result.error);
        return {error: result.error};
    }

    const e2eeEnabled = result.data || false;
    if (e2eeEnabled) {
        try {
            // we know initialization has been done if signature key is already saved to keystore
            const alreadyInKeychain = await isInKeychain(serverUrl);
            if (alreadyInKeychain) {
                return {data: false};
            }

            // generate signing key may throw an error during generation
            const signingKey = generateSignatureKeyPair();
            const base64SigningKey = bytesToBase64(new Uint8Array(signingKey.blob));

            // store signing key in keychain
            const storedValue = await storeInKeychain(serverUrl, base64SigningKey);
            const storedType = storedValue ? storedValue.storage : undefined;
            if (storedType) {
                const now = new Date().getTime();
                const deviceDisplayName = getDisplayDeviceName();

                // post register device
                const response = await registerDevice(serverUrl, signingKey.publicKey, deviceDisplayName);

                // set the device as verified if it is the first enabled device
                const createdDevices = await fetchEnabledDevices(serverUrl, response.device_id);
                let verified = false;
                if ((createdDevices.devices?.length ?? 0) > 0) {
                    const sorted = sortBy(createdDevices.devices ?? [], 'created_at');

                    if (sorted[0].device_id === response.device_id) {
                        verified = true;
                    }
                }

                // generate identity
                const identity = {
                    userId,
                    deviceId: response.device_id,
                };

                logInfo('generated identity is ', identity);

                // save or update registered device data
                await updateDevices(serverUrl, [{
                    device_id: response.device_id,
                    device_name: deviceDisplayName,
                    signature_public_key: signingKey.publicKey,
                    created_at: now,
                    last_active_at: now,
                    app_version: nativeApplicationVersion ?? '',
                    os_version: osVersion ?? '',
                    verified,
                }]);
            }

            return {data: true};
        } catch (error) {
            // we reset keychain in case signing key information was set in case of error.
            const removed = await removeFromKeychain(serverUrl);
            if (!removed) {
                logInfo('failure while removing existing key from keychain');
            }

            logDebug('error during e2ee device initialization', getFullErrorMessage(error));
            forceLogoutIfNecessary(serverUrl, error);
            return {error};
        }

    }

    return {data: false};
};

export const isInKeychain = async (serverUrl: string) => {
    return KeyChain.hasGenericPassword({
        server: serverUrl,
        service: E2EE.KeychainSigningKey,
    });
};

export const storeInKeychain = async (serverUrl: string, encodedKey: string) => {
    return KeyChain.setGenericPassword('key', encodedKey, {
        accessible: KeyChain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        server: serverUrl,
        service: E2EE.KeychainSigningKey,
    });
};

export const removeFromKeychain = async (serverUrl: string) => {
    return KeyChain.resetGenericPassword({
        server: serverUrl,
        service: E2EE.KeychainSigningKey,
    });
};

export const checkIsE2eePluginEnabled = async (serverUrl: string) => {
    let manifests: ClientPluginManifest[] = [];
    try {
        const client = NetworkManager.getClient(serverUrl);
        manifests = await client.getPluginsManifests();
    } catch (error) {
        logDebug('error on checkIsE2eePluginEnabled', getFullErrorMessage(error));
        await forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }

    const manifest = manifests.find((m) => m.id === E2EE.PluginId);

    // TODO implement database caching
    return {data: manifest != null};
};
