// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Post} from '@constants';

import {
    selectOrderedPostsWithPrevAndNext,
    selectOrderedPosts,
    generateCombinedPost,
    getDateForDateLine,
    getPostIdsForCombinedUserActivityPost,
    preparePostList,
    shouldFilterJoinLeavePost,
} from '.';

import type PostModel from '@typings/database/models/servers/post';

const mockPostModel = (overrides: Partial<PostModel> = {}): PostModel => ({
    id: 'post-id',
    channelId: 'channel-id',
    createAt: Date.now(),
    deleteAt: 0,
    type: 'custom_post_type',
    userId: 'user-id',
    ...overrides,
} as PostModel);

describe('selectOrderedPostsWithPrevAndNext', () => {
    const lastViewedAt = Date.now() - 1000; // 1 second ago
    const currentUserId = 'current-user-id';
    const currentUsername = 'current-username';
    const showJoinLeave = true;
    const currentTimezone = 'America/New_York';
    const isThreadScreen = false;
    const savedPostIds = new Set<string>();

    it('should return an empty array when posts array is empty', () => {
        const result = selectOrderedPostsWithPrevAndNext([], lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);
        expect(result).toEqual([]);
    });

    it('should return ordered posts with previous and next posts', () => {
        const posts = [
            mockPostModel({id: 'post1', createAt: Date.now() - 5000}), // 5 seconds ago
            mockPostModel({id: 'post2', createAt: Date.now() - 10000}), // 10 seconds ago
            mockPostModel({id: 'post3', createAt: Date.now() - 15000}), // 15 seconds ago
        ];

        const result = selectOrderedPostsWithPrevAndNext(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);

        // The number of posts returned should match the input
        expect(result.length).toBe(4);

        // Ensure the next and previous posts are set correctly
        expect(typeof result[0].value === 'object' && result[0].value.nextPost).toBeUndefined(); // First post shouldn't have nextPost
        expect(typeof result[0].value === 'object' && result[0].value.previousPost).toBe(posts[1]);

        expect(typeof result[1].value === 'object' && result[1].value.nextPost).toBe(posts[0]);
        expect(typeof result[1].value === 'object' && result[1].value.previousPost).toBe(posts[2]);

        expect(typeof result[2].value === 'object' && result[2].value.nextPost).toBe(posts[1]);
        expect(typeof result[2].value === 'object' && result[2].value.previousPost).toBeUndefined(); // Last post shouldn't have nextPost
    });

    it('should include date headers between posts from different days', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1); // 1 day ago

        const posts = [
            mockPostModel({id: 'post1', createAt: yesterday.getTime()}), // Yesterday
            mockPostModel({id: 'post2', createAt: Date.now()}), // Today
        ];

        const result = selectOrderedPostsWithPrevAndNext(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);

        // There should be 4 items: 2 posts + 2 date headers
        expect(result.length).toBe(5);

        // Ensure the first item is a date header
        expect(result[1].type).toBe('date');
        expect(result[4].type).toBe('date');
    });

    it('should add "start-of-new-messages" indicator when there are new posts', () => {
        const newPostTime = Date.now() + 1000; // Post in the future (newer than `lastViewedAt`)

        const posts = [
            mockPostModel({id: 'post1', createAt: newPostTime, userId: 'another-user-id'}), // New post by another user
            mockPostModel({id: 'post2', createAt: Date.now() - 5000}), // Older post
        ];

        const result = selectOrderedPostsWithPrevAndNext(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);

        // There should be 3 items: 1 "start-of-new-messages" + 2 posts
        expect(result.length).toBe(4);

        // Ensure the "start-of-new-messages" indicator is added
        expect(result[1].type).toBe('start-of-new-messages');
    });

    it('should not add "start-of-new-messages" indicator if there are no new posts', () => {
        const oldPostTime = Date.now() - 10000; // Older than `lastViewedAt`

        const posts = [
            mockPostModel({id: 'post1', createAt: oldPostTime, userId: 'another-user-id'}), // Old post by another user
        ];

        const result = selectOrderedPostsWithPrevAndNext(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);

        // There should be only 1 post one date and no "start-of-new-messages"
        expect(result.length).toBe(2);
        expect(result[0].type).toBe('post');
    });

    it('should add thread overview when isThreadScreen is true', () => {
        const posts = [
            mockPostModel({id: 'post1', createAt: Date.now()}),
        ];

        const result = selectOrderedPostsWithPrevAndNext(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, true, savedPostIds);

        // There should be 4 items: 1 post + 1 thread overview + 1 date + 1 new messages
        expect(result.length).toBe(4);

        // Ensure the last item is a thread overview
        expect(result[0].type).toBe('thread-overview');
    });

    it('should mark saved posts as isSaved', () => {
        const savedPosts = new Set<string>(['post1']);
        const posts = [
            mockPostModel({id: 'post1', createAt: Date.now()}),
            mockPostModel({id: 'post2', createAt: Date.now()}),
        ];

        const result = selectOrderedPostsWithPrevAndNext(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPosts);

        // The first post should be marked as saved
        expect(typeof result[0].value === 'object' && result[0].value.isSaved).toBe(true);

        // The second post should not be marked as saved
        expect(typeof result[1].value === 'object' && result[1].value.isSaved).toBe(false);
    });
});

