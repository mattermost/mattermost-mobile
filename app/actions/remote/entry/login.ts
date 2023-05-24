// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchConfigAndLicense} from '@actions/remote/systems';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import WebsocketManager from '@managers/websocket_manager';

type AfterLoginArgs = {
    serverUrl: string;
}

export async function loginEntry({serverUrl}: AfterLoginArgs): Promise<{error?: unknown}> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const clData = await fetchConfigAndLicense(serverUrl, false);
        if (clData.error) {
            return {error: clData.error};
        }

        const credentials = await getServerCredentials(serverUrl);
        if (credentials?.token) {
            WebsocketManager.createClient(serverUrl, credentials.token);
            await WebsocketManager.initializeClient(serverUrl);
        }

        return {};
    } catch (error) {
        return {error};
    }
}
