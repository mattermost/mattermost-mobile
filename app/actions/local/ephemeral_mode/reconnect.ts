// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {upgradeEntry} from '@actions/remote/entry';
import {Launch} from '@constants';
import DatabaseManager from '@database/manager';
import {removePreauthSecret, removeServerCredentials} from '@init/credentials';
import {relaunchApp} from '@init/launch';
import {resetToHome} from '@screens/navigation';
import {isErrorWithStatusCode} from '@utils/errors';

const HTTP_UNAUTHORIZED = 401;

type Result = {error?: unknown; needsReauth?: boolean};

export const reconnectErasedServer = async (serverUrl: string, displayName: string): Promise<Result> => {
    try {
        await DatabaseManager.createServerDatabase({
            config: {dbName: serverUrl, serverUrl, identifier: '', displayName},
        });

        const {error} = await upgradeEntry(serverUrl);

        if (error) {
            if (isErrorWithStatusCode(error) && error.status_code === HTTP_UNAUTHORIZED) {
                await DatabaseManager.updateServerWipedAt(serverUrl, 0);
                await removeServerCredentials(serverUrl);
                await removePreauthSecret(serverUrl);
                relaunchApp({launchType: Launch.AddServer, serverUrl, displayName});
                return {needsReauth: true};
            }
            return {error};
        }

        await DatabaseManager.updateServerWipedAt(serverUrl, 0);
        await resetToHome({launchType: Launch.Normal, serverUrl, coldStart: false});
        return {};
    } catch (error) {
        return {error};
    }
};
