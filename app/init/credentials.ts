// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import * as KeyChain from 'react-native-keychain';

import * as analytics from '@init/analytics';
import EphemeralStore from '@store/ephemeral_store';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';
import {getCSRFFromCookie} from '@utils/security';

const ASYNC_STORAGE_CURRENT_SERVER_KEY = '@currentServerUrl';

export const getCurrentServerUrl = async () => {
    // TODO: Use default database to retrieve the current server url
    // and fallback to AsyncStorage if needed

    const serverUrl = await AsyncStorage.getItem(ASYNC_STORAGE_CURRENT_SERVER_KEY);
    EphemeralStore.currentServerUrl = serverUrl;
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

            EphemeralStore.deviceToken = deviceToken;
            EphemeralStore.currentServerUrl = url;
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

export async function getInternetCredentials(url: string) {
    try {
        const credentials = await KeyChain.getInternetCredentials(url);

        if (credentials) {
            const usernameParsed = credentials.username.split(',');
            const token = credentials.password;
            const [deviceToken, currentUserId] = usernameParsed;

            if (token && token !== 'undefined') {
                EphemeralStore.deviceToken = deviceToken;
                const analyticsClient = analytics.get(url);
                analyticsClient?.setUserId(currentUserId);

                const csrf = await getCSRFFromCookie(url);
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
