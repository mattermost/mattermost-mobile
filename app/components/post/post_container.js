// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {deletePost, flagPost, unflagPost} from 'mattermost-redux/actions/posts';
import {getMyPreferences} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {makeGetCommentCountForPost} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentUserId, getCurrentUserRoles, getUser} from 'mattermost-redux/selectors/entities/users';
import {isPostFlagged} from 'mattermost-redux/utils/post_utils';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import {goToUserProfile, openEditPostModal} from 'app/actions/navigation';
import {getTheme} from 'app/selectors/preferences';

import Post from './post';

function makeMapStateToProps() {
    const getCommentCountForPost = makeGetCommentCountForPost();
    return function mapStateToProps(state, ownProps) {
        const commentedOnUser = ownProps.commentedOnPost ? getUser(state, ownProps.commentedOnPost.user_id) : null;
        const user = getUser(state, ownProps.post.user_id);
        const myPreferences = getMyPreferences(state);
        const {config, license} = state.entities.general;

        return {
            ...ownProps,
            config,
            commentCount: getCommentCountForPost(state, ownProps),
            commentedOnDisplayName: displayUsername(commentedOnUser, myPreferences),
            currentTeamId: getCurrentTeamId(state),
            currentUserId: getCurrentUserId(state),
            displayName: displayUsername(user, myPreferences),
            isFlagged: isPostFlagged(ownProps.post.id, myPreferences),
            license,
            roles: getCurrentUserRoles(state),
            theme: getTheme(state),
            user
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            deletePost,
            flagPost,
            goToUserProfile,
            openEditPostModal,
            unflagPost
        }, dispatch)
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(Post);
