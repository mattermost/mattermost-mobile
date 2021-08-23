// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {AppBinding} from '@mm-redux/types/apps';
import {GlobalState} from '@mm-redux/types/store';
import {appsEnabled} from '@utils/apps';

export function getAppsBindings(state: GlobalState, location?: string): AppBinding[] {
    if (!state.entities.apps.bindings) {
        return [];
    }

    if (location) {
        const bindings = state.entities.apps.bindings.filter((b) => b.location === location);
        return bindings.reduce((accum: AppBinding[], current: AppBinding) => accum.concat(current.bindings || []), []);
    }
    return state.entities.apps.bindings;
}

export function getThreadAppsBindingsChannelID(state: GlobalState): string {
    return state.entities.apps.threadBindingsChannelID;
}

export function getThreadAppsBindings(state: GlobalState, location?: string): AppBinding[] {
    if (!state.entities.apps.threadBindings) {
        return [];
    }

    if (location) {
        const bindings = state.entities.apps.threadBindings.filter((b) => b.location === location);
        return bindings.reduce((accum: AppBinding[], current: AppBinding) => accum.concat(current.bindings || []), []);
    }
    return state.entities.apps.threadBindings;
}

export const makeAppBindingsSelector = (location: string) => {
    return createSelector(
        (state: GlobalState) => state.entities.apps.bindings,
        (state: GlobalState) => appsEnabled(state),
        (bindings: AppBinding[], areAppsEnabled: boolean) => {
            if (!areAppsEnabled || !bindings) {
                return [];
            }

            const headerBindings = bindings.filter((b) => b.location === location);
            return headerBindings.reduce((accum: AppBinding[], current: AppBinding) => accum.concat(current.bindings || []), []);
        },
    );
};

export const makeRHSAppBindingSelector = (location: string) => {
    return createSelector(
        (state: GlobalState) => state.entities.apps.threadBindings,
        (state: GlobalState) => appsEnabled(state),
        (bindings: AppBinding[], areAppsEnabled: boolean) => {
            if (!areAppsEnabled || !bindings) {
                return [];
            }

            const headerBindings = bindings.filter((b) => b.location === location);
            return headerBindings.reduce((accum: AppBinding[], current: AppBinding) => accum.concat(current.bindings || []), []);
        },
    );
};

export const getAppCommandForm = (state: GlobalState, location: string) => {
    return state.entities.apps.bindingsForms[location];
};

export const getAppRHSCommandForm = (state: GlobalState, location: string) => {
    return state.entities.apps.threadBindingsForms[location];
};