describe('selectOrderedPosts', () => {
    const lastViewedAt = Date.now() - 1000; // 1 second ago
    const currentUserId = 'current-user-id';
    const currentUsername = 'current-username';
    const showJoinLeave = true;
    const currentTimezone = 'America/New_York';
    const isThreadScreen = false;
    const savedPostIds = new Set<string>();

    it('should return an empty array when posts array is empty', () => {
        const result = selectOrderedPosts([], lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);
        expect(result).toEqual([]);
    });

    it('should order posts with date headers and new message indicators', () => {
        const posts = [
            mockPostModel({id: 'post1', createAt: Date.now() - 5000}), // 5 seconds ago
            mockPostModel({id: 'post2', createAt: Date.now() - 10000}), // 10 seconds ago
        ];

        const result = selectOrderedPosts(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);

        // There should be 3 items: 2 posts and 1 date header
        expect(result.length).toBe(3);

        // Ensure the first item is a date header
        expect(result[0].type).toBe('post');

        // Ensure the rest are posts
        expect(result[1].type).toBe('post');
        expect(result[2].type).toBe('date');
    });

    it('should add the "start-of-new-messages" indicator when there are new messages', () => {
        const newPostTime = Date.now() + 1000; // Future post (newer than `lastViewedAt`)

        const posts = [
            mockPostModel({id: 'post1', createAt: newPostTime, userId: 'another-user-id'}), // New post from another user
            mockPostModel({id: 'post2', createAt: Date.now() - 5000}), // Older post
        ];

        const result = selectOrderedPosts(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);

        // There should be 4 items: 1 "start-of-new-messages" + 2 posts + 1 date header
        expect(result.length).toBe(4);

        // Ensure the "start-of-new-messages" indicator is added
        expect(result[1].type).toBe('start-of-new-messages');
    });

    it('should not add "start-of-new-messages" if there are no new posts', () => {
        const oldPostTime = Date.now() - 2000; // Older than `lastViewedAt`

        const posts = [
            mockPostModel({id: 'post1', createAt: oldPostTime, userId: 'another-user-id'}), // Old post by another user
        ];

        const result = selectOrderedPosts(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);

        // There should be 2 items: 1 post + 1 date header, no "start-of-new-messages"
        expect(result.length).toBe(2);
        expect(result[1].type).toBe('date');
        expect(result[0].type).toBe('post');
    });

    it('should handle timezone differences correctly', () => {
        const postTime = Date.now() - 5000; // 5 seconds ago
        const postInDifferentTimezone = mockPostModel({createAt: postTime});

        const result = selectOrderedPosts([postInDifferentTimezone], lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, 'Europe/London', isThreadScreen, savedPostIds);

        // There should be 2 items: 1 date header + 1 post
        expect(result.length).toBe(2);
        expect(result[0].type).toBe('post');
        expect(result[1].type).toBe('date');
    });

    it('should not filter out join/leave posts if showJoinLeave is false and the username is the current user', () => {
        const joinLeavePost = mockPostModel({type: Post.POST_TYPES.LEAVE_CHANNEL, props: {username: currentUsername}});

        const result = selectOrderedPosts([joinLeavePost], lastViewedAt, true, currentUserId, currentUsername, false, currentTimezone, isThreadScreen, savedPostIds);

        expect(result.length).toBe(3);
    });

    it('should include join/leave posts if showJoinLeave is true', () => {
        const joinLeavePost = mockPostModel({type: Post.POST_TYPES.LEAVE_CHANNEL, props: {username: currentUsername}});

        const result = selectOrderedPosts([joinLeavePost], lastViewedAt, true, currentUserId, currentUsername, true, currentTimezone, isThreadScreen, savedPostIds);

        // There should be 2 items: 1 date header + 1 join/leave post + new message
        expect(result.length).toBe(3);
        expect(result[0].type).toBe('post');
    });

    it('should add thread overview post when isThreadScreen is true', () => {
        const posts = [
            mockPostModel({id: 'post1', createAt: Date.now()}),
        ];

        const result = selectOrderedPosts(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, true, savedPostIds);

        // There should be 3 items: 1 post + 1 thread overview + 1 date header
        expect(result.length).toBe(4);

        // Ensure the last item is a thread overview
        expect(result[0].type).toBe('thread-overview');
    });

    it('should mark saved posts as isSaved', () => {
        const savedPosts = new Set<string>(['post1']);
        const posts = [
            mockPostModel({id: 'post1', createAt: Date.now()}),
            mockPostModel({id: 'post2', createAt: Date.now()}),
        ];

        const result = selectOrderedPosts(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPosts);

        // The first post should be marked as saved
        expect(typeof result[0].value === 'object' && result[0].value.isSaved).toBe(true);

        // The second post should not be marked as saved
        expect(typeof result[1].value === 'object' && result[1].value.isSaved).toBe(false);
    });
});

