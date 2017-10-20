// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {addReaction, createPost, deletePost, removePost} from 'mattermost-redux/actions/posts';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import Post from './post';

function mapStateToProps(state, ownProps) {
    const post = getPost(state, ownProps.postId);

    const {config, license} = state.entities.general;
    const roles = getCurrentUserId(state) ? getCurrentUserRoles(state) : '';

    let isFirstReply = true;
    let isLastReply = true;
    let commentedOnPost = null;
    if (ownProps.renderReplies && post && post.root_id) {
        if (ownProps.previousPostId) {
            const previousPost = getPost(state, ownProps.previousPostId);

            if (previousPost && (previousPost.id === post.root_id || previousPost.root_id === post.root_id)) {
                // Previous post is root post or previous post is in same thread
                isFirstReply = false;
            } else {
                // Last post is not a comment on the same message
                commentedOnPost = getPost(state, post.root_id);
            }
        }

        if (ownProps.nextPostId) {
            const nextPost = getPost(state, ownProps.nextPostId);

            if (nextPost && nextPost.root_id === post.root_id) {
                isLastReply = false;
            }
        }
    }

    return {
        config,
        currentUserId: getCurrentUserId(state),
        post,
        isFirstReply,
        isLastReply,
        commentedOnPost,
        license,
        roles,
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addReaction,
            createPost,
            deletePost,
            removePost
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Post);
