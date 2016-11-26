// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

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
    let postList = pl;
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

export function addPosts(state, action) {
    const newState = {...state};
    const newPosts = action.post_list;
    const id = action.channel_id;

    if (isPostListNull(newPosts)) {
        return state;
    }

    if (action.check_latest) {
        const currentLatest = newState.latestPageTime[id] || 0;
        if (newPosts.order.length >= 1) {
            const newLatest = newPosts.posts[newPosts.order[0]].create_at || 0;
            if (newLatest > currentLatest) {
                newState.latestPageTime[id] = newLatest;
            }
        } else if (currentLatest === 0) {
            // Mark that an empty page was received
            newState.latestPageTime[id] = 1;
        }
    }

    const combinedPosts = makePostListNonNull(newState.postsInfo[id].postList);

    for (const pid in newPosts.posts) {
        if (newPosts.posts.hasOwnProperty(pid)) {
            const np = newPosts.posts[pid];
            if (np.delete_at === 0) {
                combinedPosts.posts[pid] = np;
                if (combinedPosts.order.indexOf(pid) === -1 && newPosts.order.indexOf(pid) !== -1) {
                    combinedPosts.order.push(pid);
                }
            } else if (combinedPosts.posts.hasOwnProperty(pid)) {
                combinedPosts.posts[pid] = {...np, state: 'DELETED', fileIds: []};
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

    if (newState.postInfo.hasOwnProperty(id)) {
        newState.postInfo[id] = {};
    }
    newState.postsInfo[id].postList = combinedPosts;

    return newState;
}
