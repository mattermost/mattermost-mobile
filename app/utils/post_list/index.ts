// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';

import {Post} from '@constants';
import {toMilliseconds} from '@utils/datetime';
import {isFromWebhook} from '@utils/post';
import {ensureString, includes, isArrayOf, isStringArray, secureGetFromRecord} from '@utils/types';

import type {PostList, PostWithPrevAndNext} from '@typings/components/post_list';
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

function combineUserActivityPosts(orderedPosts: PostList) {
    let lastPostIsUserActivity = false;
    let combinedCount = 0;
    const out: PostList = [];
    let changed = false;

    for (let i = 0; i < orderedPosts.length; i++) {
        const item = orderedPosts[i];
        if (item.type === 'start-of-new-messages' || item.type === 'date' || item.type === 'thread-overview') {
            // Not a post, so it won't be combined
            out.push(item);

            lastPostIsUserActivity = false;
            combinedCount = 0;

            continue;
        } else if (item.type === 'post' && item.value.currentPost.deleteAt) {
            out.push(item);

            lastPostIsUserActivity = false;
            combinedCount = 0;
        } else {
            const postIsUserActivity = item.type === 'post' && includes(Post.USER_ACTIVITY_POST_TYPES, item.value.currentPost.type);
            if (postIsUserActivity && lastPostIsUserActivity && combinedCount < MAX_COMBINED_SYSTEM_POSTS) {
                out[out.length - 1].value += '_' + item.value.currentPost.id;
            } else if (postIsUserActivity) {
                out.push({type: 'user-activity', value: `${COMBINED_USER_ACTIVITY}${item.value.currentPost.id}`});
                combinedCount = 1;
                changed = true;
            } else {
                out.push(item);
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

function comparePostTypes(a: MessageData, b: MessageData) {
    const aPriority = secureGetFromRecord(postTypePriority, a.postType) ?? 99;
    const bPriority = secureGetFromRecord(postTypePriority, b.postType) ?? 99;
    return aPriority - bPriority;
}

function extractUserActivityData(userActivities: Record<PostType, UserActivityValue>): UserActivityProp {
    const messageData: MessageData[] = [];
    const allUserIds: string[] = [];
    const allUsernames: string[] = [];
    Object.entries(userActivities).forEach(([postType, values]: [PostType, UserActivityValue]) => {
        if (
            postType === Post.POST_TYPES.ADD_TO_TEAM ||
            postType === Post.POST_TYPES.ADD_TO_CHANNEL ||
            postType === Post.POST_TYPES.REMOVE_FROM_CHANNEL
        ) {
            if (Array.isArray(values)) {
                throw new Error('Invalid Post activity data');
            }
            Object.entries(values).forEach(([actorId, users]) => {
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

    // We can be more lax with the types here because the recursive function only checks
    // whether it is an array, or comparison with strings, so it should be safe enough.
    if (Array.isArray(post.props.user_activity_posts)) {
        for (const childPost of post.props.user_activity_posts as PostModel[]) {
            if (childPost && isJoinLeavePostForUsername(childPost, currentUsername)) {
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

export function selectOrderedPostsWithPrevAndNext(
    posts: PostModel[], lastViewedAt: number, indicateNewMessages: boolean, currentUserId: string, currentUsername: string, showJoinLeave: boolean,
    currentTimezone: string | null, isThreadScreen = false, savedPostIds = new Set<string>(),
): PostList {
    return selectOrderedPosts(
        posts, lastViewedAt, indicateNewMessages,
        currentUserId, currentUsername, showJoinLeave,
        currentTimezone, isThreadScreen, savedPostIds, true,
    );
}

export function selectOrderedPosts(
    posts: PostModel[], lastViewedAt: number, indicateNewMessages: boolean, currentUserId: string, currentUsername: string, showJoinLeave: boolean,
    currentTimezone: string | null, isThreadScreen = false, savedPostIds = new Set<string>(), includePrevNext = false) {
    if (posts.length === 0) {
        return [];
    }

    const out: PostList = [];
    let lastDate;
    let addedNewMessagesIndicator = false;

    // Iterating through the posts from oldest to newest
    for (let i = posts.length - 1; i >= 0; i--) {
        const post: PostWithPrevAndNext = {currentPost: posts[i]};
        post.isSaved = savedPostIds.has(post.currentPost.id);
        if (includePrevNext) {
            post.nextPost = posts[i - 1];
            if (!isThreadScreen || out[out.length - 1]?.type !== 'thread-overview') {
                post.previousPost = posts[i + 1];
            }
        }

        if (
            !post ||
            (post.currentPost.type === Post.POST_TYPES.EPHEMERAL_ADD_TO_CHANNEL && !isThreadScreen)
        ) {
            continue;
        }

        // Filter out join/leave messages if necessary
        if (shouldFilterJoinLeavePost(post.currentPost, showJoinLeave, currentUsername)) {
            continue;
        }

        // Push on a date header if the last post was on a different day than the current one
        const postDate = new Date(post.currentPost.createAt);
        const currentOffset = toMilliseconds({minutes: postDate.getTimezoneOffset()});
        if (currentTimezone) {
            const zone = moment.tz.zone(currentTimezone);
            if (zone) {
                const timezoneOffset = toMilliseconds({minutes: zone.utcOffset(post.currentPost.createAt)});
                postDate.setTime(post.currentPost.createAt + (currentOffset - timezoneOffset));
            }
        }

        if (!lastDate || lastDate.toDateString() !== postDate.toDateString()) {
            out.push({type: 'date', value: DATE_LINE + postDate.getTime()});

            lastDate = postDate;
        }

        if (
            lastViewedAt &&
            post.currentPost.createAt > lastViewedAt &&
            (post.currentPost.userId !== currentUserId || isFromWebhook(post.currentPost)) &&
            !addedNewMessagesIndicator &&
            indicateNewMessages
        ) {
            out.push({type: 'start-of-new-messages', value: START_OF_NEW_MESSAGES});
            addedNewMessagesIndicator = true;
        }

        out.push({type: 'post', value: post});

        if (isThreadScreen && i === posts.length - 1) {
            out.push({type: 'thread-overview', value: THREAD_OVERVIEW});
        }
    }

    // Flip it back to newest to oldest
    return out.reverse();
}

type ActivityData = {
    ids: string[];
    usernames: string[];
}
type UserActivityValue = string[] | Record<string, ActivityData>
function combineUserActivitySystemPost(systemPosts: PostModel[]) {
    const userActivities = systemPosts.reduce((acc: Record<string, UserActivityValue>, post: PostModel) => {
        const postType = post.type;
        const userActivityProps = acc;
        const combinedPostType = userActivityProps[postType];

        if (
            postType === Post.POST_TYPES.ADD_TO_TEAM ||
            postType === Post.POST_TYPES.ADD_TO_CHANNEL ||
            postType === Post.POST_TYPES.REMOVE_FROM_CHANNEL
        ) {
            const userId = ensureString(post.props?.addedUserId) || ensureString(post.props?.removedUserId);
            const username = ensureString(post.props?.addedUsername) || ensureString(post.props?.removedUsername);
            if (combinedPostType) {
                if (Array.isArray(combinedPostType)) {
                    throw new Error('Invalid Post activity data');
                }

                const userCombinedPostType = combinedPostType[post.userId];
                const users = userCombinedPostType || {ids: [], usernames: []};
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
                userActivityProps[postType] = [propsUserId];
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
        type: Post.POST_TYPES.COMBINED_USER_ACTIVITY,
        user_id: '',
        metadata: {},
    };
}

export function getDateForDateLine(item: string) {
    return parseInt(item.substring(DATE_LINE.length), 10);
}

export function getPostIdsForCombinedUserActivityPost(item: string) {
    if (!item.startsWith(COMBINED_USER_ACTIVITY)) {
        throw new Error(`Invalid prefix, expected string to start with '${COMBINED_USER_ACTIVITY}'`);
    }

    return item.substring(COMBINED_USER_ACTIVITY.length).split('_');
}

export function preparePostList(
    posts: PostModel[], lastViewedAt: number, indicateNewMessages: boolean, currentUserId: string, currentUsername: string, showJoinLeave: boolean,
    currentTimezone: string | null, isThreadScreen = false, savedPostIds = new Set<string>()) {
    const orderedPosts = selectOrderedPostsWithPrevAndNext(posts, lastViewedAt, indicateNewMessages, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);
    return combineUserActivityPosts(orderedPosts);
}

// Returns true if a post should be hidden when the user has Show Join/Leave Messages disabled
export function shouldFilterJoinLeavePost(post: PostModel, showJoinLeave: boolean, currentUsername: string): boolean {
    if (showJoinLeave) {
        return false;
    }

    // Don't filter out non-join/leave messages
    if (!includes(joinLeavePostTypes, post.type)) {
        return false;
    }

    // Don't filter out join/leave messages about the current user
    return !isJoinLeavePostForUsername(post, currentUsername);
}

export type MessageData = {
    actorId?: string;
    postType: PostType;
    userIds: string[];
}

function isMessageData(v: unknown): v is MessageData {
    if (typeof v !== 'object' || !v) {
        return false;
    }

    if (('actorId' in v) && typeof v.actorId !== 'string') {
        return false;
    }

    if (!('postType' in v) || typeof v.postType !== 'string') {
        return false;
    }

    if (!('userIds' in v) || !isStringArray(v.userIds)) {
        return false;
    }

    return true;
}

export type UserActivityProp = {
    allUserIds: string[];
    allUsernames: string[];
    messageData: MessageData[];
}

export function isUserActivityProp(v: unknown): v is UserActivityProp {
    if (typeof v !== 'object' || !v) {
        return false;
    }

    if (!('allUserIds' in v) || !isStringArray(v.allUserIds)) {
        return false;
    }

    if (!('allUsernames' in v) || !isStringArray(v.allUsernames)) {
        return false;
    }

    if (!('messageData' in v) || !isArrayOf(v.messageData, isMessageData)) {
        return false;
    }

    return true;
}
