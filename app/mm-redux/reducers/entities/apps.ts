// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';

import {AppsTypes} from '@mm-redux/action_types';
import {GenericAction} from '@mm-redux/types/actions';
import {AppBinding, AppCommandFormMap, AppsState} from '@mm-redux/types/apps';
import {validateBindings} from '@utils/apps';

export function bindings(state: AppBinding[] = [], action: GenericAction): AppBinding[] {
    switch (action.type) {
    case AppsTypes.RECEIVED_APP_BINDINGS: {
        const newBindings = validateBindings(action.data);
        if (!newBindings.length && !state.length) {
            return state;
        }
        return newBindings;
    }
    case AppsTypes.FAILED_TO_FETCH_APP_BINDINGS:
    case AppsTypes.APPS_PLUGIN_DISABLED:
        if (state.length > 0) {
            return [];
        }
        return state;
    default:
        return state;
    }
}

export function bindingsForms(state: AppCommandFormMap = {}, action: GenericAction): AppCommandFormMap {
    switch (action.type) {
    case AppsTypes.RECEIVED_APP_BINDINGS:
        if (Object.keys(state).length) {
            return {};
        }
        return state;
    case AppsTypes.RECEIVED_APP_COMMAND_FORM: {
        const {form, location} = action.data;
        const newState = {
            ...state,
            [location]: form,
        };
        return newState;
    }
    case AppsTypes.FAILED_TO_FETCH_APP_BINDINGS:
        if (Object.keys(state).length) {
            return {};
        }
        return state;
    default:
        return state;
    }
}

export function threadBindings(state: AppBinding[] = [], action: GenericAction): AppBinding[] {
    switch (action.type) {
    case AppsTypes.RECEIVED_THREAD_APP_BINDINGS: {
        return validateBindings(action.data.bindings) || [];
    }
    case AppsTypes.CLEAR_THREAD_APP_BINDINGS:
        if (state.length > 0) {
            return [];
        }
        return state;
    default:
        return state;
    }
}

export function threadBindingsChannelId(state = '', action: GenericAction): string {
    switch (action.type) {
    case AppsTypes.RECEIVED_THREAD_APP_BINDINGS: {
        return action.data.channelID || '';
    }
    case AppsTypes.CLEAR_THREAD_APP_BINDINGS:
        if (state.length > 0) {
            return '';
        }
        return state;
    default:
        return state;
    }
}

export function threadBindingsForms(state: AppCommandFormMap = {}, action: GenericAction): AppCommandFormMap {
    switch (action.type) {
    case AppsTypes.RECEIVED_THREAD_APP_BINDINGS:
        if (Object.keys(state).length) {
            return {};
        }
        return state;
    case AppsTypes.RECEIVED_APP_RHS_COMMAND_FORM: {
        const {form, location} = action.data;
        const newState = {
            ...state,
            [location]: form,
        };
        return newState;
    }
    case AppsTypes.CLEAR_THREAD_APP_BINDINGS:
        if (Object.keys(state).length) {
            return {};
        }
        return state;
    default:
        return state;
    }
}

export function pluginEnabled(state = true, action: GenericAction): boolean {
    switch (action.type) {
    case AppsTypes.APPS_PLUGIN_ENABLED:
        return true;
    case AppsTypes.APPS_PLUGIN_DISABLED:
        return false;
    case AppsTypes.RECEIVED_APP_BINDINGS:
        return true;
    case AppsTypes.FAILED_TO_FETCH_APP_BINDINGS:
        return false;
    default:
        return state;
    }
}

export default (combineReducers({
    bindings,
    bindingsForms,
    threadBindings,
    threadBindingsForms,
    threadBindingsChannelId,
    pluginEnabled,
}) as (b: AppsState, a: GenericAction) => AppsState);
