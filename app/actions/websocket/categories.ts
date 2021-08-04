// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyCategories, receivedCategoryOrder} from '@mm-redux/actions/channel_categories';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {ActionResult, DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';
import {WebSocketMessage} from '@mm-redux/types/websocket';

export function handleSidebarCategoryCreated(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc): Promise<ActionResult> => {
        const state = getState();
        const currentTeamId = getCurrentTeamId(state);

        if (msg.broadcast.team_id !== currentTeamId) {
            // The new category will be loaded when we switch teams.
            return {data: false};
        }

        // Fetch all categories, including ones that weren't explicitly updated, in case any other categories had channels
        // moved out of them.
        dispatch(fetchMyCategories(msg.broadcast.team_id));

        return {data: true};
    };
}

export function handleSidebarCategoryUpdated(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc): Promise<ActionResult> => {
        const state = getState();

        if (msg.broadcast.team_id !== getCurrentTeamId(state)) {
            // The updated categories will be loaded when we switch teams.
            return {data: false};
        }

        // Fetch all categories in case any other categories had channels moved out of them.
        dispatch(fetchMyCategories(msg.broadcast.team_id));

        return {data: true};
    };
}

export function handleSidebarCategoryDeleted(msg: WebSocketMessage) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc): Promise<ActionResult> => {
        const state = getState();

        if (msg.broadcast.team_id !== getCurrentTeamId(state)) {
            // The category will be removed when we switch teams.
            return {data: false};
        }

        // Fetch all categories since any channels that were in the deleted category were moved to other categories.
        dispatch(fetchMyCategories(msg.broadcast.team_id));

        return {data: true};
    };
}

export function handleSidebarCategoryOrderUpdated(msg: WebSocketMessage) {
    return receivedCategoryOrder(msg.broadcast.team_id, msg.data.order);
}

