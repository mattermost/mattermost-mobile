// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {GlobalState} from '@mm-redux/types/store';
import {UserCustomStatus} from '@mm-redux/types/users';

import {createSelector} from 'reselect';
import {getCurrentUser, getUser} from '@mm-redux/selectors/entities/users';
import {getConfig} from '@mm-redux/selectors/entities/general';

export function makeGetCustomStatus(): (state: GlobalState, userID?: string) => UserCustomStatus {
    return createSelector(
        (state: GlobalState, userID?: string) => (userID ? getUser(state, userID) : getCurrentUser(state)),
        (user) => {
            const userProps = user.props || {};
            return userProps.customStatus && JSON.parse(userProps.customStatus);
        },
    );
}

export function isCustomStatusEnabled(state: GlobalState) {
    const config = getConfig(state);
    return config && config.EnableCustomUserStatuses === 'true';
}
