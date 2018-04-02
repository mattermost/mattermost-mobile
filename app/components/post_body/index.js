// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {flagPost, unflagPost} from 'mattermost-redux/actions/posts';
import {
    General,
    Posts,
} from 'mattermost-redux/constants';
import {getCurrentChannel, getMyCurrentChannelMembership} from 'mattermost-redux/selectors/entities/channels';
import {getPost} from 'mattermost-redux/selectors/entities/posts';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getCurrentTeamMembership} from 'mattermost-redux/selectors/entities/teams';
import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';

import {canManageMembersOldPermissions} from 'mattermost-redux/utils/channel_utils';
import {
    isEdited,
    isPostEphemeral,
    isSystemMessage,
} from 'mattermost-redux/utils/post_utils';

import PostBody from './post_body';

const POST_TIMEOUT = 20000;

function mapStateToProps(state, ownProps) {
    const post = getPost(state, ownProps.postId);

    let isFailed = post.failed;
    let isPending = post.id === post.pending_post_id;
    if (isPending && Date.now() - post.create_at > POST_TIMEOUT) {
        // Something has prevented the post from being set to failed, so it's safe to assume
        // that it has actually failed by this point
        isFailed = true;
        isPending = false;
    }

    const channel = getCurrentChannel(state);
    const user = getCurrentUser(state);
    const teamMember = getCurrentTeamMembership(state);
    const channelMember = getMyCurrentChannelMembership(state);
    const {config, license} = state.entities.general;
    const isUserCanManageMembers = canManageMembersOldPermissions(channel, user, teamMember, channelMember, config, license);
    const isEphemeralPost = isPostEphemeral(post);

    let isPostAddChannelMember = false;
    if (
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
