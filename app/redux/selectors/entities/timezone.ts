// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GlobalState} from '@mm-redux/types/store';

export function getUserTimezone(state: GlobalState, id: string) {
    const profile = state.entities.users.profiles[id];

    if (profile && profile.timezone) {
        return {
            ...profile.timezone,
            useAutomaticTimezone: profile.timezone.useAutomaticTimezone === 'true',
        };
    }

    return {
        useAutomaticTimezone: true,
        automaticTimezone: '',
        manualTimezone: '',
    };
}

export function isTimezoneEnabled(state: GlobalState) {
    const {config} = state.entities.general;
    return config.ExperimentalTimezone === 'true';
}
