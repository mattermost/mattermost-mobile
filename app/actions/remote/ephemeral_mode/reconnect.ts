// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetInfo from '@react-native-community/netinfo';
import {router} from 'expo-router';
import {DeviceEventEmitter} from 'react-native';

import {loginEntry} from '@actions/remote/entry';
import {Events, Launch} from '@constants';
import {HTTP_UNAUTHORIZED} from '@constants/network';
import DatabaseManager from '@database/manager';
import {getServerCredentials} from '@init/credentials';
import {determineRouteFromLaunchProps} from '@init/launch';
import NetworkManager from '@managers/network_manager';
import {setCurrentUserId} from '@queries/servers/system';
import {isErrorWithStatusCode} from '@utils/errors';

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

        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);

        // Restore the current user before opening the WS so doReconnect can resolve them.
        let user;
        try {
            user = await client.getMe();
        } catch (error) {
            return handleReconnectError(serverUrl, error);
        }
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});
        await setCurrentUserId(operator, user.id);

        const {error: loginError} = await loginEntry({serverUrl});
        if (loginError) {
            return handleReconnectError(serverUrl, loginError);
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

const handleReconnectError = async (serverUrl: string, error: unknown): Promise<Result> => {
    if (isErrorWithStatusCode(error) && error.status_code === HTTP_UNAUTHORIZED) {
        DeviceEventEmitter.emit(Events.SERVER_LOGOUT, {serverUrl, removeServer: false});
        return {};
    }
    await DatabaseManager.wipeServerData(serverUrl);
    return {error};
};
