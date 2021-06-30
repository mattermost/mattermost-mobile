// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getAddedDmUsersIfNecessary} from '@actions/helpers/channels';
import {dismissAllModals} from '@actions/navigation';
import {purgeOfflineStore} from '@actions/views/root';
import {getPost} from '@actions/views/post';
import {PreferenceTypes} from '@mm-redux/action_types';
import {Preferences} from '@mm-redux/constants';
import {isCollapsedThreadsEnabled} from '@mm-redux/selectors/entities/preferences';
import {getAllPosts} from '@mm-redux/selectors/entities/posts';
import {ActionResult, DispatchFunc, GenericAction, GetStateFunc, batchActions} from '@mm-redux/types/actions';
import {PreferenceType} from '@mm-redux/types/preferences';
import {GlobalState} from '@mm-redux/types/store';
import {WebSocketMessage} from '@mm-redux/types/websocket';

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

        dispatch(batchActions(actions, 'BATCH_WS_PREFERENCE_CHANGED'));
        dispatch(handleCRTPreferenceChange(state));
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

        dispatch(batchActions(actions, 'BATCH_WS_PREFERENCES_CHANGED'));
        dispatch(handleCRTPreferenceChange(state));
        return {data: true};
    };
}

export function handlePreferencesDeletedEvent(msg: WebSocketMessage): GenericAction {
    const preferences = JSON.parse(msg.data.preferences);

    return {type: PreferenceTypes.DELETED_PREFERENCES, data: preferences};
}

export function handleCRTPreferenceChange(oldState: GlobalState) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc): Promise<ActionResult> => {
        const newState = getState();

        // Check for the changes in CRT preferences.
        if (isCollapsedThreadsEnabled(oldState) !== isCollapsedThreadsEnabled(newState)) {
            // Clear the data and restart the app.
            await dismissAllModals();
            dispatch(purgeOfflineStore());
        }
        return {data: true};
    };
}