describe('generateCombinedPost', () => {
    it('should generate a combined post with the correct id and channel_id', () => {
        const systemPosts = [
            mockPostModel({id: 'post1', channelId: 'channel1', createAt: Date.now() - 5000, message: 'Message 1'}),
            mockPostModel({id: 'post2', channelId: 'channel1', createAt: Date.now() - 10000, message: 'Message 2'}),
        ];

        const combinedId = 'combined-post-id';
        const result = generateCombinedPost(combinedId, systemPosts);

        // Ensure the combined post has the correct id and channel_id
        expect(result.id).toBe(combinedId);
        expect(result.channel_id).toBe('channel1');
    });

    it('should combine messages from all system posts into a single message', () => {
        const systemPosts = [
            mockPostModel({message: 'Message 1'}),
            mockPostModel({message: 'Message 2'}),
        ];

        const result = generateCombinedPost('combined-post-id', systemPosts);

        // The combined message should be a concatenation of all system post messages
        expect(result.message).toBe('Message 1\nMessage 2');
    });

    it('should use the createAt timestamp from the last post in the system posts array', () => {
        const systemPosts = [
            mockPostModel({createAt: Date.now() - 20000}),
            mockPostModel({createAt: Date.now() - 10000}),
            mockPostModel({createAt: Date.now() - 5000}),
        ];

        const result = generateCombinedPost('combined-post-id', systemPosts);

        // The createAt timestamp should be from the last post in the array
        expect(result.create_at).toBe(systemPosts[systemPosts.length - 1].createAt);
    });

    it('should include all system_post_ids in the props object', () => {
        const systemPosts = [
            mockPostModel({id: 'post1'}),
            mockPostModel({id: 'post2'}),
            mockPostModel({id: 'post3'}),
        ];

        const result = generateCombinedPost('combined-post-id', systemPosts);

        // Ensure all post ids are included in the system_post_ids prop
        expect(result.props?.system_post_ids).toEqual(['post1', 'post2', 'post3']);
    });

    it('should include combined messages in the props object', () => {
        const systemPosts = [
            mockPostModel({message: 'Message 1'}),
            mockPostModel({message: 'Message 2'}),
        ];

        const result = generateCombinedPost('combined-post-id', systemPosts);

        // Ensure the messages prop includes all individual messages
        expect(result.props?.messages).toEqual(['Message 1', 'Message 2']);
    });

    it('should set the post type to COMBINED_USER_ACTIVITY', () => {
        const systemPosts = [
            mockPostModel({id: 'post1'}),
            mockPostModel({id: 'post2'}),
        ];

        const result = generateCombinedPost('combined-post-id', systemPosts);

        // Ensure the post type is COMBINED_USER_ACTIVITY
        expect(result.type).toBe('system_combined_user_activity');
    });

    it('should handle an empty systemPosts array gracefully', () => {
        const systemPosts: PostModel[] = [];

        // Test that an empty array throws an error or handles the case
        expect(() => generateCombinedPost('combined-post-id', systemPosts)).toThrow();
    });

    it('should correctly sort system posts based on post type priority', () => {
        const systemPosts: PostModel[] = [
            mockPostModel({
                id: 'post1',
                type: Post.POST_TYPES.ADD_TO_TEAM,
                props: {
                    addedUserId: 'user1',
                    addedUsername: 'username1',
                },
            }),
            mockPostModel({
                id: 'post2',
                type: Post.POST_TYPES.REMOVE_FROM_TEAM,
                props: {
                    removedUserId: 'user2',
                    removedUsername: 'username2',
                },
            }),
            mockPostModel({
                id: 'post3',
                type: Post.POST_TYPES.JOIN_TEAM,
                props: {},
            }),
            mockPostModel({
                id: 'post4',
                type: Post.POST_TYPES.LEAVE_TEAM,
                props: {},
            }),
        ];

        const combinedPostId = 'combined-post-id';
        const result = generateCombinedPost(combinedPostId, systemPosts);

        // Extract the post types from the sorted messages in the combined post props
        const sortedPostTypes = (result.props?.user_activity_posts as any).map((post: PostModel) => post.type);

        // Expect the post types to be sorted based on their priorities in comparePostTypes
        expect(sortedPostTypes).toEqual([
            Post.POST_TYPES.ADD_TO_TEAM, // Next priority
            Post.POST_TYPES.REMOVE_FROM_TEAM, // Lowest priority
            Post.POST_TYPES.JOIN_TEAM, // Highest priority
            Post.POST_TYPES.LEAVE_TEAM, // Next priority
        ]);
    });

    it('should combine user activity for ADD_TO_TEAM posts correctly', () => {
        const systemPosts: PostModel[] = [
            mockPostModel({
                id: 'post1',
                type: Post.POST_TYPES.ADD_TO_TEAM,
                props: {
                    addedUserId: 'user1',
                    addedUsername: 'username1',
                },
            }),
            mockPostModel({
                id: 'post2',
                type: Post.POST_TYPES.ADD_TO_TEAM,
                props: {
                    addedUserId: 'user2',
                    addedUsername: 'username2',
                },
            }),
        ];

        const combinedPostId = 'combined-post-id';
        const result = generateCombinedPost(combinedPostId, systemPosts);

        // Ensure user activities are combined for ADD_TO_TEAM
        expect((result.props?.user_activity_posts as any).length).toBe(2);
        expect((result.props?.user_activity_posts as any)[0].props.addedUserId).toBe('user1');
        expect((result.props?.user_activity_posts as any)[1].props.addedUserId).toBe('user2');
    });

    it('should combine user activity for REMOVE_FROM_CHANNEL posts correctly', () => {
        const systemPosts: PostModel[] = [
            mockPostModel({
                id: 'post1',
                type: Post.POST_TYPES.REMOVE_FROM_CHANNEL,
                props: {
                    removedUserId: 'user3',
                    removedUsername: 'username3',
                },
            }),
            mockPostModel({
                id: 'post2',
                type: Post.POST_TYPES.REMOVE_FROM_CHANNEL,
                props: {
                    removedUserId: 'user4',
                    removedUsername: 'username4',
                },
            }),
        ];

        const combinedPostId = 'combined-post-id';
        const result = generateCombinedPost(combinedPostId, systemPosts);

        // Ensure user activities are combined for REMOVE_FROM_CHANNEL
        expect((result.props?.user_activity_posts as any).length).toBe(2);
        expect((result.props?.user_activity_posts as any)[0].props.removedUserId).toBe('user3');
        expect((result.props?.user_activity_posts as any)[1].props.removedUserId).toBe('user4');
    });

    it('should handle empty systemPosts gracefully', () => {
        const systemPosts: PostModel[] = [];

        const combinedPostId = 'combined-post-id';

        // Expect an error due to empty systemPosts
        expect(() => generateCombinedPost(combinedPostId, systemPosts)).toThrow();
    });
});

