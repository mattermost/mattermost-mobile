// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform} from 'react-native';
import * as KeyChain from 'react-native-keychain';

import DatabaseManager from '@database/manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logWarning} from '@utils/log';
import {getIOSAppGroupDetails} from '@utils/mattermost_managed';

// Account value written into the pre-auth secret keychain entry. Must stay in lockstep with
// ios/Gekidou/Sources/Gekidou/Keychain.swift getPreauthSecret(for:).
const PREAUTH_SECRET_ACCOUNT = 'preauth_secret';

// Superseded by PREAUTH_SECRET_ACCOUNT; only read by migrateLegacyPreauthSecret. See MM-70605.
export const LEGACY_PREAUTH_SECRET_ACCOUNT = 'preshared_secret';

// Android keeps internet credentials and generic passwords in ONE alias namespace
// (KeychainModule.setInternetCredentialsForServer delegates to setGenericPassword(server, ...)),
// so a bare server URL here would overwrite the session token. iOS keeps them in separate item
// classes and ios/Gekidou/Sources/Gekidou/Keychain.swift looks the secret up with
// kSecAttrService == <serverUrl>, so iOS must use the bare URL.
const ANDROID_PREAUTH_SERVICE_PREFIX = 'preauth-secret::';

// After initialize(), this is the logged-in DB-active set — not a live Keystore listing.
let cachedServerCredentials: ServerCredential[] | undefined;

const getPreauthSecretService = (serverUrl: string) => (
    Platform.OS === 'ios' ? serverUrl : `${ANDROID_PREAUTH_SERVICE_PREFIX}${serverUrl}`
);

// Constant for the process lifetime, and resolving it crosses the native bridge, so it is
// resolved once instead of on every pre-auth read, write and delete.
let cachedKeychainAccessGroup: string | undefined;

const getKeychainAccessGroup = () => {
    if (Platform.OS !== 'ios') {
        return undefined;
    }

    if (!cachedKeychainAccessGroup) {
        cachedKeychainAccessGroup = getIOSAppGroupDetails().appGroupIdentifier;
    }

    return cachedKeychainAccessGroup;
};

// Shared by every pre-auth read, write and delete so the options can never drift apart.
const getPreauthSecretOptions = (serverUrl: string): KeyChain.BaseOptions => ({
    service: getPreauthSecretService(serverUrl),
    accessGroup: getKeychainAccessGroup(),
});

// The legacy write never set `service`, so both platforms fell back to their default
// (iOS: main bundle identifier, Android: empty alias). Omitting `service` reproduces that lookup.
const getLegacyPreauthSecretOptions = (): KeyChain.BaseOptions => ({
    accessGroup: getKeychainAccessGroup(),
});

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

const updateCachedPreauthSecret = (serverUrl: string, preauthSecret: string | undefined) => {
    const existing = cachedServerCredentials?.find((c) => c.serverUrl === serverUrl);
    if (existing) {
        replaceCachedCredential(serverUrl, {...existing, preauthSecret});
    }
};

const getAllKeychainServerUrls = async (): Promise<string[]> => {
    if (Platform.OS === 'ios') {
        return KeyChain.getAllInternetPasswordServers();
    }

    // Android lists every generic-password alias, which includes our per-server pre-auth aliases
    // and, before the migration runs, the legacy shared empty alias.
    const services = await KeyChain.getAllGenericPasswordServices();
    return services.filter((service) => service && !service.startsWith(ANDROID_PREAUTH_SERVICE_PREFIX));
};

