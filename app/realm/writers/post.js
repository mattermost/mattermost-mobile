// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';

import {PostTypes} from 'app/realm/action_types';
import {postDataToRealm} from 'app/realm/utils/post';

function storePosts(realm, posts) {
    posts.forEach((p) => {
        const realmPost = realm.objectForPrimaryKey('Post', p.id);
        if (!realmPost || realmPost.updateAt !== p.update_at) {
            const owner = realm.objectForPrimaryKey('User', p.user_id);
            const postData = postDataToRealm(p, owner);
            realm.create('Post', postData, true);
        }
    });
}

function postsWriter(realm, action) {
    switch (action.type) {
    case PostTypes.RECEIVED_POSTS_IN_CHANNEL: {
        // When posts in a channel are loaded for the first time
        const data = action.data || action.payload;
        const {channelId, order} = data;
        const lastIndex = order.length - 1;

        if (data.posts?.length) {
            const firstPost = data.posts.find((p) => p.id === order[lastIndex]);
            const lastPost = data.posts.find((p) => p.id === order[0]);

            storePosts(realm, data.posts);

            if (firstPost && lastPost) {
                const postsTimesInChannel = realm.objects('PostsTimesInChannel').filtered('channelId = $0 AND (start >= $1 OR end <= $2)', channelId, firstPost.create_at, lastPost.create_at);
                if (postsTimesInChannel.isEmpty()) {
                    const newPostsTimesInChannel = {
                        channelId,
                        start: firstPost.create_at,
                        end: lastPost.create_at,
                    };
                    realm.create('PostsTimesInChannel', newPostsTimesInChannel);
                } else {
                    const postTimesInChannelRealm = postsTimesInChannel[0];
                    if (firstPost.create_at < postTimesInChannelRealm.start) {
                        postTimesInChannelRealm.start = firstPost.create_at;
                    }

                    if (lastPost.create_at > postTimesInChannelRealm.end) {
                        postTimesInChannelRealm.end = lastPost.create_at;
                    }
                }
            }
        }
        break;
    }
    case PostTypes.RECEIVED_POSTS_IN_CHANNEL_SINCE: {
        const data = action.data || action.payload;
        const {channelId, order} = data;

        if (data.posts?.length) {
            storePosts(realm, data.posts);

            const postsTimesInChannel = realm.objects('PostsTimesInChannel').filtered('channelId=$0', channelId).sorted('start', true)[0];
            const lastPost = data.posts.find((p) => p.id === order[0]);
            if (lastPost.create_at > postsTimesInChannel.end) {
                postsTimesInChannel.end = lastPost.create_at;
            }
        }
        break;
    }

    case PostTypes.RECEIVED_POSTS_BEFORE: {
        const data = action.data || action.payload;
        const {beforePostId, channelId, order} = data;

        if (data.posts?.length) {
            storePosts(realm, data.posts);

            const beforePost = realm.objectForPrimaryKey('Post', beforePostId);
            const postsTimesInChannel = realm.objects('PostsTimesInChannel').filtered('channelId=$0 AND end >= $1 AND start <= $1', channelId, beforePost.createAt);
            const firstPost = data.posts.find((p) => p.id === order[order.length - 1]);

            postsTimesInChannel[0].start = firstPost.create_at;
        }
        break;
    }

    case PostTypes.RECEIVED_POSTS_IN_THREAD: {
        const data = action.data || action.payload;

        if (data.posts?.length) {
            storePosts(realm, data.posts);
        }
        break;
    }

    default:
        break;
    }
}

export default combineWriters([
    postsWriter,
]);
