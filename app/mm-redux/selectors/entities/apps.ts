// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createSelector} from 'reselect';

import {AppBinding} from '@mm-redux/types/apps';
import {Config} from '@mm-redux/types/config';
import {GlobalState} from '@mm-redux/types/store';

import {getConfig} from './general';

export const appsEnabled = createSelector(
    (state: GlobalState) => getConfig(state),
    (state: GlobalState) => state.entities.apps.pluginEnabled as boolean,
    (config: Partial<Config>, pluginEnabled: boolean) => {
        const featureFlagEnabled = config?.['FeatureFlagAppsEnabled' as keyof Partial<Config>] === 'true';

        return featureFlagEnabled && pluginEnabled;
    },
);

export function getThreadAppsBindingsChannelId(state: GlobalState): string {
    return state.entities.apps.threadBindingsChannelId;
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
