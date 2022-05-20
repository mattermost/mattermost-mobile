// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';

import {Post} from '@constants';
import {isFromWebhook} from '@utils/post';

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

const postTypePriority = {
    [Post.POST_TYPES.JOIN_TEAM]: 0,
    [Post.POST_TYPES.ADD_TO_TEAM]: 1,
    [Post.POST_TYPES.LEAVE_TEAM]: 2,
    [Post.POST_TYPES.REMOVE_FROM_TEAM]: 3,
    [Post.POST_TYPES.JOIN_CHANNEL]: 4,
    [Post.POST_TYPES.ADD_TO_CHANNEL]: 5,
    [Post.POST_TYPES.LEAVE_CHANNEL]: 6,
    [Post.POST_TYPES.REMOVE_FROM_CHANNEL]: 7,
    [Post.POST_TYPES.PURPOSE_CHANGE]: 8,
    [Post.POST_TYPES.HEADER_CHANGE]: 9,
    [Post.POST_TYPES.JOIN_LEAVE]: 10,
    [Post.POST_TYPES.DISPLAYNAME_CHANGE]: 11,
    [Post.POST_TYPES.CONVERT_CHANNEL]: 12,
    [Post.POST_TYPES.CHANNEL_DELETED]: 13,
    [Post.POST_TYPES.CHANNEL_UNARCHIVED]: 14,
    [Post.POST_TYPES.ADD_REMOVE]: 15,
    [Post.POST_TYPES.EPHEMERAL]: 16,
};

