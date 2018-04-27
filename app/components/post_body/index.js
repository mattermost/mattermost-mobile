// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {flagPost, unflagPost} from 'mattermost-redux/actions/posts';
import {
    General,
    Posts,
} from 'mattermost-redux/constants';
import {getChannel, canManageChannelMembers} from 'mattermost-redux/selectors/entities/channels';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {hasNewPermissions} from 'mattermost-redux/selectors/entities/general';
import {haveIChannelPermission} from 'mattermost-redux/selectors/entities/roles';
import Permissions from 'mattermost-redux/constants/permissions';

import {
    isEdited,
    isPostEphemeral,
    isSystemMessage,
} from 'mattermost-redux/utils/post_utils';

import PostBody from './post_body';

const POST_TIMEOUT = 20000;

function mapStateToProps(state, ownProps) {
    const post = getPost(state, ownProps.postId);
    const channel = getChannel(state, post.channel_id) || {};
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
