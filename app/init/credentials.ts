// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import * as KeyChain from 'react-native-keychain';

import DatabaseManager from '@database/manager';
import * as analytics from '@init/analytics';
import EphemeralStore from '@store/ephemeral_store';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';
import {getCSRFFromCookie} from '@utils/security';

const ASYNC_STORAGE_CURRENT_SERVER_KEY = '@currentServerUrl';

// TODO: This function should be in DatabaseManager?
export const getCurrentServerUrl = async () => {
    let serverUrl = await DatabaseManager.getActiveServerUrl(); // TODO: need funciton to get active server url
    if (!serverUrl) {
        // If upgrading from non-Gekidou, the server URL might be in
        // AsyncStorage. If so, retrieve the server URL, create a DB for it,
        // then delete the AsyncStorage item.
        serverUrl = await AsyncStorage.getItem(ASYNC_STORAGE_CURRENT_SERVER_KEY);
        if (serverUrl) {
            DatabaseManager.setActiveServerDatabase(serverUrl);
            AsyncStorage.removeItem(ASYNC_STORAGE_CURRENT_SERVER_KEY);
        }
    }

    return serverUrl;
};

export const setAppCredentials = (deviceToken: string, currentUserId: string, token: string, url: string) => {
    if (!currentUserId) {
        return;
    }

    // Only save to keychain if the url and token are set
    if (url && token) {
        try {
            const username = `${deviceToken}, ${currentUserId}`;
            
            let accessGroup;
            if (Platform.OS === 'ios') {
                const appGroup = getIOSAppGroupDetails();
                accessGroup = appGroup.appGroupIdentifier;
            }

            // TODO: Do we need these in EphemeralStore?
            EphemeralStore.deviceToken = deviceToken;
            EphemeralStore.currentServerUrl = url;

            // TODO: Do we need this in AsyncStorage?
            AsyncStorage.setItem(ASYNC_STORAGE_CURRENT_SERVER_KEY, url);

            const options: KeyChain.Options = {
                accessGroup,
                securityLevel: KeyChain.SECURITY_LEVEL.SECURE_SOFTWARE,
            };
            KeyChain.setInternetCredentials(url, username, token, options);
        } catch (e) {
            console.warn('could not set credentials', e); //eslint-disable-line no-console
        }
    }
};

export const getServerCredentials = async (serverUrl: string) => {
    return getInternetCredentials(serverUrl);
}

export const getActiveServerCredentials = async () => {
    const serverUrl = await getCurrentServerUrl();
    if (serverUrl) {
        return getServerCredentials(serverUrl);
    }

    return null;
}

export const removeServerCredentials = async (serverUrl: string) => {
    // TODO: invalidate client and remove tokens

    KeyChain.resetInternetCredentials(serverUrl);

    // Is EphemeralStore and AsyncStorage needed?
    EphemeralStore.currentServerUrl = null;
    AsyncStorage.removeItem(ASYNC_STORAGE_CURRENT_SERVER_KEY);
}

export const removeActiveServerCredentials = async () => {
    const serverUrl = await getCurrentServerUrl();
    if (serverUrl) {
        removeServerCredentials(serverUrl);
    }
}

// TODO: replace all calls to this either getServerCredentials or getActiveServerCredentials
// then remove this function.
export const getAppCredentials = async () => {
    const serverUrl = await getCurrentServerUrl();

    return getInternetCredentials(serverUrl || '');
};

export const removeAppCredentials = async () => {
    const url = await getCurrentServerUrl();

    // TODO: invalidate client and remove tokens

    if (url) {
        KeyChain.resetInternetCredentials(url);
    }

    EphemeralStore.currentServerUrl = null;
    AsyncStorage.removeItem(ASYNC_STORAGE_CURRENT_SERVER_KEY);
};

export async function getInternetCredentials(serverUrl: string) {
    try {
        const credentials = await KeyChain.getInternetCredentials(serverUrl);

        if (credentials) {
            const usernameParsed = credentials.username.split(',');
            const token = credentials.password;
            const [deviceToken, currentUserId] = usernameParsed;

            if (token && token !== 'undefined') {
                // TODO: Do we need deviceToken in EphemeralStore
                EphemeralStore.deviceToken = deviceToken;
                const analyticsClient = analytics.get(serverUrl);
                analyticsClient?.setUserId(currentUserId);

                const csrf = await getCSRFFromCookie(serverUrl);
                // eslint-disable-next-line no-console
                console.log('CSRF', csrf);

                // TODO: Create client and set token / CSRF

                return credentials;
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}
