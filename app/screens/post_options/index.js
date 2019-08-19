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
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {haveIChannelPermission} from 'mattermost-redux/selectors/entities/roles';
import {getCurrentTeamId, getCurrentTeamUrl} from 'mattermost-redux/selectors/entities/teams';
import {canEditPost} from 'mattermost-redux/utils/post_utils';

import {THREAD} from 'app/constants/screen';
import {dismissModal, showModal} from 'app/actions/navigation';
import {addReaction} from 'app/actions/views/emoji';
import {getDimensions, isLandscape} from 'app/selectors/device';

import PostOptions from './post_options';

export function mapStateToProps(state, ownProps) {
    const post = ownProps.post;
    const channel = getChannel(state, post.channel_id) || {};
    const config = getConfig(state);
    const license = getLicense(state);
    const currentUserId = getCurrentUserId(state);
    const currentTeamId = getCurrentTeamId(state);
    const currentChannelId = getCurrentChannelId(state);

    const channelIsArchived = channel.delete_at !== 0;

    let canAddReaction = true;
    let canReply = true;
    let canCopyPermalink = true;
    let canCopyText = false;
    let canEdit = false;
    let canEditUntil = -1;
    let {canDelete} = ownProps;
    let canFlag = true;
    let canPin = true;

    if (hasNewPermissions(state)) {
        canAddReaction = haveIChannelPermission(state, {
            team: currentTeamId,
            channel: post.channel_id,
            permission: Permissions.ADD_REACTION,
        });
    }

    if (ownProps.location === THREAD) {
        canReply = false;
    }

    if (channelIsArchived || ownProps.channelIsReadOnly) {
        canAddReaction = false;
        canReply = false;
        canDelete = false;
        canPin = false;
    } else {
        canEdit = canEditPost(state, config, license, currentTeamId, currentChannelId, currentUserId, post);
        if (canEdit && license.IsLicensed === 'true' &&
            (config.AllowEditPost === General.ALLOW_EDIT_POST_TIME_LIMIT || (config.PostEditTimeLimit !== -1 && config.PostEditTimeLimit !== '-1'))
        ) {
            canEditUntil = post.create_at + (config.PostEditTimeLimit * 1000);
        }
    }

    if (ownProps.isSystemMessage) {
        canAddReaction = false;
        canReply = false;
        canCopyPermalink = false;
        canEdit = false;
        canPin = false;
        canFlag = false;
    }
    if (ownProps.hasBeenDeleted) {
        canDelete = false;
    }

    if (!ownProps.showAddReaction) {
        canAddReaction = false;
    }

    if (!ownProps.isSystemMessage && ownProps.managedConfig?.copyAndPasteProtection !== 'true' && post.message) {
        canCopyText = true;
    }

    return {
        ...getDimensions(state),
        canAddReaction,
        canReply,
        canCopyPermalink,
        canCopyText,
        canEdit,
        canEditUntil,
        canDelete,
        canFlag,
        canPin,
        currentTeamUrl: getCurrentTeamUrl(state),
        isMyPost: currentUserId === post.user_id,
        theme: getTheme(state),
        isLandscape: isLandscape(state),
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
            dismissModal,
            showModal,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(PostOptions);