describe('getDateForDateLine', () => {
    it('should extract the correct timestamp from a valid date line', () => {
        const dateLine = 'date-1626098400000'; // July 12, 2021
        const result = getDateForDateLine(dateLine);

        // Expect the result to be the correct timestamp
        expect(result).toBe(1626098400000);
    });

    it('should handle invalid date lines and return NaN', () => {
        const invalidDateLine = 'invalid-prefix-12345';

        // The function should throw an error if the prefix is incorrect
        expect(getDateForDateLine(invalidDateLine)).toBeNaN();
    });

    it('should return NaN if the string is not a valid date line format', () => {
        const incompleteDateLine = 'date-'; // Missing the timestamp part

        // The function should throw an error if no valid timestamp is present
        expect(getDateForDateLine(incompleteDateLine)).toBeNaN();
    });

    it('should return NaN if the timestamp part is not a number', () => {
        const invalidTimestampDateLine = 'date-not_a_number';

        // The result should be NaN when the timestamp part is not a valid number
        const result = getDateForDateLine(invalidTimestampDateLine);
        expect(result).toBeNaN();
    });

    it('should extract timestamp correctly when there are extra characters after the timestamp', () => {
        const dateLineWithExtra = 'date-1626098400000-extra';
        const result = getDateForDateLine(dateLineWithExtra);

        // Expect the result to correctly extract the timestamp and ignore the extra characters
        expect(result).toBe(1626098400000);
    });
});

