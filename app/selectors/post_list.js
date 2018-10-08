// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Posts, Preferences} from 'mattermost-redux/constants';
import {makeGetPostsForIds} from 'mattermost-redux/selectors/entities/posts';
import {getBool} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';
import {createIdsSelector} from 'mattermost-redux/utils/helpers';
import {shouldFilterJoinLeavePost} from 'mattermost-redux/utils/post_utils';

export const DATE_LINE = 'date-';
export const DATE_LINE_SUFFIX = '-index-';
export const START_OF_NEW_MESSAGES = 'start-of-new-messages';

function shouldShowJoinLeaveMessages(state) {
    // This setting is true or not set if join/leave messages are to be displayed
    return getBool(state, Preferences.CATEGORY_ADVANCED_SETTINGS, Preferences.ADVANCED_FILTER_JOIN_LEAVE, true);
}

// Returns a selector that, given the state and an object containing an array of postIds and an optional
// timestamp of when the channel was last read, returns a memoized array of postIds interspersed with
// day indicators and an optional new message indicator.
export function makePreparePostIdsForPostList() {
    const getMyPosts = makeGetPostsForIds();

    return createIdsSelector(
        (state, props) => getMyPosts(state, props.postIds),
        (state) => state.entities.posts.selectedPostId,
        (state, props) => props.lastViewedAt,
        (state, props) => props.indicateNewMessages,
        getCurrentUser,
        shouldShowJoinLeaveMessages,
        (posts, selectedPostId, lastViewedAt, indicateNewMessages, currentUser, showJoinLeave) => {
            if (posts.length === 0 || !currentUser) {
                return [];
            }

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
                const postDate = new Date(post.create_at);

                if (!lastDate || lastDate.toDateString() !== postDate.toDateString()) {
                    out.push(DATE_LINE + post.create_at);

                    lastDate = postDate;
                }

                if (
                    lastViewedAt &&
                    post.create_at > lastViewedAt &&
                    post.user_id !== currentUser.id &&
                    !addedNewMessagesIndicator &&
                    indicateNewMessages
                ) {
                    out.push(START_OF_NEW_MESSAGES);
                    addedNewMessagesIndicator = true;
                }

                out.push(post.id);
            }

            // Flip it back to newest to oldest
            return out.reverse();
        }
    );
}

export function makePreparePostIdsForSearchPosts() {
    const getMyPosts = makeGetPostsForIds();

    return createIdsSelector(
        (state, postIds) => getMyPosts(state, postIds),
        getCurrentUser,
        (posts, currentUser) => {
            if (posts.length === 0 || !currentUser) {
                return [];
            }

            const out = [];
            for (let i = 0; i < posts.length; i++) {
                const post = posts[i];

                // give chance for the post to be loaded
                if (!post) {
                    continue;
                }

                if (post.state === Posts.POST_DELETED && post.user_id === currentUser.id) {
                    continue;
                }

                // Render a date line for each post, even if displayed on the same date as the
                // previous post. Since we don't deduplicate here like in other views, we need to
                // ensure the resulting key is unique, even if the post timestamps (down to the
                // second) are identical. The screens know to parse out the index before trying
                // to consume the date value.
                out.push(DATE_LINE + post.create_at + DATE_LINE_SUFFIX + i);

                out.push(post.id);
            }

            return out;
        }
    );
}
