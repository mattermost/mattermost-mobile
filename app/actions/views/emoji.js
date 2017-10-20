// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {addReaction} from 'mattermost-redux/actions/posts';
import {getPostIdsInCurrentChannel, makeGetPostIdsForThread} from 'mattermost-redux/selectors/entities/posts';

const getPostIdsForThread = makeGetPostIdsForThread();

export function addReactionToLatestPost(emoji, rootId) {
    return async (dispatch, getState) => {
        const state = getState();
        const postIds = rootId ? getPostIdsForThread(state, rootId) : getPostIdsInCurrentChannel(state);
        const lastPostId = postIds[0];

        dispatch(addReaction(lastPostId, emoji));
    };
}
