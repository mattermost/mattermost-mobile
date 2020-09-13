// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import {intlShape} from 'react-intl';

import {showModal, showModalOverCurrentContext} from '@actions/navigation';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Reaction from './reaction';

export default class Reactions extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            addReaction: PropTypes.func.isRequired,
            removeReaction: PropTypes.func.isRequired,
        }).isRequired,
        canAddReaction: PropTypes.bool,
        canAddMoreReactions: PropTypes.bool,
        canRemoveReaction: PropTypes.bool.isRequired,
        currentUserId: PropTypes.string.isRequired,
        position: PropTypes.oneOf(['right', 'left']),
        postId: PropTypes.string.isRequired,
        reactions: PropTypes.object,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        position: 'right',
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    handleAddReaction = preventDoubleTap(() => {
        const {theme} = this.props;
        const {formatMessage} = this.context.intl;
        const screen = 'AddReaction';
        const title = formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'});

        CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor).then((source) => {
            const passProps = {
                closeButton: source,
                onEmojiPress: this.handleAddReactionToPost,
            };

            showModal(screen, title, passProps);
        });
    });

    handleAddReactionToPost = (emoji) => {
        const {postId} = this.props;
        this.props.actions.addReaction(postId, emoji);
    };

    handleReactionPress = (emoji, remove) => {
        this.onPressDetected = true;
        const {actions, postId} = this.props;
        if (remove && this.props.canRemoveReaction) {
            actions.removeReaction(postId, emoji);
        } else if (!remove && this.props.canAddReaction) {
            actions.addReaction(postId, emoji);
        }

        setTimeout(() => {
            this.onPressDetected = false;
        }, 300);
    };

    showReactionList = () => {
        const {postId} = this.props;

        const screen = 'ReactionList';
        const passProps = {
            postId,
        };

        if (!this.onPressDetected) {
            showModalOverCurrentContext(screen, passProps);
        }
    };

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
        const {position, reactions, canAddMoreReactions, canAddReaction} = this.props;
        const styles = getStyleSheet(this.props.theme);

        if (!reactions) {
            return null;
        }

        let addMoreReactions = null;
        if (canAddReaction && canAddMoreReactions) {
            addMoreReactions = (
                <TouchableWithFeedback
                    key='addReaction'
                    onPress={this.handleAddReaction}
                    style={[styles.reaction]}
                    type={'opacity'}
                >
                    <CompassIcon
                        name='emoticon-plus-outline'
                        size={24}
                        style={styles.addReaction}
                    />
                </TouchableWithFeedback>
            );
        }

        const reactionElements = [];
        switch (position) {
        case 'right':
            reactionElements.push(
                this.renderReactions(),
                addMoreReactions,
            );
            break;
        case 'left':
            reactionElements.push(
                addMoreReactions,
                this.renderReactions(),
            );
            break;
        }

        return (
            <View style={styles.reactionsContainer}>
                {reactionElements}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        addReaction: {
            color: changeOpacity(theme.centerChannelColor, 0.5),
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
        reactionsContainer: {
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignContent: 'flex-start',
        },
    };
});
