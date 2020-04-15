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

export default {
    handleServerUrlChanged,
};
