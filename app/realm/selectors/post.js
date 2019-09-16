// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';

import {isUserActivityPost, shouldFilterJoinLeavePost} from 'app/utils/post';
import {getUserCurrentTimezone} from 'app/utils/timezone';
import {Posts} from 'app/constants';

import {createIdsSelector} from './helper';

export const getPostListIdsFromPosts = createIdsSelector(
    (options) => options,
    ({posts, inTime}) => {
        // TODO: create selector for this and perhaps include message indicator and date separators
        if (!inTime || !posts || posts.isEmpty()) {
            return [];
        }

        return posts.
            filtered('createAt >= $0 AND createAt <= $1', inTime.start, inTime.end).
            sorted('createAt', true).
            map((p) => p.id);
    }
);

export const getPostListIdsWithSeparators = createIdsSelector(
    (options) => options,
    (options) => {
        const {posts: postQuery, inTime} = options;
        if (!inTime || !postQuery || postQuery.isEmpty()) {
            return [];
        }

        const postsRealm = postQuery.
            filtered('createAt >= $0 AND createAt <= $1', inTime.start, inTime.end).
            sorted('createAt', true);

        const postsMap = {};
        postsRealm.reduce((result, p) => {
            result[p.id] = p;
            return result;
        }, postsMap);

        let postIds = filterPostsAndAddSeparators({...options, posts: postsRealm});
        postIds = combineUserActivityPosts({...options, posts: postsMap, postIds});

        return postIds;
    }
);

// Returns a selector that, given the state and an object containing an array of postIds and an optional
// timestamp of when the channel was last read, returns a memoized array of postIds interspersed with
// day indicators and an optional new message indicator.
export const filterPostsAndAddSeparators = createIdsSelector(
    (options) => options,
    ({posts, channelLastViewedAt, indicateNewMessages, selectedPostId, currentUser, showJoinLeave, timeZoneEnabled}) => {
        if (posts.length === 0 || !currentUser) {
            return [];
        }

        const timezone = getUserCurrentTimezone(currentUser.timezoneAsJson);
        const momentZone = timezone ? moment.tz.zone(timezone) : null;
        const out = [];

        let lastDate = null;
        let addedNewMessagesIndicator = false;

        // Iterating through the posts from oldest to newest
        for (let i = posts.length - 1; i >= 0; i--) {
            const post = posts[i];

            if (
                !post ||
                (post.type === Posts.POST_TYPES.EPHEMERAL_ADD_TO_CHANNEL && !selectedPostId)
            ) {
                continue;
            }

            // Filter out join/leave messages if necessary
            if (shouldFilterJoinLeavePost(post, showJoinLeave, currentUser.username)) {
                continue;
            }

            // Push on a date header if the last post was on a different day than the current one
            const postDate = new Date(post.createAt);
            if (timeZoneEnabled && momentZone) {
                const currentOffset = postDate.getTimezoneOffset() * 60 * 1000;
                const timezoneOffset = momentZone.utcOffset(post.createAt) * 60 * 1000;
                postDate.setTime(post.createAt + (currentOffset - timezoneOffset));
            }

            if (!lastDate || lastDate.toDateString() !== postDate.toDateString()) {
                out.push(Posts.POST_LIST_TYPES.DATE_LINE + postDate.getTime());

                lastDate = postDate;
            }

            if (
                channelLastViewedAt &&
                post.createAt > channelLastViewedAt &&
                post.user.id !== currentUser.id &&
                !addedNewMessagesIndicator &&
                indicateNewMessages
            ) {
                out.push(Posts.POST_LIST_TYPES.START_OF_NEW_MESSAGES);
                addedNewMessagesIndicator = true;
            }

            out.push(post.id);
        }

        // Flip it back to newest to oldest
        return out.reverse();
    }
);

export const combineUserActivityPosts = createIdsSelector(
    (options) => options,
    ({postIds, posts}) => {
        let lastPostIsUserActivity = false;
        let combinedCount = 0;

        const out = [];
        let changed = false;

        for (let i = 0; i < postIds.length; i++) {
            const postId = postIds[i];

            if (postId === Posts.POST_LIST_TYPES.START_OF_NEW_MESSAGES || postId.startsWith(Posts.POST_LIST_TYPES.DATE_LINE)) {
                // Not a post, so it won't be combined
                out.push(postId);

                lastPostIsUserActivity = false;
                combinedCount = 0;

                continue;
            }

            const post = posts[postId];
            const postIsUserActivity = isUserActivityPost(post.type);

            if (postIsUserActivity && lastPostIsUserActivity && combinedCount < Posts.MAX_COMBINED_SYSTEM_POSTS) {
                // Add the ID to the previous combined post
                out[out.length - 1] += '_' + postId;

                combinedCount += 1;

                changed = true;
            } else if (postIsUserActivity) {
                // Start a new combined post, even if the "combined" post is only a single post
                out.push(Posts.POST_LIST_TYPES.COMBINED_USER_ACTIVITY + postId);

                combinedCount = 1;

                changed = true;
            } else {
                out.push(postId);

                combinedCount = 0;
            }

            lastPostIsUserActivity = postIsUserActivity;
        }

        if (!changed) {
            // Nothing was combined, so return the original array
            return postIds;
        }

        return out;
    },
);
