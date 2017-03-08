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

        const samlEnabled = config.EnableSaml === 'true' && license.IsLicensed === 'true' && license.SAML === 'true';

        let options = 0;
        if (samlEnabled) {
            options += 1;
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
