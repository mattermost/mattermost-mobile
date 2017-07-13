// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {createPost, deletePost, flagPost, removePost, unflagPost} from 'mattermost-redux/actions/posts';
import {getMyPreferences, getTeammateNameDisplaySetting} from 'mattermost-redux/selectors/entities/preferences';
import {getPost, makeGetCommentCountForPost} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentUserId, getCurrentUserRoles, getUser} from 'mattermost-redux/selectors/entities/users';
import {isPostFlagged} from 'mattermost-redux/utils/post_utils';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import {setPostTooltipVisible} from 'app/actions/views/channel';
import {getTheme} from 'app/selectors/preferences';

import Post from './post';

function makeMapStateToProps() {
    const getCommentCountForPost = makeGetCommentCountForPost();
    return function mapStateToProps(state, ownProps) {
        const commentedOnUser = ownProps.commentedOnPost ? getUser(state, ownProps.commentedOnPost.user_id) : null;
        const user = getUser(state, ownProps.post.user_id);
        const post = getPost(state, ownProps.post.id);
        const myPreferences = getMyPreferences(state);
        const teammateNameDisplay = getTeammateNameDisplaySetting(state);
        const {config, license} = state.entities.general;
        const roles = getCurrentUserId(state) ? getCurrentUserRoles(state) : '';
        const {tooltipVisible} = state.views.channel;

        return {
            ...ownProps,
            post,
            config,
            commentCount: getCommentCountForPost(state, ownProps),
            commentedOnDisplayName: displayUsername(commentedOnUser, teammateNameDisplay),
            currentUserId: getCurrentUserId(state),
            displayName: displayUsername(user, teammateNameDisplay),
            isFlagged: isPostFlagged(ownProps.post.id, myPreferences),
            license,
            roles,
            theme: getTheme(state),
            tooltipVisible,
            user
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            createPost,
            deletePost,
            flagPost,
            removePost,
            setPostTooltipVisible,
            unflagPost
        }, dispatch)
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(Post);
