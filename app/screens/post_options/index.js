// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';

import {addReaction} from '@actions/views/emoji';
import {MAX_ALLOWED_REACTIONS} from '@constants/emoji';
import {THREAD} from '@constants/screen';
import {
    deletePost,
    flagPost,
    pinPost,
    unflagPost,
    unpinPost,
    removePost,
    setUnreadPost,
} from '@mm-redux/actions/posts';
import {General, Permissions} from '@mm-redux/constants';
import {makeGetReactionsForPost} from '@mm-redux/selectors/entities/posts';
import {getChannel, getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getConfig, getLicense, hasNewPermissions} from '@mm-redux/selectors/entities/general';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {haveIChannelPermission} from '@mm-redux/selectors/entities/roles';
import {getCurrentTeamId, getCurrentTeamUrl} from '@mm-redux/selectors/entities/teams';
import {canEditPost} from '@mm-redux/utils/post_utils';
import {isMinimumServerVersion} from '@mm-redux/utils/helpers';
import {getDimensions} from '@selectors/device';
import {selectEmojisCountFromReactions} from '@selectors/emojis';

import PostOptions from './post_options';

export function makeMapStateToProps() {
    const getReactionsForPostSelector = makeGetReactionsForPost();

    return (state, ownProps) => {
        const post = ownProps.post;
        const channel = getChannel(state, post.channel_id) || {};
        const config = getConfig(state);
        const license = getLicense(state);
        const currentUserId = getCurrentUserId(state);
        const currentTeamId = getCurrentTeamId(state);
        const currentChannelId = getCurrentChannelId(state);
        const reactions = getReactionsForPostSelector(state, post.id);
        const channelIsArchived = channel.delete_at !== 0;
        const {serverVersion} = state.entities.general;

        let canMarkAsUnread = true;
        let canAddReaction = true;
        let canReply = true;
        let canCopyPermalink = true;
        let canCopyText = false;
        let canEdit = false;
        let canEditUntil = -1;
        let {canDelete} = ownProps;
        let canFlag = true;
        let canPin = true;

        let canPost = true;
        if (isMinimumServerVersion(serverVersion, 5, 22)) {
            canPost = haveIChannelPermission(
                state,
                {
                    channel: post.channel_id,
                    team: channel.team_id,
                    permission: Permissions.CREATE_POST,
                    default: true,
                },
            );
        }

        if (hasNewPermissions(state)) {
            canAddReaction = haveIChannelPermission(state, {
                team: currentTeamId,
                channel: post.channel_id,
                permission: Permissions.ADD_REACTION,
                default: true,
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

        if (!canPost) {
            canReply = false;
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

        if (!isMinimumServerVersion(serverVersion, 5, 18) || channelIsArchived) {
            canMarkAsUnread = false;
        }

        return {
            ...getDimensions(state),
            canAddReaction: canAddReaction && selectEmojisCountFromReactions(reactions) < MAX_ALLOWED_REACTIONS,
            canReply,
            canCopyPermalink,
            canCopyText,
            canEdit,
            canEditUntil,
            canDelete,
            canFlag,
            canPin,
            canMarkAsUnread,
            currentTeamUrl: getCurrentTeamUrl(state),
            currentUserId,
            theme: getTheme(state),
        };
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
            setUnreadPost,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(PostOptions);
