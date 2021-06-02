// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {GlobalState} from '@mm-redux/types/store';
import {CustomStatusDuration, UserCustomStatus} from '@mm-redux/types/users';

import {createSelector} from 'reselect';
import moment from 'moment-timezone';

import {Preferences} from '@mm-redux/constants';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {get} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUser, getUser} from '@mm-redux/selectors/entities/users';
import {getCurrentUserTimezone} from '@mm-redux/selectors/entities/timezone';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';

import {getCurrentMomentForTimezone} from '@utils/timezone';

export function getCustomStatus(state: GlobalState, userID?: string): UserCustomStatus | undefined {
    const user = userID ? getUser(state, userID) : getCurrentUser(state);
    const userProps = user?.props || {};
    const customStatus = userProps.customStatus ? JSON.parse(userProps.customStatus) : undefined;
    const timezone = getCurrentUserTimezone(state);
    const expiryTime = moment(customStatus?.expires_at);
    const currentTime = getCurrentMomentForTimezone(timezone);
    return (customStatus?.duration === CustomStatusDuration.DONT_CLEAR || currentTime < expiryTime) ? customStatus : undefined;
}

export const getRecentCustomStatuses = createSelector(
    (state: GlobalState) => get(state, Preferences.CATEGORY_CUSTOM_STATUS, Preferences.NAME_RECENT_CUSTOM_STATUSES),
    (value) => {
        try {
            return value ? JSON.parse(value) : [];
        } catch (error) {
            return [];
        }
    },
);

export function isCustomStatusEnabled(state: GlobalState) {
    const config = getConfig(state);
    const serverVersion = state.entities.general.serverVersion;
    return config && config.EnableCustomUserStatuses === 'true';
}
