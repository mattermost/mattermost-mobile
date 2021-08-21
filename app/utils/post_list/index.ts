// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';

import {Post} from '@constants';
import {getTimezone} from '@utils/user';

import type PostModel from '@typings/database/models/servers/post';

const joinLeavePostTypes = [
    Post.POST_TYPES.JOIN_LEAVE,
    Post.POST_TYPES.JOIN_CHANNEL,
    Post.POST_TYPES.LEAVE_CHANNEL,
    Post.POST_TYPES.ADD_REMOVE,
    Post.POST_TYPES.ADD_TO_CHANNEL,
    Post.POST_TYPES.REMOVE_FROM_CHANNEL,
    Post.POST_TYPES.JOIN_TEAM,
    Post.POST_TYPES.LEAVE_TEAM,
    Post.POST_TYPES.ADD_TO_TEAM,
    Post.POST_TYPES.REMOVE_FROM_TEAM,
    Post.POST_TYPES.COMBINED_USER_ACTIVITY,
];

export const COMBINED_USER_ACTIVITY = 'user-activity-';
export const DATE_LINE = 'date-';
export const START_OF_NEW_MESSAGES = 'start-of-new-messages';
export const MAX_COMBINED_SYSTEM_POSTS = 100;

function combineUserActivityPosts(orderedPosts: Array<PostModel | string>) {
    let lastPostIsUserActivity = false;
    let combinedCount = 0;
    const out: Array<PostModel | string> = [];
    let changed = false;

    for (let i = 0; i < orderedPosts.length; i++) {
        const post = orderedPosts[i];

        if (typeof post === 'string') {
            if (post === START_OF_NEW_MESSAGES || post.startsWith(DATE_LINE)) {
                // Not a post, so it won't be combined
                out.push(post);

                lastPostIsUserActivity = false;
                combinedCount = 0;

                continue;
            }
        } else {
            const postIsUserActivity = Post.USER_ACTIVITY_POST_TYPES.includes(post.type);
            if (postIsUserActivity && lastPostIsUserActivity && combinedCount < MAX_COMBINED_SYSTEM_POSTS) {
                // Add the ID to the previous combined post
                out[out.length - 1] += '_' + post.id;
                combinedCount += 1;
                changed = true;
            } else if (postIsUserActivity) {
                // Start a new combined post, even if the "combined" post is only a single post
                out.push(COMBINED_USER_ACTIVITY + post.id);
                combinedCount = 1;
                changed = true;
            } else {
                out.push(post);
                combinedCount = 0;
            }

            lastPostIsUserActivity = postIsUserActivity;
        }
    }

    if (!changed) {
        return orderedPosts;
    }

    return out;
}

function isJoinLeavePostForUsername(post: PostModel, currentUsername: string): boolean {
    if (!post.props || !currentUsername) {
        return false;
    }

    if (post.props.user_activity_posts) {
        for (const childPost of post.props.user_activity_posts as PostModel[]) {
            if (isJoinLeavePostForUsername(childPost, currentUsername)) {
                // If any of the contained posts are for this user, the client will
                // need to figure out how to render the post
                return true;
            }
        }
    }

    return post.props.username === currentUsername ||
        post.props.addedUsername === currentUsername ||
        post.props.removedUsername === currentUsername;
}

// are we going to do something with selectedPostId as in v1?
function selectOrderedPosts(
    posts: PostModel[], lastViewedAt: number, indicateNewMessages: boolean, currentUsername: string, showJoinLeave: boolean,
    timezoneEnabled: boolean, currentTimezone: UserTimezone | null, isThreadScreen = false) {
    if (posts.length === 0) {
        return [];
    }

    const out: Array<PostModel|string> = [];
    let lastDate;
    let addedNewMessagesIndicator = false;

    // Iterating through the posts from oldest to newest
    for (let i = posts.length - 1; i >= 0; i--) {
        const post = posts[i];

        if (
            !post ||
            (post.type === Post.POST_TYPES.EPHEMERAL_ADD_TO_CHANNEL && !isThreadScreen)
        ) {
            continue;
        }

        // Filter out join/leave messages if necessary
        if (shouldFilterJoinLeavePost(post, showJoinLeave, currentUsername)) {
            continue;
        }

        // Push on a date header if the last post was on a different day than the current one
        const postDate = new Date(post.createAt);
        if (timezoneEnabled) {
            const currentOffset = postDate.getTimezoneOffset() * 60 * 1000;
            const timezone = getTimezone(currentTimezone);
            if (timezone) {
                const zone = moment.tz.zone(timezone);
                if (zone) {
                    const timezoneOffset = zone.utcOffset(post.createAt) * 60 * 1000;
                    postDate.setTime(post.createAt + (currentOffset - timezoneOffset));
                }
            }
        }

        if (!lastDate || lastDate.toDateString() !== postDate.toDateString()) {
            out.push(DATE_LINE + postDate.getTime());

            lastDate = postDate;
        }

        if (
            lastViewedAt &&
            post.createAt > lastViewedAt &&
            !addedNewMessagesIndicator &&
            indicateNewMessages
        ) {
            out.push(START_OF_NEW_MESSAGES);
            addedNewMessagesIndicator = true;
        }

        out.push(post);
    }

    // Flip it back to newest to oldest
    return out.reverse();
}

export function getDateForDateLine(item: string) {
    return parseInt(item.substring(DATE_LINE.length), 10);
}

export function isDateLine(item: string) {
    return Boolean(item?.startsWith(DATE_LINE));
}

export function isStartOfNewMessages(item: string) {
    return item === START_OF_NEW_MESSAGES;
}

export function preparePostList(
    posts: PostModel[], lastViewedAt: number, indicateNewMessages: boolean, currentUsername: string, showJoinLeave: boolean,
    timezoneEnabled: boolean, currentTimezone: UserTimezone | null, isThreadScreen = false) {
    const orderedPosts = selectOrderedPosts(posts, lastViewedAt, indicateNewMessages, currentUsername, showJoinLeave, timezoneEnabled, currentTimezone, isThreadScreen);
    return combineUserActivityPosts(orderedPosts);
}

// Returns true if a post should be hidden when the user has Show Join/Leave Messages disabled
export function shouldFilterJoinLeavePost(post: PostModel, showJoinLeave: boolean, currentUsername: string): boolean {
    if (showJoinLeave) {
        return false;
    }

    // Don't filter out non-join/leave messages
    if (joinLeavePostTypes.indexOf(post.type) === -1) {
        return false;
    }

    // Don't filter out join/leave messages about the current user
    return !isJoinLeavePostForUsername(post, currentUsername);
}
