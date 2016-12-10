// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Constants} from 'service/constants';

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

    const postInfo = state[channelId];
    const postList = postInfo || {};
    const combinedPosts = {...makePostListNonNull(postList)};

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

    const postInfo = state[channelId];
    const postList = postInfo ? postInfo.postList : {};
    const combinedPosts = {...makePostListNonNull(postList)};

    combinedPosts.posts[post.id] = post;

    if (combinedPosts.order.indexOf(post.id) === -1) {
        combinedPosts.order.unshift(post.id);
    }

    return {
        ...state,
        [channelId]: combinedPosts
    };
}

export function addPosts(state, action) {
    if (action.channelId) {
        return storePosts(state, action);
    }

    return storePost(state, action);
}

export function deletePost(state, action) {
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
        const combinedPosts = {...makePostListNonNull(postInfo)};

        combinedPosts.posts[post.id] = {
            ...post,
            state: Constants.POST_DELETED,
            file_ids: [],
            has_reactions: false
        };

        return {
            ...state,
            [channelId]: combinedPosts
        };
    }

    return state;
}

export function removePost(state, action) {
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
        const combinedPosts = {...makePostListNonNull(postInfo)};
        Reflect.deleteProperty(combinedPosts.posts, post.id);

        const index = combinedPosts.order.indexOf(post.id);
        if (index !== -1) {
            combinedPosts.order.splice(index, 1);
        }

        for (const pid in combinedPosts.posts) {
            if (!combinedPosts.posts.hasOwnProperty(pid)) {
                continue;
            }

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

export function profilesToSet(state, action) {
    const id = action.id;
    const nextSet = new Set(state[id]);
    Object.keys(action.data).forEach((key) => {
        nextSet.add(key);
    });

    return {
        ...state,
        [id]: nextSet
    };
}

export function addProfileToSet(state, action) {
    const id = action.id;
    const nextSet = new Set(state[id]);
    nextSet.add(action.data.user_id);
    return {
        ...state,
        [id]: nextSet
    };
}

export function removeProfileFromSet(state, action) {
    const id = action.id;
    const nextSet = new Set(state[id]);
    nextSet.delete(action.data.user_id);
    return {
        ...state,
        [id]: nextSet
    };
}
