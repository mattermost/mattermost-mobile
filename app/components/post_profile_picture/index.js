// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {isSystemMessage} from 'mattermost-redux/utils/post_utils';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getConfig} from 'mattermost-redux/selectors/entities/general';

import {fromAutoResponder} from 'app/utils/general';

import PostProfilePicture from './post_profile_picture';

import {getUser} from 'mattermost-redux/selectors/entities/users';

function mapStateToProps(state, ownProps) {
    const config = getConfig(state);
    const post = ownProps.post;
    const user = getUser(state, post.user_id);

    return {
        enablePostIconOverride: config.EnablePostIconOverride === 'true' && post?.props?.use_user_icon !== 'true', // eslint-disable-line camelcase
        fromWebHook: post?.props?.from_webhook === 'true', // eslint-disable-line camelcase
        isSystemMessage: isSystemMessage(post),
        fromAutoResponder: fromAutoResponder(post),
        overrideIconUrl: post?.props?.override_icon_url, // eslint-disable-line camelcase
        userId: post.user_id,
        isBot: (user ? user.is_bot : false),
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(PostProfilePicture);
