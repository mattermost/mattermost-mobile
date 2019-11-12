// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AsyncStorage from '@react-native-community/async-storage';
import * as KeyChain from 'react-native-keychain';

import {Client4} from 'mattermost-redux/client';

import mattermostManaged from 'app/mattermost_managed';
import EphemeralStore from 'app/store/ephemeral_store';
import {setCSRFFromCookie} from 'app/utils/security';

const CURRENT_SERVER = '@currentServerUrl';

export const getCurrentServerUrl = async () => {
    return AsyncStorage.getItem(CURRENT_SERVER);
};

export const setAppCredentials = (deviceToken, currentUserId, token, url) => {
    if (!currentUserId) {
        return;
    }

    // Only save to keychain if the url and token are set
    if (url && token) {
        try {
            const username = `${deviceToken}, ${currentUserId}`;

            EphemeralStore.deviceToken = deviceToken;
            EphemeralStore.currentServerUrl = url;
            AsyncStorage.setItem(CURRENT_SERVER, url);
            KeyChain.setInternetCredentials(url, username, token, {accessGroup: mattermostManaged.appGroupIdentifier});
        } catch (e) {
            console.warn('could not set credentials', e); //eslint-disable-line no-console
        }
    }
};

export const getAppCredentials = async () => {
    const serverUrl = await AsyncStorage.getItem(CURRENT_SERVER);

    if (serverUrl) {
        EphemeralStore.currentServerUrl = serverUrl;
        return getInternetCredentials(serverUrl);
    }

    return getCredentialsFromGenericKeyChain();
};

export const removeAppCredentials = async () => {
    const url = await getCurrentServerUrl();

    Client4.setCSRF(null);
    Client4.serverVersion = '';
    Client4.setUserId('');
    Client4.setToken('');
    Client4.setUrl('');

    if (url) {
        KeyChain.resetInternetCredentials(url);
    }

    KeyChain.resetGenericPassword();
    EphemeralStore.currentServerUrl = null;
    AsyncStorage.removeItem(CURRENT_SERVER);
};

async function getCredentialsFromGenericKeyChain() {
    try {
        const credentials = await KeyChain.getGenericPassword();

        if (credentials) {
            const usernameParsed = credentials.username.split(',');
            const passwordParsed = credentials.password.split(',');

            // username == deviceToken, currentUserId
            // password == token, url
            if (usernameParsed.length === 2 && passwordParsed.length === 2) {
                const [deviceToken, currentUserId] = usernameParsed;
                const [token, url] = passwordParsed;

                // if for any case the url and the token aren't valid proceed with re-hydration
                if (url && url !== 'undefined' && token && token !== 'undefined') {
                    Client4.setUserId(currentUserId);
                    Client4.setUrl(url);
                    Client4.setToken(token);
                    await setCSRFFromCookie(url);

                    // Migration: remove the generic credentials and add a server specific one
                    setAppCredentials(deviceToken, currentUserId, token, url);
                    KeyChain.resetGenericPassword();

                    return {
                        username: usernameParsed,
                        password: token,
                    };
                }
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}

async function getInternetCredentials(url) {
    try {
        const credentials = await KeyChain.getInternetCredentials(url);

        if (credentials) {
            const usernameParsed = credentials.username.split(',');
            const token = credentials.password;
            const [deviceToken, currentUserId] = usernameParsed;

            if (token && token !== 'undefined') {
                EphemeralStore.deviceToken = deviceToken;
                Client4.setUserId(currentUserId);
                Client4.setUrl(url);
                Client4.setToken(token);
                await setCSRFFromCookie(url);

                return credentials;
            }
        }

        return null;
    } catch (e) {
        return null;
    }
}
