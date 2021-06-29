// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Client4} from '@client/rest';
import {RemoteClusterTypes} from '@mm-redux/action_types';

import {bindClientFunc} from './helpers';
export function getRemoteClusterInfo(remote_id: string) {
    return bindClientFunc({
        clientFunc: Client4.getRemoteClusterInfo,
        onSuccess: [RemoteClusterTypes.REMOTE_CLUSTER_INFO_RECEIVED],
        params: [
            remote_id,
        ],
    });
}
