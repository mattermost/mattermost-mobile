// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {WebSocketMessage} from '@typings/api/websocket';

export async function handlePreferenceChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    //     const actions: GenericAction[] = [{
    //         type: PreferenceTypes.RECEIVED_PREFERENCES,
    //         data: [preference],
    //     }];
    //     const crtPreferenceChanged = dispatch(handleCRTPreferenceChange([preference])) as ActionResult;
    //     if (crtPreferenceChanged.data) {
    //         return {data: true};
    //     }
    //     const state = getState();
    //     const dmActions = await getAddedDmUsersIfNecessary(state, [preference]);
    //     if (dmActions.length) {
    //         actions.push(...dmActions);
    //     }
    //     dispatch(batchActions(actions, 'BATCH_WS_PREFERENCE_CHANGED'));
    //     return {data: true};
    // return async (dispatch: DispatchFunc, getState: GetStateFunc): Promise<ActionResult> => {
    //     const preference = JSON.parse(msg.data.preference);
    //     const actions: GenericAction[] = [{
    //         type: PreferenceTypes.RECEIVED_PREFERENCES,
    //         data: [preference],
    //     }];
    //     const crtPreferenceChanged = dispatch(handleCRTPreferenceChange([preference])) as ActionResult;
    //     if (crtPreferenceChanged.data) {
    //         return {data: true};
    //     }
    //     const state = getState();
    //     const dmActions = await getAddedDmUsersIfNecessary(state, [preference]);
    //     if (dmActions.length) {
    //         actions.push(...dmActions);
    //     }
    //     dispatch(batchActions(actions, 'BATCH_WS_PREFERENCE_CHANGED'));
    //     return {data: true};
    // };
}

// example is flagging/saving a post
export async function handlePreferencesChangedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }
    const preferences = JSON.parse(msg.data.preferences) as PreferenceType[];

    const operator = database?.operator;
    if (operator) {
        operator.handlePreferences({
            prepareRecordsOnly: false,
            preferences,
        });
    }
}

// example is unflagging/unsaving a post
export async function handlePreferencesDeletedEvent(serverUrl: string, msg: WebSocketMessage): Promise<void> {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const preferences = JSON.parse(msg.data.preferences) as PreferenceType[];
    const operator = database?.operator;
    if (operator) {
        operator.handlePreferences({
            prepareRecordsOnly: false,
            preferences,
        });
    }
}
