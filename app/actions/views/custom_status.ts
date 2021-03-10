// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {UserCustomStatus} from '@mm-redux/types/users';
import {ActionFunc} from '@mm-redux/types/actions';
import {bindClientFunc} from '@mm-redux/actions/helpers';
import {Client4} from '@mm-redux/client';

export function setCustomStatus(customStatus: UserCustomStatus): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.updateCustomStatus,
        params: [
            customStatus,
        ],
    });
}

export function unsetCustomStatus(): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.unsetCustomStatus,
    });
}

export function removeRecentCustomStatus(customStatus: UserCustomStatus): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.removeRecentCustomStatus,
        params: [
            customStatus,
        ],
    });
}

export default {
    setCustomStatus,
    unsetCustomStatus,
    removeRecentCustomStatus,
};
