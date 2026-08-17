// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import * as KeyChain from 'react-native-keychain';

import DatabaseManager from '@database/manager';
import {launchMark} from '@init/launch_profiler';
import {logWarning} from '@utils/log';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';

// After initialize(), this is the logged-in DB-active set — not a live Keystore listing.
let cachedServerCredentials: ServerCredential[] | undefined;

export const hasCachedCredentials = (): boolean | null => {
    if (cachedServerCredentials === undefined) {
        return null;
    }
    return cachedServerCredentials.length > 0;
};

export const clearCachedServerCredentials = () => {
    cachedServerCredentials = undefined;
};

const replaceCachedCredential = (serverUrl: string, credential: ServerCredential | null) => {
    if (cachedServerCredentials === undefined) {
        return;
    }

    const rest = cachedServerCredentials.filter((c) => c.serverUrl !== serverUrl);
    cachedServerCredentials = credential ? [...rest, credential] : rest;
};

const getAllKeychainServerUrls = async (): Promise<string[]> => {
    if (Platform.OS === 'ios') {
        return KeyChain.getAllInternetPasswordServers();
    }
    return KeyChain.getAllGenericPasswordServices();
};

export const getAllServerCredentials = async (knownServerUrls?: string[]): Promise<ServerCredential[]> => {
    if (cachedServerCredentials !== undefined) {
        return cachedServerCredentials.map((c) => ({...c}));
    }

    let serverUrls: string[];

    // Empty knownServerUrls intentionally lists (wiped/fresh DB).
    if (knownServerUrls?.length) {
        serverUrls = knownServerUrls;
        launchMark('credentials_list', 'skipped');
    } else {
        const listStarted = Date.now();
        serverUrls = await getAllKeychainServerUrls();
        launchMark('credentials_list', `${serverUrls.length} urls ${Date.now() - listStarted}ms`);
    }

    const serverCredentials = (await Promise.all(
        serverUrls.map((serverUrl) => getServerCredentials(serverUrl)),
    )).filter((credential): credential is ServerCredential => Boolean(credential));

    cachedServerCredentials = serverCredentials;
    return serverCredentials.map((c) => ({...c}));
};

export const getActiveServerUrl = async () => {
    let serverUrl = await DatabaseManager.getActiveServerUrl();
    if (!serverUrl) {
        const serverUrls = await getAllKeychainServerUrls();
        serverUrl = serverUrls[0];
    }
    return serverUrl || undefined;
};

export const setServerCredentials = (serverUrl: string, token: string, preauthSecret?: string) => {
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

        // Store main token credentials (clean format)
        KeyChain.setInternetCredentials(serverUrl, token, token, options);

        replaceCachedCredential(serverUrl, {serverUrl, userId: token, token, preauthSecret});

        // Store preauth secret separately if provided
        if (preauthSecret) {
            KeyChain.setGenericPassword('preshared_secret', preauthSecret, {
                server: serverUrl,
                ...options,
            });
        } else {
            KeyChain.resetGenericPassword({
                server: serverUrl,
                ...options,
            });
        }
    } catch (e) {
        logWarning('could not set credentials', e);
    }
};

export const removeServerCredentials = async (serverUrl: string) => {
    await KeyChain.resetInternetCredentials({server: serverUrl});
    replaceCachedCredential(serverUrl, null);
};

export const removePreauthSecret = async (serverUrl: string) => {
    try {
        const existing = cachedServerCredentials?.find((c) => c.serverUrl === serverUrl);
        if (existing) {
            existing.preauthSecret = undefined;
        }
        await KeyChain.resetGenericPassword({server: serverUrl});
    } catch (e) {
        // Preauth secret might not exist, ignore errors
    }
};

export const getPreauthSecret = async (serverUrl: string): Promise<string | undefined> => {
    try {
        const preauthCredentials = await KeyChain.getGenericPassword({
            server: serverUrl,
        });
        const secret = preauthCredentials ? preauthCredentials.password : undefined;
        return secret;
    } catch (e) {
        return undefined;
    }
};

export const removeActiveServerCredentials = async () => {
    const serverUrl = await getActiveServerUrl();
    if (serverUrl) {
        await removeServerCredentials(serverUrl);
    }
};

export const getServerCredentials = async (serverUrl: string): Promise<ServerCredential|null> => {
    const cached = cachedServerCredentials?.find((c) => c.serverUrl === serverUrl);
    if (cached) {
        return {...cached};
    }

    try {
        // Get main credentials
        const credentials = await KeyChain.getInternetCredentials(serverUrl);

        if (!credentials) {
            return null;
        }

        // TODO: Pre-Gekidou we were concatenating the deviceToken and the userId in
        // credentials.username so we need to check the length of credentials.username.split(',').
        // This check should be removed at some point. https://mattermost.atlassian.net/browse/MM-43483
        const parts = credentials.username.split(',');
        const userId = parts[parts.length - 1];
        const token = credentials.password;

        if (!token || token === 'undefined') {
            return null;
        }

        // Get preauth secret separately
        let preauthSecret: string | undefined;
        try {
            const preauthCredentials = await KeyChain.getGenericPassword({
                server: serverUrl,
            });
            preauthSecret = preauthCredentials ? preauthCredentials.password : undefined;
        } catch (e) {
            // Preauth secret is optional, so ignore errors
            preauthSecret = undefined;
        }

        return {
            serverUrl,
            userId,
            token,
            preauthSecret,
        };
    } catch (e) {
        return null;
    }
};
