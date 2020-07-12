// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {batchActions} from 'redux-batched-actions';
import {GeneralTypes} from '@mm-redux/action_types';

import {ViewTypes} from 'app/constants';

export function handleServerUrlChanged(serverUrl) {
    return batchActions([
        {type: GeneralTypes.CLIENT_CONFIG_RESET},
        {type: GeneralTypes.CLIENT_LICENSE_RESET},
        {type: ViewTypes.SERVER_URL_CHANGED, serverUrl},
    ], 'BATCH_SERVER_URL_CHANGED');
}

export function setServerUrl(serverUrl) {
    return {type: ViewTypes.SERVER_URL_CHANGED, serverUrl};
}
export function urlConnectedToServerSuccessfully(serverUrl) {
    return {type: ViewTypes.SERVER_URL_SUCCESSFULLY_CONNECTED, serverUrl};
}
export function deleteServerUrl(serverUrl) {
    return {type: ViewTypes.DELETE_SERVER_URL, serverUrl};
}

export default {
    handleServerUrlChanged,
};
