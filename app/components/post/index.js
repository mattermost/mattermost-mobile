// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {createPost, deletePost, removePost} from 'mattermost-redux/actions/posts';
import {getCurrentChannelId, isCurrentChannelReadOnly} from 'mattermost-redux/selectors/entities/channels';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {getMyPreferences, getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeamUrl, getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {canDeletePost, canEditPost, isPostFlagged} from 'mattermost-redux/utils/post_utils';
import {isAdmin as checkIsAdmin, isSystemAdmin as checkIsSystemAdmin} from 'mattermost-redux/utils/user_utils';

import {insertToDraft, setPostTooltipVisible} from 'app/actions/views/channel';
import {addReaction} from 'app/actions/views/emoji';
import {getDimensions} from 'app/selectors/device';

import Post from './post';

function mapStateToProps(state, ownProps) {
    const post = getPost(state, ownProps.postId);

    const {config, license} = state.entities.general;
    const roles = getCurrentUserId(state) ? getCurrentUserRoles(state) : '';
    const myPreferences = getMyPreferences(state);
    const currentUserId = getCurrentUserId(state);
    const currentTeamId = getCurrentTeamId(state);
    const currentChannelId = getCurrentChannelId(state);

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

    const {deviceWidth} = getDimensions(state);

    const isAdmin = checkIsAdmin(roles);
    const isSystemAdmin = checkIsSystemAdmin(roles);

    let canDelete = false;
    let canEdit = false;
    if (post) {
        canDelete = canDeletePost(state, config, license, currentTeamId, currentChannelId, currentUserId, post, isAdmin, isSystemAdmin);
        canEdit = canEditPost(state, config, license, currentTeamId, currentChannelId, currentUserId, post);
    }

    return {
        channelIsReadOnly: isCurrentChannelReadOnly(state),
        config,
        canDelete,
        canEdit,
        currentTeamUrl: getCurrentTeamUrl(state),
        currentUserId,
        deviceWidth,
        post,
        isFirstReply,
        isLastReply,
        commentedOnPost,
        license,
        theme: getTheme(state),
        isFlagged: isPostFlagged(post.id, myPreferences),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addReaction,
            createPost,
            deletePost,
            removePost,
            setPostTooltipVisible,
            insertToDraft,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Post);
