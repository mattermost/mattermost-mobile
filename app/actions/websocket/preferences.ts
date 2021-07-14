// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getAddedDmUsersIfNecessary} from '@actions/helpers/channels';

import {purgeOfflineStore} from '@actions/views/root';
import {getPost} from '@actions/views/post';
import {PreferenceTypes} from '@mm-redux/action_types';
import {General, Preferences} from '@mm-redux/constants';
import {getCollapsedThreadsPreference} from '@mm-redux/selectors/entities/preferences';
import {getAllPosts} from '@mm-redux/selectors/entities/posts';
import {ActionResult, DispatchFunc, GenericAction, GetStateFunc, batchActions} from '@mm-redux/types/actions';
import {PreferenceType} from '@mm-redux/types/preferences';
import {WebSocketMessage} from '@mm-redux/types/websocket';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {getConfig} from '@mm-redux/selectors/entities/general';

export function handlePreferenceChangedEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc): Promise<ActionResult> => {
        const preference = JSON.parse(msg.data.preference);
        const actions: Array<GenericAction> = [{
            type: PreferenceTypes.RECEIVED_PREFERENCES,
            data: [preference],
        }];
        const state = getState();
        const dmActions = await getAddedDmUsersIfNecessary(state, [preference]);
        if (dmActions.length) {
            actions.push(...dmActions);
        }
        dispatch(handleCRTPreferenceChange([preference]));
        dispatch(batchActions(actions, 'BATCH_WS_PREFERENCE_CHANGED'));
        return {data: true};
    };
}

export function handlePreferencesChangedEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc): Promise<ActionResult> => {
        const preferences: PreferenceType[] = JSON.parse(msg.data.preferences);
        const posts = getAllPosts(getState());
        const actions: Array<GenericAction> = [{
            type: PreferenceTypes.RECEIVED_PREFERENCES,
            data: preferences,
        }];

        preferences.forEach((pref) => {
            if (pref.category === Preferences.CATEGORY_FLAGGED_POST && !posts[pref.name]) {
                dispatch(getPost(pref.name));
            }
        });

        const state = getState();
        const dmActions = await getAddedDmUsersIfNecessary(state, preferences);
        if (dmActions.length) {
            actions.push(...dmActions);
        }
        dispatch(handleCRTPreferenceChange(preferences));
        dispatch(batchActions(actions, 'BATCH_WS_PREFERENCES_CHANGED'));
        return {data: true};
    };
}

export function handlePreferencesDeletedEvent(msg: WebSocketMessage): GenericAction {
    const preferences = JSON.parse(msg.data.preferences);

    return {type: PreferenceTypes.DELETED_PREFERENCES, data: preferences};
}

export function handleCRTPreferenceChange(preferences: PreferenceType[]) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc): Promise<ActionResult> => {
        const state = getState();
        const newCRTPreference = preferences.find((preference) => preference.name === Preferences.COLLAPSED_REPLY_THREADS);
        if (newCRTPreference && getConfig(state).CollapsedThreads !== undefined) {
            const newCRTValue = newCRTPreference.value;
            const oldCRTValue = getCollapsedThreadsPreference(state);
            if (newCRTValue !== oldCRTValue) {
                EventEmitter.emit(General.CRT_PREFERENCE_CHANGED, newCRTValue);
                dispatch(purgeOfflineStore());
                return {data: true};
            }
        }
        return {data: false};
    };
}
