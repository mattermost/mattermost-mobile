// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {
    deletePost,
    flagPost,
    pinPost,
    unflagPost,
    unpinPost,
    removePost,
} from 'mattermost-redux/actions/posts';
import {General, Permissions} from 'mattermost-redux/constants';
import {getChannel, getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getConfig, getLicense, hasNewPermissions} from 'mattermost-redux/selectors/entities/general';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {haveIChannelPermission} from 'mattermost-redux/selectors/entities/roles';
import {getCurrentTeamId, getCurrentTeamUrl} from 'mattermost-redux/selectors/entities/teams';
import {canEditPost} from 'mattermost-redux/utils/post_utils';

import {addReaction} from 'app/actions/views/emoji';
import {getDimensions} from 'app/selectors/device';

import PostOptions from './post_options';

function mapStateToProps(state, ownProps) {
    const post = getPost(state, ownProps.postId) || {};
    const channel = getChannel(state, post.channel_id) || {};
    const config = getConfig(state);
    const license = getLicense(state);
    const currentUserId = getCurrentUserId(state);
    const currentTeamId = getCurrentTeamId(state);
    const currentChannelId = getCurrentChannelId(state);

    const channelIsArchived = channel.delete_at !== 0;

    let canAddReaction = true;
    let canEdit = false;
    let canEditUntil = -1;

    if (hasNewPermissions(state)) {
        canAddReaction = haveIChannelPermission(state, {
            team: currentTeamId,
            channel: post.channel_id,
            permission: Permissions.ADD_REACTION,
        });
    }

    if (channelIsArchived) {
        canAddReaction = false;
    } else {
        canEdit = canEditPost(state, config, license, currentTeamId, currentChannelId, currentUserId, post);
        if (canEdit && license.IsLicensed === 'true' &&
            (config.AllowEditPost === General.ALLOW_EDIT_POST_TIME_LIMIT || (config.PostEditTimeLimit !== -1 && config.PostEditTimeLimit !== '-1'))
        ) {
            canEditUntil = post.create_at + (config.PostEditTimeLimit * 1000);
        }
    }

    return {
        ...getDimensions(state),
        canAddReaction,
        canEdit,
        canEditUntil,
        currentTeamUrl: getCurrentTeamUrl(state),
        isMyPost: currentUserId === post.user_id,
        post,
        theme: getTheme(state),
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addReaction,
            deletePost,
            flagPost,
            pinPost,
            removePost,
            unflagPost,
            unpinPost,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(PostOptions);
