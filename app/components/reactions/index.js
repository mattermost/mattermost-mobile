// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getReactionsForPost, removeReaction} from 'mattermost-redux/actions/posts';
import {makeGetReactionsForPost, getPost} from 'mattermost-redux/selectors/entities/posts';
import {haveIChannelPermission} from 'mattermost-redux/selectors/entities/roles';
import {hasNewPermissions} from 'mattermost-redux/selectors/entities/general';
import Permissions from 'mattermost-redux/constants/permissions';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';
import {getChannel} from 'mattermost-redux/selectors/entities/channels';

import {addReaction} from 'app/actions/views/emoji';

import Reactions from './reactions';

function makeMapStateToProps() {
    const getReactionsForPostSelector = makeGetReactionsForPost();
    return function mapStateToProps(state, ownProps) {
        const post = getPost(state, ownProps.postId);
        const channelId = post ? post.channel_id : '';
        const channel = getChannel(state, channelId) || {};
        const teamId = channel.team_id;
        const channelIsArchived = channel.delete_at !== 0;

        let canAddReaction = true;
        let canRemoveReaction = true;
        if (channelIsArchived) {
            canAddReaction = false;
            canRemoveReaction = false;
        } else if (hasNewPermissions(state)) {
            canAddReaction = haveIChannelPermission(state, {
                team: teamId,
                channel: channelId,
                permission: Permissions.ADD_REACTION,
            });
            canRemoveReaction = haveIChannelPermission(state, {
                team: teamId,
                channel: channelId,
                permission: Permissions.REMOVE_REACTION,
            });
        }

        const currentUserId = getCurrentUserId(state);
        const reactions = getReactionsForPostSelector(state, ownProps.postId);

        return {
            currentUserId,
            reactions,
            theme: getTheme(state),
            canAddReaction,
            canRemoveReaction,
        };
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addReaction,
            getReactionsForPost,
            removeReaction,
        }, dispatch),
    };
}

export default connect(makeMapStateToProps, mapDispatchToProps)(Reactions);
