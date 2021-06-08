// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {handleThreadArrived, handleReadChanged, handleAllMarkedRead, handleFollowChanged, getThread as fetchThread} from '@mm-redux/actions/threads';
import {getCurrentUserId} from '@mm-redux/selectors/entities/common';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getThread} from '@mm-redux/selectors/entities/threads';
import {ActionResult, DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';
import {WebSocketMessage} from '@mm-redux/types/websocket';

export function handleThreadUpdated(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc, getState: GetStateFunc): ActionResult => {
        try {
            const threadData = JSON.parse(msg.data.thread);
            handleThreadArrived(dispatch, getState, threadData, msg.broadcast.team_id);
        } catch {
            // invalid JSON
        }

        return {data: true};
    };
}

export function handleThreadReadChanged(msg: WebSocketMessage) {
    return (doDispatch: DispatchFunc, getState: GetStateFunc): ActionResult => {
        if (msg.data.thread_id) {
            const state = getState();
            const thread = state.entities.threads.threads?.[msg.data.thread_id];
            if (thread) {
                handleReadChanged(
                    doDispatch,
                    msg.data.thread_id,
                    msg.broadcast.team_id,
                    msg.data.channel_id,
                    {
                        lastViewedAt: msg.data.timestamp,
                        prevUnreadMentions: thread.unread_mentions,
                        newUnreadMentions: msg.data.unread_mentions,
                        prevUnreadReplies: thread.unread_replies,
                        newUnreadReplies: msg.data.unread_replies,
                    },
                );
            }
        } else {
            handleAllMarkedRead(doDispatch, msg.broadcast.team_id);
        }
        return {data: true};
    };
}

export function handleThreadFollowChanged(msg: WebSocketMessage) {
    return async (doDispatch: DispatchFunc, doGetState: GetStateFunc): Promise<ActionResult> => {
        const state = doGetState();
        const thread = getThread(state, msg.data.thread_id);
        if (!thread && msg.data.state) {
            await doDispatch(fetchThread(getCurrentUserId(state), getCurrentTeamId(state), msg.data.thread_id, true));
        }
        handleFollowChanged(doDispatch, msg.data.thread_id, msg.broadcast.team_id, msg.data.state);
        return {data: true};
    };
}
