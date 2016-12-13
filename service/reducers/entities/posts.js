// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Constants, PostsTypes, UsersTypes} from 'service/constants';
import {combineReducers} from 'redux';

function isPostListNull(pl) {
    if (!pl) {
        return true;
    }

    if (!pl.posts) {
        return true;
    }

    return !pl.order;
}

function makePostListNonNull(pl) {
    let postList = {...pl};
    if (!postList) {
        postList = {order: [], posts: {}};
    }

    if (!postList.order) {
        postList.order = [];
    }

    if (!postList.posts) {
        postList.posts = {};
    }

    return postList;
}

function storePosts(state, action) {
    const newPosts = action.data;
    const channelId = action.channelId;

    if (isPostListNull(newPosts)) {
        return state;
    }

    const postList = state[channelId] || {};
    const combinedPosts = makePostListNonNull(postList);

    for (const pid in newPosts.posts) {
        if (newPosts.posts.hasOwnProperty(pid)) {
            const np = newPosts.posts[pid];
            if (np.delete_at === 0) {
                combinedPosts.posts[pid] = np;
                if (combinedPosts.order.indexOf(pid) === -1 && newPosts.order.indexOf(pid) !== -1) {
                    combinedPosts.order.push(pid);
                }
            } else if (combinedPosts.posts.hasOwnProperty(pid)) {
                combinedPosts.posts[pid] = {...np, state: Constants.POST_DELETED, fileIds: []};
            }
        }
    }

    combinedPosts.order.sort((a, b) => {
        if (combinedPosts.posts[a].create_at > combinedPosts.posts[b].create_at) {
            return -1;
        }
        if (combinedPosts.posts[a].create_at < combinedPosts.posts[b].create_at) {
            return 1;
        }

        return 0;
    });

    return {
        ...state,
        [channelId]: combinedPosts
    };
}

function storePost(state, action) {
    const post = action.data;
    const channelId = post.channel_id;

    const postList = state[channelId] || {};
    const combinedPosts = makePostListNonNull(postList);

    combinedPosts.posts[post.id] = post;

    if (combinedPosts.order.indexOf(post.id) === -1) {
        combinedPosts.order.unshift(post.id);
    }

    return {
        ...state,
        [channelId]: combinedPosts
    };
}

function deletePost(state, action) {
    const post = action.data;
    const channelId = post.channel_id;
    const postInfo = state[channelId];

    if (!postInfo) {
        // the post that has been deleted is in a channel that we haven't seen so just ignore it
        return state;
    }

    if (isPostListNull(postInfo)) {
        return state;
    }

    if (postInfo.posts[post.id]) {
        const combinedPosts = makePostListNonNull(postInfo);

        combinedPosts.posts = {
            ...combinedPosts.posts,
            [post.id]: {
                ...post,
                state: Constants.POST_DELETED,
                file_ids: [],
                has_reactions: false
            }
        };

        return {
            ...state,
            [channelId]: combinedPosts
        };
    }

    return state;
}

function removePost(state, action) {
    const post = action.data;
    const channelId = post.channel_id;
    const postInfo = state[channelId];

    if (!postInfo) {
        // the post that has been deleted is in a channel that we haven't seen so just ignore it
        return state;
    }

    if (isPostListNull(postInfo)) {
        return state;
    }

    if (postInfo.posts[post.id]) {
        const combinedPosts = makePostListNonNull(postInfo);

        combinedPosts.order = combinedPosts.order.slice(0);
        combinedPosts.posts = {...combinedPosts.posts};

        // Remove the post
        Reflect.deleteProperty(combinedPosts.posts, post.id);

        const index = combinedPosts.order.indexOf(post.id);
        if (index !== -1) {
            combinedPosts.order.splice(index, 1);
        }

        // Remove any children of the post
        for (const pid of Object.keys(combinedPosts.posts)) {
            if (combinedPosts.posts[pid].root_id === post.id) {
                Reflect.deleteProperty(combinedPosts.posts, pid);
                const commentIndex = combinedPosts.order.indexOf(pid);
                if (commentIndex !== -1) {
                    combinedPosts.order.splice(commentIndex, 1);
                }
            }
        }

        return {
            ...state,
            [channelId]: combinedPosts
        };
    }

    return state;
}

function selectedPostId(state = '', action) {
    switch (action.type) {
    case UsersTypes.LOGOUT_SUCCESS:
        return '';
    default:
        return state;
    }
}

function currentFocusedPostId(state = '', action) {
    switch (action.type) {
    case UsersTypes.LOGOUT_SUCCESS:
        return '';
    default:
        return state;
    }
}

function postsInfo(state = {}, action) {
    switch (action.type) {
    case PostsTypes.RECEIVED_POST:
        return storePost(state, action);
    case PostsTypes.RECEIVED_POSTS:
        return storePosts(state, action);
    case PostsTypes.POST_DELETED:
        return deletePost(state, action);
    case PostsTypes.REMOVE_POST:
        return removePost(state, action);
    case UsersTypes.LOGOUT_SUCCESS:
        return {};
    default:
        return state;
    }
}

export default combineReducers({

    // the current selected post
    selectedPostId,

    // the current selected focused post (permalink view)
    currentFocusedPostId,

    // object where every key is the channel id and has and object with the postList
    postsInfo
});
