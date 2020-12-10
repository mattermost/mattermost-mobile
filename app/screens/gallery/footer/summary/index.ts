// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {Client4} from '@mm-redux/client';
import {General} from '@mm-redux/constants';
import {getChannel, getCurrentChannel} from '@mm-redux/selectors/entities/channels';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {getPost} from '@mm-redux/selectors/entities/posts';
import {getCurrentUserId, getUser} from '@mm-redux/selectors/entities/users';
import {getTeammateNameDisplaySetting, getTheme} from '@mm-redux/selectors/entities/preferences';
import {isFromWebhook} from '@mm-redux/utils/post_utils';
import {displayUsername} from '@mm-redux/utils/user_utils';
import {isLandscape} from '@selectors/device';

import type {GlobalState} from '@mm-redux/types/store';
import type {FooterProps} from 'types/screens/gallery';

import Summary from './summary';

function mapStateToProps(state: GlobalState, ownProps: FooterProps) {
    const config = getConfig(state);
    const currentUserId = getCurrentUserId(state);
    const post = getPost(state, ownProps.file.post_id);
    const user = getUser(state, post?.user_id || ownProps.file.user_id);
    const channel = post ? getChannel(state, post.channel_id) : getCurrentChannel(state);
    const ownPost = user?.id === currentUserId;
    const teammateNameDisplay = getTeammateNameDisplaySetting(state);
    const channelName = channel.display_name;
    const isDirectChannel = [General.DM_CHANNEL, General.GM_CHANNEL].includes(channel.type);
    let avatarUri = Client4.getProfilePictureUrl(user.id, user.last_picture_update);
    let displayName = displayUsername(user, teammateNameDisplay || '');

    if (post) {
        if (isFromWebhook(post) && post.props?.override_username && config.EnablePostUsernameOverride === 'true') {
            displayName = post.props.override_username;
        }

        if (config.EnablePostIconOverride === 'true' && post?.props?.use_user_icon !== 'true' && post?.props?.override_icon_url) {
            avatarUri = Client4.getAbsoluteUrl(post.props.override_icon_url);
        }
    }

    return {
        avatarUri,
        channelName,
        isDirectChannel,
        displayName,
        isLandscape: isLandscape(state),
        ownPost,
        theme: getTheme(state),
    };
}

export default connect(mapStateToProps)(Summary);
