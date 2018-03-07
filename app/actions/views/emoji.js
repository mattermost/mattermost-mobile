// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {addReaction as serviceAddReaction} from 'mattermost-redux/actions/posts';
import {getPostIdsInCurrentChannel, makeGetPostIdsForThread} from 'mattermost-redux/selectors/entities/posts';

import {ViewTypes} from 'app/constants';

const getPostIdsForThread = makeGetPostIdsForThread();

export function addReaction(postId, emoji) {
    return (dispatch) => {
        dispatch(serviceAddReaction(postId, emoji));
        dispatch(addRecentEmoji(emoji));
    };
}

export function addReactionToLatestPost(emoji, rootId) {
    return async (dispatch, getState) => {
        const state = getState();
        const postIds = rootId ? getPostIdsForThread(state, rootId) : getPostIdsInCurrentChannel(state);
        const lastPostId = postIds[0];

        dispatch(serviceAddReaction(lastPostId, emoji));
        dispatch(addRecentEmoji(emoji));
    };
}

export function addRecentEmoji(emoji) {
    return {
        type: ViewTypes.ADD_RECENT_EMOJI,
        emoji,
    };
}

export function incrementEmojiPickerPage() {
    return async (dispatch) => {
        dispatch({
            type: ViewTypes.INCREMENT_EMOJI_PICKER_PAGE,
        });

        return {data: true};
    };
}
