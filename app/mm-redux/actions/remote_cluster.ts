// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Client4} from '@mm-redux/client';
import {RemoteClusterTypes} from '@mm-redux/action_types';

import {bindClientFunc} from './helpers';
export function getRemoteClusterInfo(remote_id: string) {
    return bindClientFunc({
        clientFunc: Client4.getRemoteClusterInfo,
        onRequest: RemoteClusterTypes.REMOTE_CLUSTER_INFO_REQUEST,
        onSuccess: [RemoteClusterTypes.REMOTE_CLUSTER_INFO_SUCCESS, RemoteClusterTypes.REMOTE_CLUSTER_INFO_RECEIVED],
        onFailure: RemoteClusterTypes.REMOTE_CLUSTER_INFO_FAILURE,
        params: [
            remote_id,
        ],
    });
}
