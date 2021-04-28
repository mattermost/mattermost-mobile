// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {GlobalState} from '@mm-redux/types/store';
import {CustomStatusDuration, UserCustomStatus} from '@mm-redux/types/users';

import {createSelector} from 'reselect';
import {getCurrentUser, getUser} from '@mm-redux/selectors/entities/users';
import {get} from '@mm-redux/selectors/entities/preferences';
import {Preferences} from '@mm-redux/constants';
import {getConfig} from '@mm-redux/selectors/entities/general';

export function makeGetCustomStatus(): (state: GlobalState, userID?: string) => UserCustomStatus {
    return createSelector(
        (state: GlobalState, userID?: string) => (userID ? getUser(state, userID) : getCurrentUser(state)),
        (user) => {
            const userProps = user?.props || {};
            const customStatus = userProps.customStatus ? JSON.parse(userProps.customStatus) : {};
            const expiryTime = new Date(customStatus?.expires_at);
            if (customStatus.duration === CustomStatusDuration.DONT_CLEAR || new Date() < expiryTime) {
                return customStatus;
            }
            return {};
        },
    );
}

export const getRecentCustomStatuses = createSelector(
    (state: GlobalState) => get(state, Preferences.CATEGORY_CUSTOM_STATUS, Preferences.NAME_RECENT_CUSTOM_STATUSES),
    (value) => {
        return value ? JSON.parse(value) : [];
    },
);

export function isCustomStatusEnabled(state: GlobalState) {
    const config = getConfig(state);
    return config && config.EnableCustomUserStatuses === 'true';
}

function showCustomStatusPulsatingDotAndPostHeader(state: GlobalState) {
    const customStatusTutorialState = get(state, Preferences.CATEGORY_CUSTOM_STATUS, Preferences.NAME_CUSTOM_STATUS_TUTORIAL_STATE);
    const modalAlreadyViewed = customStatusTutorialState && JSON.parse(customStatusTutorialState)[Preferences.CUSTOM_STATUS_MODAL_VIEWED];
    return !modalAlreadyViewed;
}

export function showStatusDropdownPulsatingDot(state: GlobalState) {
    return showCustomStatusPulsatingDotAndPostHeader(state);
}

export function showPostHeaderUpdateStatusButton(state: GlobalState) {
    return showCustomStatusPulsatingDotAndPostHeader(state);
}
