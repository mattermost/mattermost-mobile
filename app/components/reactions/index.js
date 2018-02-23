// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';

import {getReactionsForPost, removeReaction} from 'mattermost-redux/actions/posts';
import {makeGetReactionsForPost} from 'mattermost-redux/selectors/entities/posts';
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import {addReaction} from 'app/actions/views/emoji';

import Reactions from './reactions';

function makeMapStateToProps() {
    const getReactionsForPostSelector = makeGetReactionsForPost();
    return function mapStateToProps(state, ownProps) {
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