describe('getPostIdsForCombinedUserActivityPost', () => {
    it('should extract post IDs from a valid combined user activity post string', () => {
        const combinedPostId = 'user-activity-post1_post2_post3';
        const result = getPostIdsForCombinedUserActivityPost(combinedPostId);

        // Expect the result to be an array of post IDs
        expect(result).toEqual(['post1', 'post2', 'post3']);
    });

    it('should return an array with an empty value if there are no post IDs after the prefix', () => {
        const combinedPostId = 'user-activity-';
        const result = getPostIdsForCombinedUserActivityPost(combinedPostId);

        // Expect an array with empty value since there are no post IDs after the prefix
        expect(result).toEqual(['']);
    });

    it('should return a single post ID if there is only one post ID', () => {
        const combinedPostId = 'user-activity-post1';
        const result = getPostIdsForCombinedUserActivityPost(combinedPostId);

        // Expect an array with one post ID
        expect(result).toEqual(['post1']);
    });

    it('should return an empty array if the string does not start with the correct prefix', () => {
        const invalidPrefix = 'wrong-prefix-post1_post2';

        expect(() => getPostIdsForCombinedUserActivityPost(invalidPrefix)).toThrow('Invalid prefix');
    });

    it('should handle post IDs with special characters correctly', () => {
        const combinedPostId = 'user-activity-post1_post@_special#id_3';
        const result = getPostIdsForCombinedUserActivityPost(combinedPostId);

        // Expect the result to correctly extract the post IDs, including special characters
        expect(result).toEqual(['post1', 'post@', 'special#id', '3']);
    });
});

