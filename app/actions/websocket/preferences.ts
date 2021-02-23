// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getAddedDmUsersIfNecessary} from '@actions/helpers/channels';
import {getPost} from '@actions/views/post';
import {PreferenceTypes} from '@mm-redux/action_types';
import {Preferences} from '@mm-redux/constants';
import {getAllPosts} from '@mm-redux/selectors/entities/posts';
import {ActionResult, DispatchFunc, GenericAction, GetStateFunc, batchActions} from '@mm-redux/types/actions';
import {PreferenceType} from '@mm-redux/types/preferences';
import {WebSocketMessage} from '@mm-redux/types/websocket';

export function handlePreferenceChangedEvent(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc): Promise<ActionResult> => {
        const preference = JSON.parse(msg.data.preference);
        const actions: Array<GenericAction> = [{
            type: PreferenceTypes.RECEIVED_PREFERENCES,
            data: [preference],
        }];

        const dmActions = await getAddedDmUsersIfNecessary(getState(), [preference]);
        if (dmActions.length) {
            actions.push(...dmActions);
        }

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

        const dmActions = await getAddedDmUsersIfNecessary(getState(), preferences);
        if (dmActions.length) {
            actions.push(...dmActions);
        }

        dispatch(batchActions(actions, 'BATCH_WS_PREFERENCES_CHANGED'));
        return {data: true};
    };
}

export function handlePreferencesDeletedEvent(msg: WebSocketMessage): GenericAction {
    const preferences = JSON.parse(msg.data.preferences);

    return {type: PreferenceTypes.DELETED_PREFERENCES, data: preferences};
}
