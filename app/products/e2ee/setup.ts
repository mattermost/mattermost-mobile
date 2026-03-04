// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {LocalAppStorage} from '@e2ee/adapters/app_storage';
import {KeychainKeyProvider} from '@e2ee/adapters/keychain_provider';
import {NativeModules} from 'react-native';

import E2EEManager from '@managers/e2ee_manager';
import {logWarning} from '@utils/log';

import type {AppStorage, E2eeClient, KeyProvider} from '@managers/e2ee_manager/types';

type E2EEModule = {
    E2eeClient: new (keyProvider: KeyProvider, storage: AppStorage) => E2eeClient;
};

export const initializeE2EEManager = (serverUrl: string): void => {
    if (!NativeModules.MattermostE2ee) {
        return;
    }

    let e2eeModule: E2EEModule;
    try {
        e2eeModule = require('@mattermost/e2ee');
    } catch (e) {
        logWarning('[initializeE2EEManager] E2EE library failed to load:', e);
        return;
    }

    const keyProvider = new KeychainKeyProvider(serverUrl);
    const storage = new LocalAppStorage();
    const client = new e2eeModule.E2eeClient(keyProvider, storage);
    E2EEManager.initialize(client);
};
