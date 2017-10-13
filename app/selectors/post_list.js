// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Posts} from 'mattermost-redux/constants';
import {getAllPosts} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {createArraySelector} from 'mattermost-redux/selectors/helpers';

import {START_OF_NEW_MESSAGES} from 'app/components/post_list/post_list';

// Returns a selector that, given the state and an object containing an array of postIds and an optional
// timestamp of when the channel was last read, returns a memoized array of postIds interspersed with
// day indicators and an optional new message indicator.
export function makePreparePostIdsForPostList() {
    return createArraySelector(
        (state, props) => props.postIds,
        (state, props) => props.lastViewedAt,
        getAllPosts,
        getCurrentUserId,
        (postIds, lastViewedAt, allPosts, currentUserId) => {
            const out = [];

            let lastDate = null;
            let addedNewMessagesIndicator = false;

            // Remember that we're iterating through the posts from newest to oldest
            for (const postId of postIds) {
                const post = allPosts[postId];

                // TODO shouldn't the current user's posts be displayed if they were deleted by another user?
                if (post.state === Posts.POST_DELETED && post.user_id === currentUserId) {
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