export const getAllServerCredentials = async (knownServerUrls?: string[]): Promise<ServerCredential[]> => {
    if (cachedServerCredentials !== undefined) {
        return cachedServerCredentials.map((c) => ({...c}));
    }

    let serverUrls: string[];

    // Empty knownServerUrls intentionally lists (wiped/fresh DB).
    if (knownServerUrls?.length) {
        serverUrls = knownServerUrls;
    } else {
        serverUrls = await getAllKeychainServerUrls();
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

export const setServerCredentials = async (serverUrl: string, token: string) => {
    if (!(serverUrl && token)) {
        logDebug('setServerCredentials: skipped, missing serverUrl or token');
        return;
    }

    try {
        const stored = await KeyChain.setInternetCredentials(serverUrl, token, token, {
            accessGroup: getKeychainAccessGroup(),
            securityLevel: KeyChain.SECURITY_LEVEL.SECURE_SOFTWARE,
        });
        if (stored === false) {
            throw new Error('failed to store credentials');
        }

        // The pre-auth secret lives in its own entry; a token write must never disturb it.
        const existing = cachedServerCredentials?.find((c) => c.serverUrl === serverUrl);
        replaceCachedCredential(serverUrl, {serverUrl, userId: token, token, preauthSecret: existing?.preauthSecret});
    } catch (e) {
        logWarning('setServerCredentials: could not set credentials', getFullErrorMessage(e));
    }
};

/**
 * @returns whether the secret is now stored. Callers that then destroy another copy of it must
 * check this rather than assume the write landed.
 */
export const setPreauthSecret = async (serverUrl: string, preauthSecret: string): Promise<boolean> => {
    if (!(serverUrl && preauthSecret)) {
        logDebug('setPreauthSecret: skipped, missing serverUrl or secret');
        return false;
    }

    try {
        const stored = await KeyChain.setGenericPassword(PREAUTH_SECRET_ACCOUNT, preauthSecret, {
            ...getPreauthSecretOptions(serverUrl),
            securityLevel: KeyChain.SECURITY_LEVEL.SECURE_SOFTWARE,
        });
        if (stored === false) {
            throw new Error('failed to store preauth secret');
        }

        updateCachedPreauthSecret(serverUrl, preauthSecret);
        return true;
    } catch (e) {
        logWarning('setPreauthSecret: could not set preauth secret', getFullErrorMessage(e));
        return false;
    }
};

export const removeServerCredentials = async (serverUrl: string) => {
    await KeyChain.resetInternetCredentials({server: serverUrl});
    replaceCachedCredential(serverUrl, null);
};

export const removePreauthSecret = async (serverUrl: string) => {
    try {
        await KeyChain.resetGenericPassword(getPreauthSecretOptions(serverUrl));
        updateCachedPreauthSecret(serverUrl, undefined);
    } catch (e) {
        logWarning('removePreauthSecret: could not remove preauth secret', getFullErrorMessage(e));
    }
};

export const getPreauthSecret = async (serverUrl: string): Promise<string | undefined> => {
    try {
        const preauthCredentials = await KeyChain.getGenericPassword(getPreauthSecretOptions(serverUrl));
        return preauthCredentials ? preauthCredentials.password : undefined;
    } catch (e) {
        // Logged because callers cannot tell this apart from "no secret stored".
        logWarning('getPreauthSecret: could not read preauth secret', getFullErrorMessage(e));
        return undefined;
    }
};

/**
 * Reads the pre-MM-70605 shared pre-auth secret entry.
 * Returns undefined unless the entry is ours, since on iOS the lookup matches on service only.
 * Throws on keychain errors so callers (migration) can retry instead of treating failure as "missing".
 */
export const getLegacyPreauthSecret = async (): Promise<string | undefined> => {
    try {
        const found = await KeyChain.getGenericPassword(getLegacyPreauthSecretOptions());
        if (!found || found.username !== LEGACY_PREAUTH_SECRET_ACCOUNT) {
            return undefined;
        }
        return found.password;
    } catch (e) {
        logWarning('getLegacyPreauthSecret: could not read the legacy preauth secret', getFullErrorMessage(e));
        throw e;
    }
};

/**
 * Deletes the shared legacy entry. react-native-keychain cannot scope a generic-password delete by
 * account, so this matches on service alone: the app bundle identifier on iOS, the empty alias on
 * Android. The access group keeps it inside our own targets' items.
 */
export const removeLegacyPreauthSecret = async () => {
    await KeyChain.resetGenericPassword(getLegacyPreauthSecretOptions());
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

        const preauthSecret = await getPreauthSecret(serverUrl);

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
