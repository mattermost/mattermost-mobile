// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {addReaction} from '@actions/views/emoji';
import {MAX_ALLOWED_REACTIONS} from '@constants/emoji';
import {removeReaction} from '@mm-redux/actions/posts';
import {makeGetReactionsForPost, getPost} from '@mm-redux/selectors/entities/posts';
import {haveIChannelPermission} from '@mm-redux/selectors/entities/roles';
import {hasNewPermissions} from '@mm-redux/selectors/entities/general';
import Permissions from '@mm-redux/constants/permissions';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getChannel, isChannelReadOnlyById} from '@mm-redux/selectors/entities/channels';
import {selectEmojisCountFromReactions} from '@selectors/emojis';

import Reactions from './reactions';

function makeMapStateToProps() {
    const getReactionsForPostSelector = makeGetReactionsForPost();
    return function mapStateToProps(state, ownProps) {
        const post = getPost(state, ownProps.postId);
        const channelId = post ? post.channel_id : '';
        const channel = getChannel(state, channelId) || {};
        const teamId = channel.team_id;
        const channelIsArchived = channel.delete_at !== 0;
        const channelIsReadOnly = isChannelReadOnlyById(state, channelId);

        const currentUserId = getCurrentUserId(state);
        const reactions = getReactionsForPostSelector(state, ownProps.postId);

        let canAddReaction = true;
        let canRemoveReaction = true;
        let canAddMoreReactions = true;
        if (channelIsArchived || channelIsReadOnly) {
            canAddReaction = false;
            canRemoveReaction = false;
            canAddMoreReactions = false;
        } else if (hasNewPermissions(state)) {
            canAddReaction = haveIChannelPermission(state, {
                team: teamId,
                channel: channelId,
                permission: Permissions.ADD_REACTION,
                default: true,
            });

            canAddMoreReactions = selectEmojisCountFromReactions(reactions) < MAX_ALLOWED_REACTIONS;

            canRemoveReaction = haveIChannelPermission(state, {
                team: teamId,
                channel: channelId,
                permission: Permissions.REMOVE_REACTION,
                default: true,
            });
        }

        return {
            currentUserId,
            reactions,
            theme: getTheme(state),
            canAddReaction,
            canAddMoreReactions,
            canRemoveReaction,
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addReaction,
            removeReaction,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(Reactions);
