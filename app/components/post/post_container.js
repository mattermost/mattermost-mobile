// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getMyPreferences, getTheme} from 'service/selectors/entities/preferences';
import {goToUserProfile} from 'app/actions/navigation';
import {getUser} from 'service/selectors/entities/users';
import {displayUsername} from 'service/utils/user_utils';

import Post from './post';

function mapStateToProps(state, ownProps) {
    const user = getUser(state, ownProps.post.user_id);
    const commentedOnUser = ownProps.commentedOnPost ? getUser(state, ownProps.commentedOnPost.user_id) : null;

    const myPreferences = getMyPreferences(state);

    return {
        user,
        displayName: displayUsername(user, myPreferences),
        commentedOnDisplayName: displayUsername(commentedOnUser, myPreferences),
        theme: getTheme(state),
        ...ownProps
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            goToUserProfile
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Post);
