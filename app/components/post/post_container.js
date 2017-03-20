// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {goToUserProfile} from 'app/actions/navigation';
import {getTheme} from 'app/selectors/preferences';

import {deletePost} from 'mattermost-redux/actions/posts';
import {getMyPreferences} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUserId, getCurrentUserRoles, getUser} from 'mattermost-redux/selectors/entities/users';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import Post from './post';

function mapStateToProps(state, ownProps) {
    const commentedOnUser = ownProps.commentedOnPost ? getUser(state, ownProps.commentedOnPost.user_id) : null;
    const user = getUser(state, ownProps.post.user_id);
    const myPreferences = getMyPreferences(state);

    return {
        commentedOnDisplayName: displayUsername(commentedOnUser, myPreferences),
        currentTeamId: getCurrentTeamId(state),
        currentUserId: getCurrentUserId(state),
        displayName: displayUsername(user, myPreferences),
        roles: getCurrentUserRoles(state),
        theme: getTheme(state),
        user,
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            deletePost,
            goToUserProfile
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Post);
