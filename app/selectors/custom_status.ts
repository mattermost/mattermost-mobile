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

export function makeGetCustomStatus(): (state: GlobalState, userID?: string) => UserCustomStatus {
    return createSelector(
        (state: GlobalState, userID?: string) => (userID ? getUser(state, userID) : getCurrentUser(state)),
        (user) => {
            const userProps = user?.props || {};
            return userProps.customStatus ? JSON.parse(userProps.customStatus) : undefined;
        },
    );
}

export function isCustomStatusExpired(state: GlobalState, customStatus?: UserCustomStatus) {
    if (!customStatus) {
        return true;
    }

    if (customStatus.duration === CustomStatusDuration.DONT_CLEAR) {
        return false;
    }

    const expiryTime = moment(customStatus.expires_at);
    const timezone = getCurrentUserTimezone(state);
    const currentTime = getCurrentMomentForTimezone(timezone);
    return currentTime.isSameOrAfter(expiryTime);
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
