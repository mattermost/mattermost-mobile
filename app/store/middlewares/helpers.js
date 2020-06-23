// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function getLastChannelForTeam(payload) {
    if (payload?.views?.team?.lastChannelForTeam) {
        const lastChannelForTeam = {...payload.views.team.lastChannelForTeam};
        const convertLastChannelForTeam = Object.values(lastChannelForTeam).some((value) => !Array.isArray(value));

        if (convertLastChannelForTeam) {
            Object.keys(lastChannelForTeam).forEach((id) => {
                lastChannelForTeam[id] = [lastChannelForTeam[id]];
            });
        }

        return lastChannelForTeam;
    }

    return {};
}

export function cleanUpState(payload, keepCurrent = false) {
    const nextState = Object.assign({}, payload);

    const lastTeamId = payload.views?.team?.lastTeamId;
    const lastChannelForTeam = getLastChannelForTeam(payload);
    const currentChannelId = lastChannelForTeam[lastTeamId] && lastChannelForTeam[lastTeamId].length ? lastChannelForTeam[lastTeamId][0] : '';

    const nextEntities = {
        posts: {
            posts: {},
            postsInChannel: {},
            postsInThread: {},
            reactions: {},
            openGraph: payload.entities?.posts?.openGraph,
            selectedPostId: payload.entities?.posts?.selectedPostId,
            currentFocusedPostId: payload.entities?.posts?.currentFocusedPostId,
        },
        files: {
            files: {},
            fileIdsByPostId: {},
        },
    };

    let retentionPeriod = 0;
    if (payload.entities?.general?.dataRetentionPolicy?.message_deletion_enabled) {
        retentionPeriod = payload.entities.general.dataRetentionPolicy.message_retention_cutoff;
    }

    const postIdsToKeep = [];

    // Keep the last 60 posts in each recently viewed channel
    nextEntities.posts.postsInChannel = cleanUpPostsInChannel(payload.entities.posts?.postsInChannel, lastChannelForTeam, keepCurrent ? currentChannelId : '');
    postIdsToKeep.push(...getAllFromPostsInChannel(nextEntities.posts.postsInChannel));

    // Keep any posts that appear in search results
    let searchResults = [];
    let flaggedPosts = [];
    if (payload.entities?.search) {
        if (payload.entities.search.results?.length) {
            const {results} = payload.entities.search;
            searchResults = results;
            postIdsToKeep.push(...results);
        }

        if (payload.entities.search.flagged?.length) {
            const {flagged} = payload.entities.search;
            flaggedPosts = flagged;
            postIdsToKeep.push(...flagged);
        }
    }

    const nextSearch = {
        ...(payload.entities.search || {}),
        results: searchResults,
        flagged: flaggedPosts,
    };

    if (payload.entities.posts?.posts) {
        const reactions = payload.entities.posts.reactions || {};
        const fileIdsByPostId = payload.entities.files?.fileIdsByPostId || {};
        const files = payload.entities.files?.files || {};
        const postsInThread = payload.entities.posts.postsInThread || {};

        postIdsToKeep.forEach((postId) => {
            const post = payload.entities.posts.posts[postId];

            if (post) {
                if (retentionPeriod && post.create_at < retentionPeriod) {
                    // This post has been removed by data retention, so don't keep it
                    removeFromPostsInChannel(nextEntities.posts.postsInChannel, post.channel_id, postId);

                    return;
                }

                // Keep the post
                nextEntities.posts.posts[postId] = post;

                // And its reactions
                const reaction = reactions[postId];
                if (reaction) {
                    nextEntities.posts.reactions[postId] = reaction;
                }

                // And its files
                const fileIds = fileIdsByPostId[postId];
                if (fileIds) {
                    nextEntities.files.fileIdsByPostId[postId] = fileIds;
                    fileIds.forEach((fileId) => {
                        nextEntities.files.files[fileId] = files[fileId];
                    });
                }

                // And its comments
                const threadPosts = postsInThread[postId];
                if (threadPosts) {
                    nextEntities.posts.postsInThread[postId] = threadPosts;
                }
            }
        });
    }

    // Remove any pending posts that haven't failed
    if (payload.entities.posts?.pendingPostIds?.length) {
        const nextPendingPostIds = [...payload.entities.posts.pendingPostIds];
        payload.entities.posts.pendingPostIds.forEach((id) => {
            const posts = nextEntities.posts.posts;
            const post = posts[id];

            if (post && !post.failed) {
                Reflect.deleteProperty(posts, id);

                removeFromPostsInChannel(nextEntities.posts.postsInChannel, post.channel_id, id);

                removePendingPost(nextPendingPostIds, id);
            } else if (!post) {
                removePendingPost(nextPendingPostIds, id);
            }
        });

        nextEntities.posts.pendingPostIds = nextPendingPostIds;
    }

    nextState.views = {
        ...(nextState.views || {}),
        root: {
            ...(nextState.views?.root || {}),
            // eslint-disable-next-line no-underscore-dangle
            hydrationComplete: nextState.views?.root?.hydrationComplete || !nextState._persist,
        },
    };

    // eslint-disable-next-line no-underscore-dangle
    nextState._persist = {
        rehydrated: true,
    };

    nextState.entities = {
        ...nextState.entities,
        ...nextEntities,
        search: nextSearch,
    };

    return nextState;
}

