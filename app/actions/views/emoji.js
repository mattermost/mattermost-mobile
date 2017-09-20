// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {addReaction} from 'mattermost-redux/actions/posts';
import {getPostsInCurrentChannel, makeGetPostsForThread} from 'mattermost-redux/selectors/entities/posts';

const getPostsForThread = makeGetPostsForThread();

export function addReactionToLatestPost(emoji, rootId) {
    return async (dispatch, getState) => {
        const state = getState();
        const posts = rootId ? getPostsForThread(state, {rootId}) : getPostsInCurrentChannel(state);
        const lastPost = posts[0];

        dispatch(addReaction(lastPost.id, emoji));
    };
}
