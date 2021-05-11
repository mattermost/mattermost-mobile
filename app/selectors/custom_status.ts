// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {GlobalState} from '@mm-redux/types/store';
import {CustomStatusDuration, UserCustomStatus} from '@mm-redux/types/users';

import {createSelector} from 'reselect';

import {Preferences} from '@mm-redux/constants';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {getCurrentUserId} from '@mm-redux/selectors/entities/common';
import {getUserTimezone} from '@mm-redux/selectors/entities/timezone';
import {getCurrentDateAndTimeForTimezone} from '@utils/timezone';

import {get} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUser, getUser} from '@mm-redux/selectors/entities/users';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import moment from 'moment';

export function getCustomStatus(state: GlobalState, userID?: string): UserCustomStatus | undefined {
    const user = userID ? getUser(state, userID) : getCurrentUser(state);
    const userProps = user?.props || {};
    const customStatus = userProps.customStatus ? JSON.parse(userProps.customStatus) : undefined;
    const timezone = getCurrentUserTimezone(state);
    const expiryTime = timezone ? moment(customStatus?.expires_at).tz(timezone) : moment(customStatus?.expires_at);
    const currentTime = timezone ? getCurrentDateAndTimeForTimezone(timezone) : moment();
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
    return config && config.EnableCustomUserStatuses === 'true' && isMinimumServerVersion(serverVersion, 5, 36);
}

export const getCurrentUserTimezone = createSelector(
    getCurrentUserId,
    (state) => (userId: string) => getUserTimezone(state, userId),
    (userId, getTimezone) => {
        const userTimezone = getTimezone(userId);
        const timezone = userTimezone.useAutomaticTimezone ? userTimezone.automaticTimezone : userTimezone.manualTimezone;
        return timezone;
    },
);
