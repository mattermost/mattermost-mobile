// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Directory, File, Paths} from 'expo-file-system';
import {sha256} from 'js-sha256';

import {logError} from '@utils/log';

// A custom CA is stored per server so every network client for that server (the REST
// API client and the WebSocket clients) can trust it, including after an app restart.
const SERVER_CA_DIRECTORY = 'server_ca';

const getServerCaDirectory = () => new Directory(Paths.document, SERVER_CA_DIRECTORY);

// Name the file after a hash of the server URL: it is always a safe, fixed-length file name,
// and unlike replacing special characters, two different URLs cannot map to the same file.
const getServerCaFile = (serverUrl: string) => new File(getServerCaDirectory(), `${sha256(serverUrl)}.pem`);

/**
 * Stores (or clears, when serverCa is empty or undefined) the CA for a server.
 * Returns true if the stored CA was written or removed.
 */
export const saveServerCa = (serverUrl: string, serverCa?: string): boolean => {
    const file = getServerCaFile(serverUrl);
    if (serverCa) {
        getServerCaDirectory().create({intermediates: true, idempotent: true});
        file.create({intermediates: true, overwrite: true});
        file.write(serverCa);
        return true;
    }

    if (file.exists) {
        file.delete();
        return true;
    }

    return false;
};

/**
 * Returns the CA stored for a server, or undefined if there is none or it cannot be read.
 */
export const readServerCa = async (serverUrl: string): Promise<string | undefined> => {
    try {
        const file = getServerCaFile(serverUrl);
        if (file.exists) {
            return (await file.text()) || undefined;
        }
    } catch (error) {
        logError('Failed to read server CA', error);
    }
    return undefined;
};
