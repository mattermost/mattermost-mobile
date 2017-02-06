// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {ViewTypes} from 'app/constants';
import {goToLogin, goToLoginOptions} from 'app/actions/navigation';

export function handleServerUrlChanged(serverUrl) {
    return async (dispatch, getState) => {
        dispatch({
            type: ViewTypes.SERVER_URL_CHANGED,
            serverUrl
        }, getState);
    };
}

export function handleLoginOptions() {
    return async (dispatch, getState) => {
        const {config, license} = getState().entities.general;

        let options = 0;
        if (config.EnableSaml === 'true' && license.IsLicensed === 'true' && license.SAML === 'true') {
            options++;
        }

        if (options) {
            await goToLoginOptions()(dispatch, getState);
        } else {
            await goToLogin()(dispatch, getState);
        }
    };
}

export default {
    handleServerUrlChanged,
    handleLoginOptions
};
