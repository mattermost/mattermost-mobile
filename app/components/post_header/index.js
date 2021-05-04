// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {Preferences} from '@mm-redux/constants';
import {makeGetCommentCountForPost} from '@mm-redux/selectors/entities/posts';
import {getBool, getTeammateNameDisplaySetting, getTheme} from '@mm-redux/selectors/entities/preferences';
import {isTimezoneEnabled} from '@mm-redux/selectors/entities/timezone';
import {getUser, getCurrentUser} from '@mm-redux/selectors/entities/users';
import {isPostPendingOrFailed, isSystemMessage, isFromWebhook} from '@mm-redux/utils/post_utils';
import {getUserCurrentTimezone} from '@mm-redux/utils/timezone_utils';
import {displayUsername} from '@mm-redux/utils/user_utils';
import {getConfig} from '@mm-redux/selectors/entities/general';

import {fromAutoResponder} from 'app/utils/general';
import {isGuest} from 'app/utils/users';
import {isLandscape} from 'app/selectors/device';

import PostHeader from './post_header';
import {isCustomStatusEnabled} from '@selectors/custom_status';

function makeMapStateToProps() {
    const getCommentCountForPost = makeGetCommentCountForPost();
    return function mapStateToProps(state, ownProps) {
        const config = getConfig(state);
        const post = ownProps.post;
        const commentedOnPost = ownProps.commentedOnPost;
        const commentedOnUserId = commentedOnPost?.user_id; // eslint-disable-line camelcase
        const commentedOnUser = commentedOnUserId ? getUser(state, commentedOnUserId) : null;
        const user = getUser(state, post.user_id) || {};
        const currentUser = getCurrentUser(state);
        const teammateNameDisplay = getTeammateNameDisplaySetting(state);
        const militaryTime = getBool(state, Preferences.CATEGORY_DISPLAY_SETTINGS, 'use_military_time');
        const enableTimezone = isTimezoneEnabled(state);
        const userTimezone = enableTimezone ? getUserCurrentTimezone(currentUser.timezone) : '';
        let commentedOnDisplayName = '';
        if (commentedOnUserId) {
            if (isFromWebhook(commentedOnPost) && commentedOnPost.props.override_username) {
                commentedOnDisplayName = commentedOnPost.props.override_username;
            } else {
                commentedOnDisplayName = displayUsername(commentedOnUser, teammateNameDisplay);
            }
        }

        return {
            commentedOnDisplayName,
            commentCount: getCommentCountForPost(state, {post}),
            createAt: post.create_at,
            displayName: displayUsername(user, teammateNameDisplay),
            enablePostUsernameOverride: config.EnablePostUsernameOverride === 'true',
            fromWebHook: isFromWebhook(post),
            militaryTime,
            isPendingOrFailedPost: isPostPendingOrFailed(post),
            isSystemMessage: isSystemMessage(post),
            fromAutoResponder: fromAutoResponder(post),
            overrideUsername: post?.props?.override_username, // eslint-disable-line camelcase
            theme: getTheme(state),
            username: user.username,
            isBot: user.is_bot || false,
            isGuest: isGuest(user),
            isLandscape: isLandscape(state),
            userTimezone,
            customStatusEnabled: isCustomStatusEnabled(state),
        };
    };
}

export default connect(makeMapStateToProps)(PostHeader);
