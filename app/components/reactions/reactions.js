// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    StyleSheet,
    View
} from 'react-native';

import Reaction from './reaction';

export default class Reactions extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addReaction: PropTypes.func.isRequired,
            getReactionsForPost: PropTypes.func.isRequired,
            removeReaction: PropTypes.func.isRequired
        }).isRequired,
        highlightedReactions: PropTypes.array.isRequired,
        postId: PropTypes.string.isRequired,
        reactions: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired
    }

    componentDidMount() {
        const {actions, postId} = this.props;
        actions.getReactionsForPost(postId);
    }

    handleReactionPress = (emoji, remove) => {
        const {actions, postId} = this.props;
        if (remove) {
            actions.removeReaction(postId, emoji);
        } else {
            actions.addReaction(postId, emoji);
        }
    }

    renderReactions = () => {
        const {highlightedReactions, reactions, theme} = this.props;

        return Array.from(reactions.keys()).map((r) => {
            return (
                <Reaction
                    key={r}
                    count={reactions.get(r).length}
                    emojiName={r}
                    highlight={highlightedReactions.includes(r)}
                    onPress={this.handleReactionPress}
                    theme={theme}
                />
            );
        });
    }

    render() {
        return (
            <View style={style.reactions}>
                {this.renderReactions()}
            </View>
        );
    }
}

const style = StyleSheet.create({
    reactions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'flex-start'
    }
});