describe('preparePostList', () => {
    const lastViewedAt = Date.now() - 1000; // 1 second ago
    const currentUserId = 'current-user-id';
    const currentUsername = 'current-username';
    const showJoinLeave = true;
    const currentTimezone = 'America/New_York';
    const isThreadScreen = false;
    const savedPostIds = new Set<string>();

    it('should return an empty array when posts array is empty', () => {
        const result = preparePostList([], lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);
        expect(result).toEqual([]);
    });

    it('should process posts and add new messages indicator if necessary', () => {
        const newPostTime = Date.now() + 1000; // Future post (newer than `lastViewedAt`)
        const posts = [
            mockPostModel({id: 'post1', createAt: newPostTime, userId: 'another-user-id'}),
            mockPostModel({id: 'post2', createAt: Date.now() - 5000}),
        ];

        const result = preparePostList(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);

        // There should be 4 items: 1 "start-of-new-messages" + 2 posts + 1 date header
        expect(result.length).toBe(4);
        expect(result[0].type).toBe('post');
        expect(result[1].type).toBe('start-of-new-messages');
        expect(result[2].type).toBe('post');
        expect(result[3].type).toBe('date');
    });

    it('should handle posts without a new message indicator', () => {
        const oldPostTime = Date.now() - 2000; // Older than `lastViewedAt`
        const posts = [
            mockPostModel({id: 'post1', createAt: oldPostTime, userId: 'another-user-id'}),
        ];

        const result = preparePostList(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);

        // There should be 2 items: 1 post + 1 date header
        expect(result.length).toBe(2);
        expect(result[0].type).toBe('post');
        expect(result[1].type).toBe('date');
    });

    it('should combine user activity posts correctly', () => {
        const posts = [
            mockPostModel({id: 'post1', type: 'system_combined_user_activity', props: {user_activity_posts: []}}),
            mockPostModel({id: 'post2', type: 'system_combined_user_activity', props: {user_activity_posts: []}}),
        ];

        const result = preparePostList(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);

        // Ensure that user activity posts are combined correctly
        // Since it's calling `combineUserActivityPosts`, it should handle those posts.
        expect(result.length).toBe(4); // 2 posts + new messages + 1 date header
        expect(result[0].type).toBe('post');
        expect(result[1].type).toBe('post');
        expect(result[2].type).toBe('start-of-new-messages');
        expect(result[3].type).toBe('date');
    });

    it('should handle posts with deleteAt property in preparePostList', () => {
        const deletedPost: PostModel = mockPostModel({
            id: 'deleted-post',
            deleteAt: Date.now(), // Set deleteAt to a non-zero value
            createAt: Date.now(),
            type: '',
            userId: 'user-id',
            message: 'This is a deleted post',
            props: {},
        });

        const posts = [
            deletedPost, // The post that should trigger the deleteAt condition
        ];

        const result = preparePostList(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);

        // Ensure the deleted post is included in the result
        expect(result.length).toBe(3); // 1 date header + 1 deleted post + new messages
        expect(typeof result[0].value === 'object' && result[0].value.currentPost.id).toBe('deleted-post');
    });

    it('should combine consecutive user activity posts when postIsUserActivity is true', () => {
        // Mock consecutive user activity posts
        const userActivityPost1: PostModel = mockPostModel({
            id: 'user-activity-post1',
            type: Post.POST_TYPES.LEAVE_CHANNEL,
            createAt: Date.now() - 5000,
            userId: 'user-id-1',
            message: 'User activity post 1',
            props: {},
        });

        const userActivityPost2: PostModel = mockPostModel({
            id: 'user-activity-post2',
            type: Post.POST_TYPES.JOIN_CHANNEL,
            createAt: Date.now() - 4000,
            userId: 'user-id-2',
            message: 'User activity post 2',
            props: {},
        });

        const posts: PostModel[] = [
            userActivityPost1,
            userActivityPost2, // These two should be combined
        ];

        const result = preparePostList(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPostIds);

        // We expect the two user activity posts to be combined
        expect(result.length).toBe(2); // 1 date header + 1 combined user activity post
        expect(result[0].type).toBe('user-activity');
    });

    it('should filter out join/leave posts if showJoinLeave is false for other users', () => {
        const joinLeavePost = mockPostModel({type: Post.POST_TYPES.LEAVE_CHANNEL, props: {username: 'other-user'}});
        const result = preparePostList([joinLeavePost], lastViewedAt, true, currentUserId, currentUsername, false, currentTimezone, isThreadScreen, savedPostIds);

        // No posts should be returned because showJoinLeave is false
        expect(result.length).toBe(0);
    });

    it('should include join/leave posts if showJoinLeave is true', () => {
        const joinLeavePost = mockPostModel({type: Post.POST_TYPES.JOIN_CHANNEL, props: {username: currentUsername}});
        const result = preparePostList([joinLeavePost], lastViewedAt, true, currentUserId, currentUsername, true, currentTimezone, isThreadScreen, savedPostIds);

        // There should be 2 items: 1 post + new message + 1 date header
        expect(result.length).toBe(3);
        expect(result[0].type).toBe('user-activity');
    });

    it('should handle saved posts correctly', () => {
        const savedPosts = new Set<string>(['post1']);
        const posts = [
            mockPostModel({id: 'post1', createAt: Date.now()}),
            mockPostModel({id: 'post2', createAt: Date.now()}),
        ];

        const result = preparePostList(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, isThreadScreen, savedPosts);

        // The first post should be marked as saved
        expect(typeof result[0].value === 'object' && result[0].value.isSaved).toBe(true);

        // The second post should not be marked as saved
        expect(typeof result[1].value === 'object' && result[1].value.isSaved).toBe(false);
    });

    it('should handle thread overview when isThreadScreen is true', () => {
        const posts = [
            mockPostModel({id: 'post1', createAt: Date.now()}),
        ];

        const result = preparePostList(posts, lastViewedAt, true, currentUserId, currentUsername, showJoinLeave, currentTimezone, true, savedPostIds);

        // There should be 3 items: 1 post + 1 thread overview + 1 date header + new line
        expect(result.length).toBe(4);

        // Ensure the last item is a thread overview
        expect(result[0].type).toBe('thread-overview');
    });

    it('should return false when post has no props in isJoinLeavePostForUsername', () => {
        const joinLeavePost = mockPostModel({type: Post.POST_TYPES.LEAVE_CHANNEL, props: undefined}); // No props
        const result = preparePostList([joinLeavePost], lastViewedAt, true, currentUserId, currentUsername, true, currentTimezone, isThreadScreen, savedPostIds);

        // Post should be included because showJoinLeave is true, but it shouldn't be treated as a join/leave post for the current user
        expect(result.length).toBe(3); // 1 post + 1 date header + new messages
        expect(result[0].type).toBe('user-activity');
    });

    it('should return false when currentUsername is undefined in isJoinLeavePostForUsername', () => {
        const joinLeavePost = mockPostModel({type: Post.POST_TYPES.LEAVE_CHANNEL, props: {username: 'other-username'}});
        const result = preparePostList([joinLeavePost], lastViewedAt, true, currentUserId, '', true, currentTimezone, isThreadScreen, savedPostIds);

        // Post should be included because showJoinLeave is true, but it shouldn't be treated as a join/leave post for the current user since currentUsername is undefined
        expect(result.length).toBe(3); // 1 post + 1 date header
        expect(result[0].type).toBe('user-activity');
    });
});

