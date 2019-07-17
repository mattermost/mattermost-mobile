// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import {intlShape} from 'react-intl';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import addReactionIcon from 'assets/images/icons/reaction.png';

import Reaction from './reaction';

export default class Reactions extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addReaction: PropTypes.func.isRequired,
            getReactionsForPost: PropTypes.func.isRequired,
            removeReaction: PropTypes.func.isRequired,
            showModal: PropTypes.func.isRequired,
            showModalOverCurrentContext: PropTypes.func.isRequired,
        }).isRequired,
        currentUserId: PropTypes.string.isRequired,
        position: PropTypes.oneOf(['right', 'left']),
        postId: PropTypes.string.isRequired,
        reactions: PropTypes.object,
        theme: PropTypes.object.isRequired,
        canAddReaction: PropTypes.bool,
        canRemoveReaction: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        position: 'right',
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    componentDidMount() {
        const {actions, postId, reactions} = this.props;
        if (!reactions) {
            actions.getReactionsForPost(postId);
        }
    }

    handleAddReaction = preventDoubleTap(() => {
        const {actions, theme} = this.props;
        const {formatMessage} = this.context.intl;
        const screen = 'AddReaction';
        const title = formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'});

        MaterialIcon.getImageSource('close', 20, theme.sidebarHeaderTextColor).then((source) => {
            const passProps = {
                closeButton: source,
                onEmojiPress: this.handleAddReactionToPost,
            };

            actions.showModal(screen, title, passProps);
        });
    });

    handleAddReactionToPost = (emoji) => {
        const {postId} = this.props;
        this.props.actions.addReaction(postId, emoji);
    };

    handleReactionPress = (emoji, remove) => {
        const {actions, postId} = this.props;
        if (remove && this.props.canRemoveReaction) {
            actions.removeReaction(postId, emoji);
        } else if (!remove && this.props.canAddReaction) {
            actions.addReaction(postId, emoji);
        }
    };

    showReactionList = () => {
        const {actions, postId} = this.props;

        const screen = 'ReactionList';
        const passProps = {
            postId,
        };

        actions.showModalOverCurrentContext(screen, passProps);
    }

    renderReactions = () => {
        const {currentUserId, reactions, theme, postId} = this.props;
        const highlightedReactions = [];
        const reactionsByName = Object.values(reactions).reduce((acc, reaction) => {
            if (acc.has(reaction.emoji_name)) {
                acc.get(reaction.emoji_name).push(reaction);
            } else {
                acc.set(reaction.emoji_name, [reaction]);
            }

            if (reaction.user_id === currentUserId) {
                highlightedReactions.push(reaction.emoji_name);
            }

            return acc;
        }, new Map());

        return Array.from(reactionsByName.keys()).map((r) => {
            return (
                <Reaction
                    key={r}
                    count={reactionsByName.get(r).length}
                    emojiName={r}
                    highlight={highlightedReactions.includes(r)}
                    onPress={this.handleReactionPress}
                    onLongPress={this.showReactionList}
                    postId={postId}
                    theme={theme}
                />
            );
        });
    };

    render() {
        const {position, reactions, canAddReaction} = this.props;
        const styles = getStyleSheet(this.props.theme);

        if (!reactions) {
            return null;
        }

        let addMoreReactions = null;
        if (canAddReaction) {
            addMoreReactions = (
                <TouchableOpacity
                    key='addReaction'
                    onPress={this.handleAddReaction}
                    style={[styles.reaction]}
                >
                    <Image
                        source={addReactionIcon}
                        style={styles.addReaction}
                    />
                </TouchableOpacity>
            );
        }

        const reactionElements = [];
        switch (position) {
        case 'right':
            reactionElements.push(
                this.renderReactions(),
                addMoreReactions
            );
            break;
        case 'left':
            reactionElements.push(
                addMoreReactions,
                this.renderReactions()
            );
            break;
        }

        return (
            <ScrollView
                alwaysBounceHorizontal={false}
                horizontal={true}
                overScrollMode='never'
                keyboardShouldPersistTaps={'always'}
            >
                {reactionElements}
            </ScrollView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        addReaction: {
            tintColor: changeOpacity(theme.centerChannelColor, 0.5),
            width: 23,
            height: 20,
        },
        reaction: {
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
            borderColor: changeOpacity(theme.centerChannelColor, 0.3),
            borderWidth: 1,
            flexDirection: 'row',
            height: 30,
            marginRight: 6,
            marginBottom: 5,
            marginTop: 10,
            paddingVertical: 2,
            paddingHorizontal: 6,
            width: 40,
        },
    };
});
