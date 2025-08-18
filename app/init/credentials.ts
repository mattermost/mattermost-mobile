// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import * as KeyChain from 'react-native-keychain';

import DatabaseManager from '@database/manager';
import {logWarning} from '@utils/log';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';

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

export const getActiveServerUrl = async () => {
    let serverUrl = await DatabaseManager.getActiveServerUrl();
    if (!serverUrl) {
        let serverUrls: string[];
        if (Platform.OS === 'ios') {
            serverUrls = await KeyChain.getAllInternetPasswordServers();
        } else {
            serverUrls = await KeyChain.getAllGenericPasswordServices();
        }

        serverUrl = serverUrls[0];
    }
    return serverUrl || undefined;
};

export const setServerCredentials = (serverUrl: string, token: string, sharedPassword?: string) => {
    if (!(serverUrl && token)) {
        return;
    }

    try {
        let accessGroup;
        if (Platform.OS === 'ios') {
            const appGroup = getIOSAppGroupDetails();
            accessGroup = appGroup.appGroupIdentifier;
        }

        const options: KeyChain.SetOptions = {
            accessGroup,
            securityLevel: KeyChain.SECURITY_LEVEL.SECURE_SOFTWARE,
        };

        // Always store as JSON object for consistency
        const credentialData = {
            token,
            sharedPassword,
        };

        KeyChain.setInternetCredentials(serverUrl, token, JSON.stringify(credentialData), options);
    } catch (e) {
        logWarning('could not set credentials', e);
    }
};

export const removeServerCredentials = async (serverUrl: string) => {
    return KeyChain.resetInternetCredentials({server: serverUrl});
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
            // Try to parse password as JSON first (new format)
            try {
                const credentialData: ServerCredential = JSON.parse(credentials.password);
                return {
                    serverUrl,
                    userId: credentialData.userId,
                    token: credentialData.token,
                    sharedPassword: credentialData.sharedPassword,
                };
            } catch (parseError) {
                // Fall back to old format
                logWarning('WebSocket: Failed to parse credential data. Falling back to old format', parseError);

                // TODO: Pre-Gekidou we were concatenating the deviceToken and the userId in
                // credentials.username so we need to check the length of credentials.username.split(',').
                // This check should be removed at some point. https://mattermost.atlassian.net/browse/MM-43483
                const parts = credentials.username.split(',');
                const userId = parts[parts.length - 1];
                const token = credentials.password;

                if (token && token !== 'undefined') {
                    return {serverUrl, userId, token};
                }
            }
        }

        return null;
    } catch (e) {
        return null;
    }
};
