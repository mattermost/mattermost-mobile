// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import AsyncStorage from '@react-native-community/async-storage';
import {Platform} from 'react-native';
import * as KeyChain from 'react-native-keychain';

import DatabaseManager from '@database/manager';
import * as analytics from '@init/analytics';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';

import type {ServerCredential} from '@typings/credentials';

const ASYNC_STORAGE_CURRENT_SERVER_KEY = '@currentServerUrl';

export const getAllServerCredentials = async (): Promise<ServerCredential[]> => {
    const serverCredentials: ServerCredential[] = [];

    let serverUrls: string[];
    if (Platform.OS === 'ios') {
        serverUrls = await KeyChain.getAllInternetPasswordServers();
    } else {
        serverUrls = await KeyChain.getAllGenericPasswordServices();
    }

    for await (const serverUrl of serverUrls) {
        const serverCredential = await getServerCredentials(serverUrl);

        if (serverCredential) {
            serverCredentials.push(serverCredential);
        }
    }

    return serverCredentials;
};

// TODO: This function is only necessary to support pre-Gekidou
// versions as the active server URL may be stored in AsyncStorage.
// At some point we can remove this function and rely solely on
// the database manager's `getActiveServerUrl`.
export const getActiveServerUrl = async () => {
    let serverUrl = await DatabaseManager.getActiveServerUrl();
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

    return serverUrl || undefined;
};

export const setServerCredentials = (serverUrl: string, token: string) => {
    if (!(serverUrl && token)) {
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
        KeyChain.setInternetCredentials(serverUrl, token, token, options);
    } catch (e) {
        console.warn('could not set credentials', e); //eslint-disable-line no-console
    }
};

export const removeServerCredentials = async (serverUrl: string) => {
    await KeyChain.resetInternetCredentials(serverUrl);
    await AsyncStorage.removeItem(ASYNC_STORAGE_CURRENT_SERVER_KEY);
};

export const removeActiveServerCredentials = async () => {
    const serverUrl = await getActiveServerUrl();
    if (serverUrl) {
        await removeServerCredentials(serverUrl);
    }
};

export const getServerCredentials = async (serverUrl: string): Promise<ServerCredential|null> => {
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

                return {serverUrl, userId, token};
            }
        }

        return null;
    } catch (e) {
        return null;
    }
};
