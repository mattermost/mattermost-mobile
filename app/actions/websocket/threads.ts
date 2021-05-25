// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {handleThreadArrived, handleReadChanged, handleAllMarkedRead} from '@mm-redux/actions/threads';
import {ActionResult, DispatchFunc, GetStateFunc} from '@mm-redux/types/actions';
import {WebSocketMessage} from '@mm-redux/types/websocket';

export function handleThreadUpdated(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc): ActionResult => {
        try {
            const threadData = JSON.parse(msg.data.thread);
            // console.log('$$$$$$$$$$$$$$$: ', threadData);
            handleThreadArrived(dispatch, threadData, msg.broadcast.team_id);
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

/*
function handleThreadFollowChanged(msg: WebSocketMessage) {
    return (doDispatch: Dispatch): ActionResult => {
        handleFollowChanged(doDispatch, msg.data.thread_id, msg.broadcast.team_id, msg.data.state);
    };
}
*/
