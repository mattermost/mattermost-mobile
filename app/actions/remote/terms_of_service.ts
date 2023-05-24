// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getCurrentUser} from '@queries/servers/user';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

export async function fetchTermsOfService(serverUrl: string): Promise<{terms?: TermsOfService; error?: any}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const terms = await client.getTermsOfService();
        return {terms};
    } catch (error) {
        logDebug('error on fetchTermsOfService', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function updateTermsOfServiceStatus(serverUrl: string, id: string, status: boolean): Promise<{resp?: {status: string}; error?: any}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const resp = await client.updateMyTermsOfServiceStatus(id, status);

        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentUser = await getCurrentUser(database);
        if (currentUser) {
            currentUser.prepareUpdate((u) => {
                if (status) {
                    u.termsOfServiceCreateAt = Date.now();
                    u.termsOfServiceId = id;
                } else {
                    u.termsOfServiceCreateAt = 0;
                    u.termsOfServiceId = '';
                }
            });
            operator.batchRecords([currentUser], 'updateTermsOfServiceStatus');
        }
        return {resp};
    } catch (error) {
        logDebug('error on updateTermsOfServiceStatus', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}