export const COMBINED_USER_ACTIVITY = 'user-activity-';
export const DATE_LINE = 'date-';
export const START_OF_NEW_MESSAGES = 'start-of-new-messages';
export const THREAD_OVERVIEW = 'thread-overview';
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
        } else if (post.deleteAt) {
            out.push(post);

            lastPostIsUserActivity = false;
            combinedCount = 0;
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

function comparePostTypes(a: typeof postTypePriority, b: typeof postTypePriority) {
    return postTypePriority[a.postType] - postTypePriority[b.postType];
}

function extractUserActivityData(userActivities: any) {
    const messageData: any[] = [];
    const allUserIds: string[] = [];
    const allUsernames: string[] = [];
    Object.entries(userActivities).forEach(([postType, values]: [string, any]) => {
        if (
            postType === Post.POST_TYPES.ADD_TO_TEAM ||
            postType === Post.POST_TYPES.ADD_TO_CHANNEL ||
            postType === Post.POST_TYPES.REMOVE_FROM_CHANNEL
        ) {
            Object.keys(values).map((key) => [key, values[key]]).forEach(([actorId, users]) => {
                if (Array.isArray(users)) {
                    throw new Error('Invalid Post activity data');
                }
                const {ids, usernames} = users;
                messageData.push({postType, userIds: [...usernames, ...ids], actorId});
                if (ids.length > 0) {
                    allUserIds.push(...ids);
                }

                if (usernames.length > 0) {
                    allUsernames.push(...usernames);
                }
                allUserIds.push(actorId);
            });
        } else {
            if (!Array.isArray(values)) {
                throw new Error('Invalid Post activity data');
            }
            messageData.push({postType, userIds: values});
            allUserIds.push(...values);
        }
    });

    messageData.sort(comparePostTypes);

    function reduceUsers(acc: Set<string>, curr: string) {
        if (!acc.has(curr)) {
            acc.add(curr);
        }
        return acc;
    }

    return {
        allUserIds: Array.from(allUserIds.reduce(reduceUsers, new Set<string>())),
        allUsernames: Array.from(allUsernames.reduce(reduceUsers, new Set<string>())),
        messageData,
    };
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
export function selectOrderedPosts(
    posts: PostModel[], lastViewedAt: number, indicateNewMessages: boolean, currentUserId: string, currentUsername: string, showJoinLeave: boolean,
    timezoneEnabled: boolean, currentTimezone: string | null, isThreadScreen = false) {
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
            if (currentTimezone) {
                const zone = moment.tz.zone(currentTimezone);
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
            (post.userId !== currentUserId || isFromWebhook(post)) &&
            !addedNewMessagesIndicator &&
            indicateNewMessages
        ) {
            out.push(START_OF_NEW_MESSAGES);
            addedNewMessagesIndicator = true;
        }

        out.push(post);

        if (isThreadScreen && i === posts.length - 1) {
            out.push(THREAD_OVERVIEW);
        }
    }

    // Flip it back to newest to oldest
    return out.reverse();
}

function combineUserActivitySystemPost(systemPosts: PostModel[]) {
    const userActivities = systemPosts.reduce((acc: any, post: PostModel) => {
        const postType = post.type;
        let userActivityProps = acc;
        const combinedPostType = userActivityProps[postType];

        if (
            postType === Post.POST_TYPES.ADD_TO_TEAM ||
            postType === Post.POST_TYPES.ADD_TO_CHANNEL ||
            postType === Post.POST_TYPES.REMOVE_FROM_CHANNEL
        ) {
            const userId = post.props.addedUserId || post.props.removedUserId;
            const username = post.props.addedUsername || post.props.removedUsername;
            if (combinedPostType) {
                if (Array.isArray(combinedPostType[post.userId])) {
                    throw new Error('Invalid Post activity data');
                }
                const users = combinedPostType[post.userId] || {ids: [], usernames: []};
                if (userId) {
                    if (!users.ids.includes(userId)) {
                        users.ids.push(userId);
                    }
                } else if (username && !users.usernames.includes(username)) {
                    users.usernames.push(username);
                }
                combinedPostType[post.userId] = users;
            } else {
                const users = {
                    ids: [] as string[],
                    usernames: [] as string[],
                };

                if (userId) {
                    users.ids.push(userId);
                } else if (username) {
                    users.usernames.push(username);
                }
                userActivityProps[postType] = {
                    [post.userId]: users,
                };
            }
        } else {
            const propsUserId = post.userId;

            if (combinedPostType) {
                if (!Array.isArray(combinedPostType)) {
                    throw new Error('Invalid Post activity data');
                }
                if (!combinedPostType.includes(propsUserId)) {
                    userActivityProps[postType] = [...combinedPostType, propsUserId];
                }
            } else {
                userActivityProps = {...userActivityProps, [postType]: [propsUserId]};
            }
        }

        return userActivityProps;
    }, {});

    return extractUserActivityData(userActivities);
}

export function generateCombinedPost(combinedId: string, systemPosts: PostModel[]): Post {
    // All posts should be in the same chann
    const channelId = systemPosts[0].channelId;

    // Assume that the last post is the oldest one
    const createAt = systemPosts[systemPosts.length - 1].createAt;

    const messages = systemPosts.map((post) => post.message);
    const message = messages.join('\n');

    return {
        id: combinedId,
        root_id: '',
        original_id: '',
        channel_id: channelId,
        create_at: createAt,
        delete_at: 0,
        edit_at: 0,
        update_at: 0,
        is_pinned: false,
        message,
        hashtags: '',
        pending_post_id: '',
        reply_count: 0,
        props: {
            messages,
            user_activity: combineUserActivitySystemPost(systemPosts),
            user_activity_posts: systemPosts,
            system_post_ids: systemPosts.map((post) => post.id),
        },
        type: Post.POST_TYPES.COMBINED_USER_ACTIVITY as PostType,
        user_id: '',
        metadata: {},
    };
}

export function getDateForDateLine(item: string) {
    return parseInt(item.substring(DATE_LINE.length), 10);
}

export function getPostIdsForCombinedUserActivityPost(item: string) {
    return item.substring(COMBINED_USER_ACTIVITY.length).split('_');
}

export function isCombinedUserActivityPost(item: string) {
    return (/^user-activity-(?:[^_]+_)*[^_]+$/).test(item);
}

export function isDateLine(item: string) {
    return Boolean(item?.startsWith(DATE_LINE));
}

export function isStartOfNewMessages(item: string) {
    return item === START_OF_NEW_MESSAGES;
}

export function isThreadOverview(item: string) {
    return item === THREAD_OVERVIEW;
}

export function preparePostList(
    posts: PostModel[], lastViewedAt: number, indicateNewMessages: boolean, currentUserId: string, currentUsername: string, showJoinLeave: boolean,
    timezoneEnabled: boolean, currentTimezone: string | null, isThreadScreen = false) {
    const orderedPosts = selectOrderedPosts(posts, lastViewedAt, indicateNewMessages, currentUserId, currentUsername, showJoinLeave, timezoneEnabled, currentTimezone, isThreadScreen);
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
