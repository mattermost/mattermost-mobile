// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {combineReducers} from 'redux';
import {RemoteClusterTypes} from '@mm-redux/action_types';

import {GenericAction} from '@mm-redux/types/actions';
import {RemoteClusterRequestsStatuses, RequestStatusType} from '@mm-redux/types/requests';

import {handleRequest, initialRequestState} from './helpers';

function getRemoteClusterInfo(state: RequestStatusType = initialRequestState(), action: GenericAction): RequestStatusType {
    return handleRequest(
        RemoteClusterTypes.REMOTE_CLUSTER_INFO_REQUEST,
        RemoteClusterTypes.REMOTE_CLUSTER_INFO_SUCCESS,
        RemoteClusterTypes.REMOTE_CLUSTER_INFO_FAILURE,
        state,
        action,
    );
}

export default (combineReducers({
    getRemoteClusterInfo,
}) as (b: RemoteClusterRequestsStatuses, a: GenericAction) => RemoteClusterRequestsStatuses);
