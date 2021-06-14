// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';
import {RemoteClusterTypes} from '@mm-redux/action_types';
import {GenericAction} from '@mm-redux/types/actions';
import {Dictionary} from '@mm-redux/types/utilities';
import {RemoteCluster} from '@mm-redux/types/remote_cluster';

function info(state: Dictionary<RemoteCluster> = {}, action: GenericAction) {
    switch (action.type) {
    case RemoteClusterTypes.REMOTE_CLUSTER_INFO_RECEIVED: {
        const nextState = {...state};
        nextState[action.data.remote_id] = action.data;
        return nextState;
    }
    default:
        return state;
    }
}

export default combineReducers({
    info,
});
