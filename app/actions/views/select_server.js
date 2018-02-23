// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {batchActions} from 'redux-batched-actions';
import {GeneralTypes} from 'mattermost-redux/action_types';

import {ViewTypes} from 'app/constants';

export function handleServerUrlChanged(serverUrl) {
    return async (dispatch, getState) => {
        dispatch(batchActions([
            {type: GeneralTypes.CLIENT_CONFIG_RESET},
            {type: GeneralTypes.CLIENT_LICENSE_RESET},
            {type: ViewTypes.SERVER_URL_CHANGED, serverUrl},
        ]), getState);
    };
}

export default {
    handleServerUrlChanged,
};