// cleanUpPostsInChannel returns a copy of postsInChannel where only the most recent posts in each channel are kept
export function cleanUpPostsInChannel(postsInChannel, lastChannelForTeam, currentChannelId, recentPostCount = 60) {
    const nextPostsInChannel = {};

    if (postsInChannel && lastChannelForTeam) {
        for (const channelIds of Object.values(lastChannelForTeam)) {
            for (const channelId of channelIds) {
                if (nextPostsInChannel[channelId]) {
                    // This is a DM or GM channel that we've already seen on another team
                    continue;
                }

                const postsForChannel = postsInChannel[channelId];

                if (!postsForChannel) {
                    // We don't have anything to keep for this channel
                    continue;
                }

                let nextPostsForChannel;

                if (channelId === currentChannelId) {
                    // Keep all of the posts for this channel
                    nextPostsForChannel = postsForChannel;
                } else {
                    // Only keep the most recent posts for this channel
                    const recentBlock = postsForChannel.find((block) => block.recent);

                    if (!recentBlock) {
                        // We don't have recent posts for this channel
                        continue;
                    }

                    nextPostsForChannel = [{
                        ...recentBlock,
                        order: recentBlock.order.slice(0, recentPostCount),
                    }];
                }

                nextPostsInChannel[channelId] = nextPostsForChannel;
            }
        }
    }

    return nextPostsInChannel;
}

// getAllFromPostsInChannel returns an array of all post IDs found in postsInChannel
export function getAllFromPostsInChannel(postsInChannel) {
    const postIds = [];

    if (postsInChannel) {
        for (const postsForChannel of Object.values(postsInChannel)) {
            for (const block of postsForChannel) {
                postIds.push(...block.order);
            }
        }
    }

    return postIds;
}

function removeFromPostsInChannel(postsInChannel, channelId, postId) {
    const postsForChannel = postsInChannel[channelId];

    if (!postsForChannel) {
        return;
    }

    // Since this has already gone through cleanUpPostsInChannel, we know that there can only be one block to look at
    const index = postsForChannel[0].order.indexOf(postId);
    if (index !== -1) {
        postsForChannel[0].order.splice(index, 1);
    }
}

function removePendingPost(pendingPostIds, id) {
    const pendingIndex = pendingPostIds.indexOf(id);
    if (pendingIndex !== -1) {
        pendingPostIds.splice(pendingIndex, 1);
    }
}
