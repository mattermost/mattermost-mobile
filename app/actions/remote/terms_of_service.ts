// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';

import {forceLogoutIfNecessary} from './session';

import type ClientError from '@client/rest/error';

export async function fetchTermsOfService(serverUrl: string): Promise<{terms?: TermsOfService; error?: any}> {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const terms = await client.getTermsOfService();
        return {terms};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
}

export async function updateTermsOfServiceStatus(serverUrl: string, id: string, status: boolean): Promise<{resp?: {status: string}; error?: any}> {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        const resp = await client.updateMyTermsOfServiceStatus(id, status);
        return {resp};
    } catch (error) {
        forceLogoutIfNecessary(serverUrl, error as ClientError);
        return {error};
    }
}
