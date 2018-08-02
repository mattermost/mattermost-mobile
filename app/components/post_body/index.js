// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {flagPost, unflagPost} from 'mattermost-redux/actions/posts';
import {
    General,
    Posts,
} from 'mattermost-redux/constants';
import {getChannel, canManageChannelMembers, getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {hasNewPermissions, getConfig, getLicense} from 'mattermost-redux/selectors/entities/general';
import {haveIChannelPermission} from 'mattermost-redux/selectors/entities/roles';
import {getCurrentUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import Permissions from 'mattermost-redux/constants/permissions';

import {
    isEdited,
    isPostEphemeral,
    isSystemMessage,
    canEditPost,
    canDeletePost,
} from 'mattermost-redux/utils/post_utils';
import {isAdmin as checkIsAdmin, isSystemAdmin as checkIsSystemAdmin} from 'mattermost-redux/utils/user_utils';

import PostBody from './post_body';

const POST_TIMEOUT = 20000;

function mapStateToProps(state, ownProps) {
    const post = getPost(state, ownProps.postId) || {};
    const channel = getChannel(state, post.channel_id) || {};
    const channelIsArchived = channel ? channel.delete_at !== 0 : false;
    const teamId = channel.team_id;

    let canAddReaction = true;
    if (hasNewPermissions(state)) {
        canAddReaction = haveIChannelPermission(state, {
            team: teamId,
            channel: post.channel_id,
            permission: Permissions.ADD_REACTION,
        });
    }

    let isFailed = post.failed;
    let isPending = post.id === post.pending_post_id;
    if (isPending && Date.now() - post.create_at > POST_TIMEOUT) {
        // Something has prevented the post from being set to failed, so it's safe to assume
        // that it has actually failed by this point
        isFailed = true;
        isPending = false;
    }

    const isUserCanManageMembers = canManageChannelMembers(state);
    const isEphemeralPost = isPostEphemeral(post);

    const config = getConfig(state);
    const license = getLicense(state);
    const currentUserId = getCurrentUserId(state);
    const currentTeamId = getCurrentTeamId(state);
    const currentChannelId = getCurrentChannelId(state);
    const roles = getCurrentUserId(state) ? getCurrentUserRoles(state) : '';
    const isAdmin = checkIsAdmin(roles);
    const isSystemAdmin = checkIsSystemAdmin(roles);
    let canDelete = false;
    let canEdit = false;
    if (post) {
        if (!channelIsArchived) {
            canDelete = canDeletePost(state, config, license, currentTeamId, currentChannelId, currentUserId, post, isAdmin, isSystemAdmin);
            canEdit = canEditPost(state, config, license, currentTeamId, currentChannelId, currentUserId, post);
        }
    }

    let isPostAddChannelMember = false;
    if (
        channel &&
        (channel.type === General.PRIVATE_CHANNEL || channel.type === General.OPEN_CHANNEL) &&
        isUserCanManageMembers &&
        isEphemeralPost &&
        post.props &&
        post.props.add_channel_member
    ) {
        isPostAddChannelMember = true;
    }

    return {
        postProps: post.props || {},
        postType: post.type || '',
        fileIds: post.file_ids,
        hasBeenDeleted: post.state === Posts.POST_DELETED,
        hasBeenEdited: isEdited(post),
        hasReactions: post.has_reactions,
        isFailed,
        isPending,
        isPostAddChannelMember,
        isPostEphemeral: isEphemeralPost,
        isSystemMessage: isSystemMessage(post),
        message: post.message,
        theme: getTheme(state),
        canAddReaction,
        canDelete,
        canEdit,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            flagPost,
            unflagPost,
        }, dispatch),
    };
}

export default connect(mapStateToProps, mapDispatchToProps, null, {withRef: true})(PostBody);
