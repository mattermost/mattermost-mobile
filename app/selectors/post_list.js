// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Posts, Preferences} from 'mattermost-redux/constants';
import {getAllPosts} from 'mattermost-redux/selectors/entities/posts';
import {getBool} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {createIdsSelector} from 'mattermost-redux/utils/helpers';
import {shouldFilterPost} from 'mattermost-redux/utils/post_utils';

import {START_OF_NEW_MESSAGES} from 'app/components/post_list/post_list';

function shouldFilterJoinLeave(state) {
    return getBool(state, Preferences.CATEGORY_ADVANCED_SETTINGS, Preferences.ADVANCED_FILTER_JOIN_LEAVE);
}

// Returns a selector that, given the state and an object containing an array of postIds and an optional
// timestamp of when the channel was last read, returns a memoized array of postIds interspersed with
// day indicators and an optional new message indicator.
export function makePreparePostIdsForPostList() {
    return createIdsSelector(
        (state, props) => props.postIds,
        (state, props) => props.lastViewedAt,
        getAllPosts,
        getCurrentUserId,
        shouldFilterJoinLeave,
        (postIds, lastViewedAt, allPosts, currentUserId, filterJoinLeave) => {
            const out = [];

            let lastDate = null;
            let addedNewMessagesIndicator = false;

            const filterOptions = {filterJoinLeave};

            // Remember that we're iterating through the posts from newest to oldest
            for (const postId of postIds) {
                const post = allPosts[postId];

                if (post.state === Posts.POST_DELETED && post.user_id === currentUserId) {
                    continue;
                }

                // Filter out join/leave messages if necessary
                if (shouldFilterPost(post, filterOptions)) {
                    continue;
                }

                // Only add the new messages line if a lastViewedAt time is set
                if (lastViewedAt && !addedNewMessagesIndicator) {
                    const postIsUnread = post.create_at > lastViewedAt;

                    if (postIsUnread) {
                        out.push(START_OF_NEW_MESSAGES);
                        addedNewMessagesIndicator = true;
                    }
                }

                // Push on a date header if the last post was on a different day than the current one
                const postDate = new Date(post.create_at);

                if (lastDate && lastDate.toDateString() !== postDate.toDateString()) {
                    out.push(lastDate);
                }

                lastDate = postDate;

                out.push(postId);
            }

            // Push on the date header for the oldest post
            if (lastDate) {
                out.push(lastDate);
            }

            return out;
        }
    );
}
