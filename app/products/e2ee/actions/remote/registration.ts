// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {addDevice} from '@e2ee/actions/local/devices';
import E2EE from '@e2ee/constants/e2ee';
import {getCurrentDevice} from '@e2ee/database/queries/devices';
import {generateSignatureKeyPair} from '@mattermost/e2ee';
import {deviceName, isDevice, modelName, osName} from 'expo-device';
import {defineMessages} from 'react-intl';
import * as KeyChain from 'react-native-keychain';

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import EphemeralStore from '@store/ephemeral_store';
import {bytesToBase64} from '@utils/encoding';
import {getFullErrorMessage} from '@utils/errors';
import {getIntlShape} from '@utils/general';
import {logDebug, logError, logInfo} from '@utils/log';

import {registerDevice} from './devices';

const messages = defineMessages({
    keychainUnavailable: {
        id: 'e2ee.init.keychain_unavailable',
        defaultMessage: 'This device\'s secure storage is unavailable. End-to-end encryption could not be enabled.',
    },
});

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
        logError('[initE2eeDevice]', result.error);
        return {error: result.error};
    }

    const e2eePluginEnabled = result.data || false;
    if (e2eePluginEnabled) {
        try {
            // we know initialization has been done if signature key is already saved to keystore
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const currentDevice = await getCurrentDevice(database);
            if (currentDevice) {
                return {data: false};
            }

            // generate signing key may throw an error during generation
            const signingKey = generateSignatureKeyPair();
            const base64SigningKey = bytesToBase64(new Uint8Array(signingKey.blob));

            // store signing key in keychain
            const storedValue = await storeInKeychain(serverUrl, base64SigningKey);
            const storedType = storedValue ? storedValue.storage : undefined;
            if (storedType) {
                const deviceDisplayName = getDisplayDeviceName();

                // post register device
                const registerResult = await registerDevice(serverUrl, signingKey.publicKey, deviceDisplayName);
                if ('error' in registerResult) {
                    throw registerResult.error;
                }

                // add current device
                const {data} = await addDevice(serverUrl, registerResult.device_id, signingKey.publicKey);

                // log generated identity
                logInfo('[initE2eeDevice] generated identity is ', {userId, deviceId: data?.[0]?.deviceId});
            } else {
                const intl = getIntlShape();
                throw new Error(intl.formatMessage(messages.keychainUnavailable));
            }

            EphemeralStore.clearE2eeInitStatus(serverUrl);
            return {data: true};
        } catch (error) {
            // we reset keychain in case signing key information was set even in case of error.
            const removed = await removeFromKeychain(serverUrl);
            if (!removed) {
                logInfo('[initE2eeDevice] failure while removing existing key from keychain');
            }

            const errorMessage = getFullErrorMessage(error);
            EphemeralStore.addInitE2eeDeviceStatus(serverUrl, getDisplayDeviceName(), errorMessage);

            logDebug('[initE2eeDevice] error during e2ee device initialization', errorMessage);
            forceLogoutIfNecessary(serverUrl, error);
            return {error};
        }
    }

    return {data: false};
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
