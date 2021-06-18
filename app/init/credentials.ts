// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import * as KeyChain from 'react-native-keychain';

import DatabaseManager from '@database/manager';
import * as analytics from '@init/analytics';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';
import {getCSRFFromCookie} from '@utils/security';

import type {ServerCredentials} from '@typings/credentials';

const ASYNC_STORAGE_CURRENT_SERVER_KEY = '@currentServerUrl';

// TODO: This function is only necessary to support pre-Gekidou
// versions as the active server URL may be stored in AsyncStorage.
// At some point we can remove this function and rely solely on
// the database manager's `getActiveServerUrl`.
export const getActiveServerUrl = async () => {
    let serverUrl: string | null | undefined;

    const databaseManager = new DatabaseManager();
    serverUrl = await databaseManager.getActiveServerUrl(); // TODO: need funciton to get active server url
    if (!serverUrl) {
        // If upgrading from non-Gekidou, the server URL might be in
        // AsyncStorage. If so, retrieve the server URL, create a DB for it,
        // then delete the AsyncStorage item.
        serverUrl = await AsyncStorage.getItem(ASYNC_STORAGE_CURRENT_SERVER_KEY);
        if (serverUrl) {
            databaseManager.setActiveServerDatabase(serverUrl);
            AsyncStorage.removeItem(ASYNC_STORAGE_CURRENT_SERVER_KEY);
        }
    }

    return serverUrl;
};

export const setServerCredentials = (serverUrl: string, userId: string, token: string) => {
    if (!(serverUrl && userId && token)) {
        return;
    }

    try {
        let accessGroup;
        if (Platform.OS === 'ios') {
            const appGroup = getIOSAppGroupDetails();
            accessGroup = appGroup.appGroupIdentifier;
        }

        const options: KeyChain.Options = {
            accessGroup,
            securityLevel: KeyChain.SECURITY_LEVEL.SECURE_SOFTWARE,
        };
        KeyChain.setInternetCredentials(serverUrl, userId, token, options);
    } catch (e) {
        console.warn('could not set credentials', e); //eslint-disable-line no-console
    }
};

export const getActiveServerCredentials = async () => {
    const serverUrl = await getActiveServerUrl();
    if (serverUrl) {
        return getServerCredentials(serverUrl);
    }

    return null;
};

export const removeServerCredentials = async (serverUrl: string) => {
    // TODO: invalidate client and remove tokens

    KeyChain.resetInternetCredentials(serverUrl);

    AsyncStorage.removeItem(ASYNC_STORAGE_CURRENT_SERVER_KEY);
};

export const removeActiveServerCredentials = async () => {
    const serverUrl = await getActiveServerUrl();
    if (serverUrl) {
        removeServerCredentials(serverUrl);
    }
};

export const getServerCredentials = async (serverUrl: string): Promise<ServerCredentials|null> => {
    try {
        const credentials = await KeyChain.getInternetCredentials(serverUrl);

        if (credentials) {
            // TODO: Pre-Gekidou we were concatenating the deviceToken and the userId in
            // credentials.username so we need to check the length of credentials.username.split(',').
            // This check should be removed at some point.
            const parts = credentials.username.split(',');
            const userId = parts[parts.length - 1];

            const token = credentials.password;

            if (token && token !== 'undefined') {
                const analyticsClient = analytics.get(serverUrl);
                analyticsClient?.setUserId(userId);

                const csrf = await getCSRFFromCookie(serverUrl);
                // eslint-disable-next-line no-console
                console.log('CSRF', csrf);

                // TODO: Create client and set token / CSRF

                return {userId, token};
            }
        }

        return null;
    } catch (e) {
        return null;
    }
};
