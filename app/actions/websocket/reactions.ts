// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {EmojiTypes, PostTypes} from '@mm-redux/action_types';
import {getCustomEmojiForReaction} from '@mm-redux/actions/posts';
import {ActionResult, DispatchFunc, GenericAction} from '@mm-redux/types/actions';
import {WebSocketMessage} from '@mm-redux/types/websocket';

export function handleAddEmoji(msg: WebSocketMessage): GenericAction {
    const data = JSON.parse(msg.data.emoji);

    return {
        type: EmojiTypes.RECEIVED_CUSTOM_EMOJI,
        data,
    };
}

export function handleReactionAddedEvent(msg: WebSocketMessage) {
    return (dispatch: DispatchFunc): ActionResult => {
        const {data} = msg;
        const reaction = JSON.parse(data.reaction);

        dispatch(getCustomEmojiForReaction(reaction.emoji_name));

        dispatch({
            type: PostTypes.RECEIVED_REACTION,
            data: reaction,
        });
        return {data: true};
    };
}

export function handleReactionRemovedEvent(msg: WebSocketMessage): GenericAction {
    const {data} = msg;
    const reaction = JSON.parse(data.reaction);

    return {
        type: PostTypes.REACTION_DELETED,
        data: reaction,
    };
}
