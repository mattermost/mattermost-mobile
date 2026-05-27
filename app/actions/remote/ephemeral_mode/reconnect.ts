// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo from '@react-native-community/netinfo';
import {router} from 'expo-router';

import {loginEntry} from '@actions/remote/entry';
import {fetchMe} from '@actions/remote/user';
import {Launch} from '@constants';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import {determineRouteFromLaunchProps} from '@init/launch';
import {setCurrentUserId} from '@queries/servers/system';

type Result = {error?: unknown};

export const reconnectErasedServer = async (serverUrl: string): Promise<Result> => {
    try {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
            return {error: 'no_connection'};
        }

        const credentials = await getServerCredentials(serverUrl);
        if (!credentials) {
            return {error: 'no_credentials'};
        }

        // Restore the current user before opening the WS so doReconnect can resolve them.
        const {user, error: fetchError} = await fetchMe(serverUrl);
        if (!user) {
            return {error: fetchError};
        }
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await setCurrentUserId(operator, user.id);

        const {error: loginError} = await loginEntry({serverUrl});
        if (loginError) {
            // when there is a login error ensure to wipe all data to reinforce security
            await DatabaseManager.wipeServerData(serverUrl);
            return {error: loginError};
        }

        // Update last_active_at so withServerDatabase picks up the new db instance after wipe.
        await DatabaseManager.setActiveServerDatabase(serverUrl);
        await DatabaseManager.updatePersistenceFlag(serverUrl, '');

        const launchRoute = await determineRouteFromLaunchProps({launchType: Launch.Normal, serverUrl, coldStart: true});
        router.replace({pathname: launchRoute.route, params: launchRoute.params});
        return {};
    } catch (error) {
        return {error};
    }
};
