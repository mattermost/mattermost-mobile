// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {NavigationTypes} from 'app/constants';
import Routes from 'app/navigation/routes';
import {updateStorage} from 'app/actions/storage';

import Client from 'service/client';
import {getClientConfig, getLicenseConfig, setServerVersion} from 'service/actions/general';
import {loadMe} from 'service/actions/users';

export function goToSelectServer() {
    return async (dispatch, getState) => {
        dispatch({
            type: NavigationTypes.NAVIGATION_RESET,
            routes: [Routes.SelectServer],
            index: 0
        }, getState);
    };
}

export function setStoreFromLocalData(data) {
    return async (dispatch, getState) => {
        Client.setToken(data.token);
        Client.setUrl(data.url);

        return loadMe()(dispatch, getState);
    };
}

export function loadConfigAndLicense(serverVersion) {
    return async (dispatch, getState) => {
        getClientConfig()(dispatch, getState);
        getLicenseConfig()(dispatch, getState);
        setServerVersion(serverVersion)(dispatch, getState);
        await updateStorage(null, {serverVersion});
    };
}

export default {
    goToSelectServer,
    loadConfigAndLicense,
    setStoreFromLocalData
};
