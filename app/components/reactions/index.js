// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {addReaction, getReactionsForPost, removeReaction} from 'mattermost-redux/actions/posts';
import {makeGetReactionsForPost} from 'mattermost-redux/selectors/entities/posts';

import {getTheme} from 'app/selectors/preferences';

import Reactions from './reactions';

const getReactionsForPostSelector = makeGetReactionsForPost();

function mapStateToProps(state, ownProps) {
    const currentUserId = state.entities.users.currentUserId;
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
        theme: getTheme(state)
    };
}

function mapDispatchToProps(dispatch) {
    return {
        actions: bindActionCreators({
            addReaction,
            getReactionsForPost,
            removeReaction
        }, dispatch)
    };
}

export default connect(mapStateToProps, mapDispatchToProps)(Reactions);
