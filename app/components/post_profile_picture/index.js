// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getUser} from 'mattermost-redux/selectors/entities/users';
import {isSystemMessage} from 'mattermost-redux/utils/post_utils';

import {getTheme} from 'app/selectors/preferences';

import PostProfilePicture from './post_profile_picture';

function mapStateToProps(state, ownProps) {
    const {config} = state.entities.general;
    const post = getPost(state, ownProps.postId);
    const user = getUser(state, post.user_id);

    return {
        ...ownProps,
        enablePostIconOverride: config.EnablePostIconOverride === 'true',
        fromWebHook: post.props && post.props.from_webhook === 'true',
        isSystemMessage: isSystemMessage(post),
        overrideIconUrl: post.props && post.props.override_icon_url,
        user,
        theme: getTheme(state)
    };
}

export default connect(mapStateToProps)(PostProfilePicture);
