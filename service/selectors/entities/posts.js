// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {createSelector} from 'reselect';

export function getAllPosts(state) {
    return state.entities.posts.posts;
}

function getPostIdsInCurrentChannel(state) {
    return state.entities.posts.postsByChannel[state.entities.channels.currentId] || [];
}

export const getPostsInCurrentChannel = createSelector(
    getAllPosts,
    getPostIdsInCurrentChannel,
    (posts, postIds) => {
        return postIds.map((id) => posts[id]);
    }
);
