// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {createSelector} from 'reselect';

import {goToThread} from 'app/actions/navigation';
import {loadPostsIfNecessary} from 'app/actions/views/channel';

import {getAllPosts, getPostsInCurrentChannel} from 'service/selectors/entities/posts';

import ChannelPostList from './channel_post_list';

const getPostsInCurrentChannelWithReplyProps = createSelector(
    getAllPosts,
    getPostsInCurrentChannel,
    (allPosts, postsInChannel) => {
        const posts = [];

        for (let i = 0; i < postsInChannel.length; i++) {
            let post = postsInChannel[i];

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

            posts.push(post);
        }

        return posts;
    }
);

function mapStateToProps(state, ownProps) {
    return {
        ...ownProps,
        posts: getPostsInCurrentChannelWithReplyProps(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            loadPostsIfNecessary,
            goToThread
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(ChannelPostList);
