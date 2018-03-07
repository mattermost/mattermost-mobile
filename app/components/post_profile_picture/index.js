// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {isSystemMessage} from 'mattermost-redux/utils/post_utils';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import PostProfilePicture from './post_profile_picture';

function mapStateToProps(state, ownProps) {
    const {config} = state.entities.general;
    const post = getPost(state, ownProps.postId);

    return {
        enablePostIconOverride: config.EnablePostIconOverride === 'true',
        fromWebHook: post.props && post.props.from_webhook === 'true',
        isSystemMessage: isSystemMessage(post),
        overrideIconUrl: post.props && post.props.override_icon_url,
        userId: post.user_id,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(PostProfilePicture);
