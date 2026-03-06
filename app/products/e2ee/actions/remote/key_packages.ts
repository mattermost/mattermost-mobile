// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getCurrentDevice} from '@e2ee/database/queries/devices';

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import E2EEManager from '@managers/e2ee_manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

const KEY_PACKAGES_REPLENISH_THRESHOLD = 10;
const KEY_PACKAGES_DESIRED_QUANTITY = 20;

type CountKeyPackagesResponse = {
    result?: KeyPackageCountReturn;
    error?: unknown;
}

export const countKeyPackages = async (serverUrl: string): Promise<CountKeyPackagesResponse> => {
    try {
        const client = NetworkManager.getClient(serverUrl);

        const result = await client.countKeyPackages();
        return {result};
    } catch (error) {
        logError('[countKeyPackages]', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const generateKeyPackages = async (serverUrl: string, userId: string, quantity: number, generateLastResort: boolean) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentDevice = await getCurrentDevice(database);
        if (!currentDevice) {
            throw new Error('no current device found');
        }

        const {deviceId, signaturePublicKey} = currentDevice;
        if (!signaturePublicKey) {
            throw new Error('current device has no signature public key');
        }

        const count = E2EEManager.generateKeyPackages(userId, deviceId, signaturePublicKey, quantity, generateLastResort);
        if (count === null) {
            throw new Error('E2EE native module is not available');
        }

        return {data: count};
    } catch (error) {
        logError('[generateKeyPackages]', error);
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const replenishKeyPackages = async (serverUrl: string, userId: string) => {
    const {result, error} = await countKeyPackages(serverUrl);
    if (error || !result || result.available > KEY_PACKAGES_REPLENISH_THRESHOLD) {
        return;
    }

    generateKeyPackages(serverUrl, userId, KEY_PACKAGES_DESIRED_QUANTITY - result.available, !result.last_resort);
};
