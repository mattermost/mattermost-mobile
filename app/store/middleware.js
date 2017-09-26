// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Config from 'assets/config';

export function messageRetention() {
    return (next) => (action) => {
        if (action.type === 'persist/REHYDRATE') {
            const {entities, ...payload} = action.payload;
            const retentionPeriod = Config.MessageRetentionPeriod + 1;

            if (!entities) {
                return next(action);
            }

            const {posts: postEntities, ...otherEntities} = entities;
            const {posts, postsInChannel, ...otherPostEntities} = postEntities;

            const nextPosts = Object.values(posts).reduce((reducedPosts, post) => {
                if ((Date.now() - post.create_at) / (1000 * 3600 * 24) < retentionPeriod) {
                    reducedPosts[post.id] = post;
                }

                return reducedPosts;
            }, {});

            const nextPostsInChannel = Object.keys(postsInChannel).reduce((reducedPostsInChannel, channel) => {
                reducedPostsInChannel[channel] = postsInChannel[channel].filter((p) => nextPosts.hasOwnProperty(p));

                return reducedPostsInChannel;
            }, {});

            const nextEntities = Object.assign({}, otherEntities, {
                posts: {
                    ...otherPostEntities,
                    posts: nextPosts,
                    postsInChannel: nextPostsInChannel
                }
            });

            const nextPayload = Object.assign({}, payload, {
                entities: nextEntities
            });

            return next({
                type: action.type,
                payload: nextPayload,
                error: action.error
            });
        }

        return next(action);
    };
}
