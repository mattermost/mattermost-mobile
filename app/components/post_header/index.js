// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';

import {Preferences} from 'mattermost-redux/constants';
import {getPost, makeGetCommentCountForPost} from 'mattermost-redux/selectors/entities/posts';
import {getBool, getTeammateNameDisplaySetting, getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getUser} from 'mattermost-redux/selectors/entities/users';
import {isPostPendingOrFailed, isSystemMessage} from 'mattermost-redux/utils/post_utils';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import PostHeader from './post_header';

function makeMapStateToProps() {
    const getCommentCountForPost = makeGetCommentCountForPost();
    return function mapStateToProps(state, ownProps) {
        const {config} = state.entities.general;
        const post = getPost(state, ownProps.postId);
        const commentedOnUser = getUser(state, ownProps.commentedOnUserId);
        const user = getUser(state, post.user_id) || {};
        const teammateNameDisplay = getTeammateNameDisplaySetting(state);
        const militaryTime = getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time');

        return {
            commentedOnDisplayName: displayUsername(commentedOnUser, teammateNameDisplay),
            commentCount: getCommentCountForPost(state, {post}),
            createAt: post.create_at,
            displayName: displayUsername(user, teammateNameDisplay),
            enablePostUsernameOverride: config.EnablePostUsernameOverride === 'true',
            fromWebHook: post.props && post.props.from_webhook === 'true',
            militaryTime,
            isPendingOrFailedPost: isPostPendingOrFailed(post),
            isSystemMessage: isSystemMessage(post),
            overrideUsername: post.props && post.props.override_username,
            theme: getTheme(state),
            username: user.username,
        };
    };
}

export default connect(makeMapStateToProps)(PostHeader);
