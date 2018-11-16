// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {General, Posts} from 'mattermost-redux/constants';
import {getChannel, canManageChannelMembers, getCurrentChannelId} from 'mattermost-redux/selectors/entities/channels';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getConfig, getLicense} from 'mattermost-redux/selectors/entities/general';
import {getCurrentUserId, getCurrentUserRoles} from 'mattermost-redux/selectors/entities/users';
import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';
import {getCustomEmojisByName} from 'mattermost-redux/selectors/entities/emojis';

import {
    isEdited,
    isPostEphemeral,
    isSystemMessage,
    canDeletePost,
} from 'mattermost-redux/utils/post_utils';
import {isAdmin as checkIsAdmin, isSystemAdmin as checkIsSystemAdmin} from 'mattermost-redux/utils/user_utils';

import {shouldRenderJumboEmoji} from 'app/utils/emoji_utils';

import PostBody from './post_body';

const POST_TIMEOUT = 20000;

function mapStateToProps(state, ownProps) {
    const post = getPost(state, ownProps.postId) || {};
    const channel = getChannel(state, post.channel_id) || {};

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

    if (post && !ownProps.channelIsArchived) {
        canDelete = canDeletePost(state, config, license, currentTeamId, currentChannelId, currentUserId, post, isAdmin, isSystemAdmin);
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

    const customEmojis = getCustomEmojisByName(state);

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
        shouldRenderJumboEmoji: shouldRenderJumboEmoji(post.message, customEmojis),
        theme: getTheme(state),
        canDelete,
    };
}

export default connect(mapStateToProps, null, null, {withRef: true})(PostBody);
