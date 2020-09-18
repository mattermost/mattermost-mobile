// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {Client4} from '@mm-redux/client';
import {General} from '@mm-redux/constants';
import {getChannel} from '@mm-redux/selectors/entities/channels';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {getPost} from '@mm-redux/selectors/entities/posts';
import {getCurrentUserId, getUser} from '@mm-redux/selectors/entities/users';
import {getTeammateNameDisplaySetting} from '@mm-redux/selectors/entities/preferences';
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
    const ownPost = post?.user_id === currentUserId;
    let avatarUri;
    let channelName;
    let displayName;
    let isDirectChannel = false;

    if (post) {
        const user = getUser(state, post?.user_id);
        const channel = getChannel(state, post.channel_id);
        const teammateNameDisplay = getTeammateNameDisplaySetting(state);

        displayName = displayUsername(user, teammateNameDisplay || '');
        if (isFromWebhook(post) && post?.props?.override_username && config.EnablePostUsernameOverride === 'true') {
            displayName = post.props.override_username;
        }

        avatarUri = Client4.getProfilePictureUrl(user.id, user.last_picture_update);
        if (config.EnablePostIconOverride === 'true' && post?.props?.use_user_icon !== 'true' && post?.props?.override_icon_url) {
            avatarUri = Client4.getAbsoluteUrl(post.props.override_icon_url);
        }

        isDirectChannel = [General.DM_CHANNEL, General.GM_CHANNEL].includes(channel.type);
        channelName = channel.display_name;
    }

    return {
        avatarUri,
        channelName,
        isDirectChannel,
        displayName,
        isLandscape: isLandscape(state),
        ownPost,
    };
}

export default connect(mapStateToProps)(Summary);