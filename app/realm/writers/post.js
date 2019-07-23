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
                const newPostsTimesInChannel = {
                    channelId,
                    start: firstPost.create_at,
                    end: lastPost.create_at,
                };

                realm.create('PostsTimesInChannel', newPostsTimesInChannel);
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
            postsTimesInChannel.end = lastPost.create_at;
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
