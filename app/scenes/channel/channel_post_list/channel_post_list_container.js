// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {createSelector} from 'reselect';

import {loadPostsIfNecessary} from 'app/actions/views/channel';

import {getAllPosts, getPostsInCurrentChannel} from 'service/selectors/entities/posts';

import ChannelPostList from './channel_post_list';

const getPostsInCurrentChannelGroupedByDay = createSelector(
    getPostsInCurrentChannel,
    getAllPosts,
    (postsInChannel, allPosts) => {
        const postsByDay = {};

        for (let i = 0; i < postsInChannel.length; i++) {
            let post = postsInChannel[i];
            const dateString = new Date(post.create_at).toDateString();

            if (!postsByDay[dateString]) {
                postsByDay[dateString] = [];
            }

            if (post.root_id) {
                let isFirstReply = false;
                let isLastReply = false;
                let commentedOnPost;

                if (i + 1 <= postsInChannel.length) {
                    const previousPost = postsInChannel[i + 1];

                    if (previousPost.root_id !== post.root_id) {
                        isFirstReply = true;

                        if (previousPost.id !== post.root_id) {
                            commentedOnPost = allPosts[post.root_id];
                        }
                    }
                } else {
                    // The first visible comment will always be the first comment in a thread and will be
                    // commenting on a post that isn't visible
                    isFirstReply = true;
                    commentedOnPost = allPosts[post.root_id];
                }

                if (i - 1 < 0 || postsInChannel[i - 1].root_id !== post.root_id) {
                    isLastReply = true;
                }

                post = {
                    ...post,
                    isFirstReply,
                    isLastReply,
                    commentedOnPost
                };
            }

            postsByDay[dateString].push(post);
        }

        // Push the date on after the posts so that it's rendered first
        for (const dateString in postsByDay) {
            if (postsByDay.hasOwnProperty(dateString)) {
                postsByDay[dateString].push(new Date(dateString));
            }
        }

        return postsByDay;
    }
);

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        posts: getPostsInCurrentChannelGroupedByDay(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadPostsIfNecessary
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelPostList);
