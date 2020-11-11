// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';

import {General, Posts} from '@mm-redux/constants';
import {getChannel, canManageChannelMembers, getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getConfig, getLicense} from '@mm-redux/selectors/entities/general';
import {getCurrentUserId, getCurrentUserRoles, getUser} from '@mm-redux/selectors/entities/users';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getCustomEmojisByName} from '@mm-redux/selectors/entities/emojis';
import {makeGetReactionsForPost} from '@mm-redux/selectors/entities/posts';
import {memoizeResult} from '@mm-redux/utils/helpers';
import {makeGetMentionKeysForPost} from '@mm-redux/selectors/entities/search';

import {
    isEdited,
    isPostEphemeral,
    isSystemMessage,
    canDeletePost,
} from '@mm-redux/utils/post_utils';
import {isAdmin as checkIsAdmin, isSystemAdmin as checkIsSystemAdmin} from '@mm-redux/utils/user_utils';

import {getDimensions} from 'app/selectors/device';

import {hasEmojisOnly} from 'app/utils/emoji_utils';

import PostBody from './post_body';

const POST_TIMEOUT = 20000;

export function makeMapStateToProps() {
    const memoizeHasEmojisOnly = memoizeResult((message, customEmojis) => hasEmojisOnly(message, customEmojis));
    const getReactionsForPost = makeGetReactionsForPost();
    const getMentionKeysForPost = makeGetMentionKeysForPost();

    return (state, ownProps) => {
        const post = ownProps.post;
        const channel = getChannel(state, post.channel_id) || {};
        const reactions = getReactionsForPost(state, post.id);

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
        const channelIsArchived = channel?.delete_at !== 0; //eslint-disable-line camelcase
        let canDelete = false;

        if (post && !channelIsArchived) {
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
        const {isEmojiOnly, shouldRenderJumboEmoji} = memoizeHasEmojisOnly(post.message, customEmojis);
        const systemMessage = isSystemMessage(post);
        const postProps = post.props || {};
        if (systemMessage && !postProps.username) {
            const owner = getUser(state, post.user_id);
            postProps.username = owner?.username || '';
        }

        // Disable group highlight when post is pending
        if (post.id === post.pending_post_id) {
            postProps.disable_group_highlight = true;
        }

        return {
            metadata: post.metadata,
            postProps,
            postType: post.type || '',
            fileIds: post.file_ids,
            hasBeenDeleted: post.state === Posts.POST_DELETED,
            hasBeenEdited: isEdited(post),
            hasReactions: (reactions && Object.keys(reactions).length > 0) || Boolean(post.has_reactions),
            isFailed,
            isPending,
            isPostAddChannelMember,
            isPostEphemeral: isEphemeralPost,
            isSystemMessage: systemMessage,
            message: post.message,
            isEmojiOnly,
            shouldRenderJumboEmoji,
            theme: getTheme(state),
            mentionKeys: getMentionKeysForPost(state, channel, postProps?.disable_group_highlight, postProps?.mentionHighlightDisabled),
            canDelete,
            ...getDimensions(state),
        };
    };
}

export default connect(makeMapStateToProps, null, null, {forwardRef: true})(PostBody);
