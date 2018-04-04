// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

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
        const channel = getChannel(state, post.channel_id) || {};
        const teamId = channel.team_id;

        let canAddReaction = true;
        let canRemoveReaction = true;
        if (hasNewPermissions(state)) {
            canAddReaction = haveIChannelPermission(state, {
                team: teamId,
                channel: post.channel_id,
                permission: Permissions.ADD_REACTION,
            });
            canRemoveReaction = haveIChannelPermission(state, {
                team: teamId,
                channel: post.channel_id,
                permission: Permissions.REMOVE_REACTION,
            });
        }

        const currentUserId = getCurrentUserId(state);
        const reactionsForPost = getReactionsForPostSelector(state, ownProps.postId);

        const highlightedReactions = [];
        const reactionsByName = reactionsForPost.reduce((reactions, reaction) => {
            if (reactions.has(reaction.emoji_name)) {
                reactions.get(reaction.emoji_name).push(reaction);
            } else {
                reactions.set(reaction.emoji_name, [reaction]);
            }

            if (reaction.user_id === currentUserId) {
                highlightedReactions.push(reaction.emoji_name);
            }

            return reactions;
        }, new Map());

        return {
            highlightedReactions,
            reactions: reactionsByName,
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