describe('shouldFilterJoinLeavePost', () => {
    const currentUsername = 'current-username';

    it('should not filter non-join/leave posts', () => {
        const post = mockPostModel({type: 'custom_post_type' as PostType});
        const result = shouldFilterJoinLeavePost(post, false, currentUsername);

        // Non-join/leave posts should not be filtered regardless of showJoinLeave value
        expect(result).toBe(false);
    });

    it('should not filter join/leave posts if showJoinLeave is true', () => {
        const post = mockPostModel({type: Post.POST_TYPES.LEAVE_CHANNEL, props: {username: 'another-user'}});
        const result = shouldFilterJoinLeavePost(post, true, currentUsername);

        // Join/leave posts should not be filtered if showJoinLeave is true
        expect(result).toBe(false);
    });

    it('should not filter join/leave posts related to the current user even if showJoinLeave is false', () => {
        const post = mockPostModel({type: Post.POST_TYPES.JOIN_CHANNEL, props: {username: currentUsername}});
        const result = shouldFilterJoinLeavePost(post, false, currentUsername);

        // Join/leave posts for the current user should not be filtered even if showJoinLeave is false
        expect(result).toBe(false);
    });

    it('should filter join/leave posts unrelated to the current user if showJoinLeave is false', () => {
        const post = mockPostModel({type: Post.POST_TYPES.LEAVE_CHANNEL, props: {username: 'another-user'}});
        const result = shouldFilterJoinLeavePost(post, false, currentUsername);

        // Join/leave posts unrelated to the current user should be filtered if showJoinLeave is false
        expect(result).toBe(true);
    });

    it('should return true if post has no props', () => {
        const post = mockPostModel({type: Post.POST_TYPES.LEAVE_CHANNEL});
        const result = shouldFilterJoinLeavePost(post, false, currentUsername);

        // The post should be filtered because we can't determine if it's a join/leave post for the current user
        expect(result).toBe(true);
    });

    it('should return true if currentUsername is undefined', () => {
        const post = mockPostModel({type: Post.POST_TYPES.LEAVE_CHANNEL, props: {username: 'another-user'}});
        const result = shouldFilterJoinLeavePost(post, false, '');

        // The post should be filtered because we can't determine if it's a join/leave post for the current user
        expect(result).toBe(true);
    });

    it('should iterate over child posts in user_activity_posts and not filter if one matches current user', () => {
        const childPost1 = mockPostModel({id: 'child1', props: {username: 'another-user'}});
        const childPost2 = mockPostModel({id: 'child2', props: {username: currentUsername}});
        const post = mockPostModel({
            type: Post.POST_TYPES.LEAVE_CHANNEL,
            props: {
                user_activity_posts: [childPost1, childPost2], // Add child posts here
            },
        });

        const result = shouldFilterJoinLeavePost(post, false, currentUsername);

        // It should not filter because one of the child posts has the currentUsername
        expect(result).toBe(false);
    });

    it('should iterate over child posts in user_activity_posts and filter if none match current user', () => {
        const childPost1 = mockPostModel({id: 'child1', props: {username: 'another-user'}});
        const childPost2 = mockPostModel({id: 'child2', props: {username: 'yet-another-user'}});
        const post = mockPostModel({
            type: Post.POST_TYPES.LEAVE_CHANNEL,
            props: {
                user_activity_posts: [childPost1, childPost2], // Add child posts here
            },
        });

        const result = shouldFilterJoinLeavePost(post, false, currentUsername);

        // It should filter because none of the child posts match currentUsername
        expect(result).toBe(true);
    });
});
