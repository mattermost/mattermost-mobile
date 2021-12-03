// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useRef} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import {addReaction, removeReaction} from '@actions/remote/reactions';
import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {MAX_ALLOWED_REACTIONS} from '@constants/emoji';
import {useServerUrl} from '@context/server';
import {showModal, showModalOverCurrentContext} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Reaction from './reaction';

import type ReactionModel from '@typings/database/models/servers/reaction';

type ReactionsProps = {
    canAddReaction: boolean;
    canRemoveReaction: boolean;
    disabled: boolean;
    currentUserId: string;
    postId: string;
    reactions: ReactionModel[];
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
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

const Reactions = ({currentUserId, canAddReaction, canRemoveReaction, disabled, postId, reactions, theme}: ReactionsProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const pressed = useRef(false);
    if (!reactions) {
        return null;
    }
    const styles = getStyleSheet(theme);

    const buildReactionsMap = () => {
        const highlightedReactions: string[] = [];

        const reactionsByName = reactions.reduce((acc, reaction) => {
            if (reaction) {
                if (acc.has(reaction.emojiName)) {
                    acc.get(reaction.emojiName)!.push(reaction);
                } else {
                    acc.set(reaction.emojiName, [reaction]);
                }

                if (reaction.userId === currentUserId) {
                    highlightedReactions.push(reaction.emojiName);
                }
            }

            return acc;
        }, new Map<string, ReactionModel[]>());

        return {reactionsByName, highlightedReactions};
    };

    const handleAddReactionToPost = (emoji: string) => {
        addReaction(serverUrl, postId, emoji);
    };

    const handleAddReaction = preventDoubleTap(() => {
        const screen = 'AddReaction';
        const title = intl.formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'});

        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const passProps = {
            closeButton,
            onEmojiPress: handleAddReactionToPost,
        };

        showModal(screen, title, passProps);
    });

    const handleReactionPress = async (emoji: string, remove: boolean) => {
        pressed.current = true;
        if (remove && canRemoveReaction && !disabled) {
            await removeReaction(serverUrl, postId, emoji);
        } else if (!remove && canAddReaction && !disabled) {
            await addReaction(serverUrl, postId, emoji);
        }

        pressed.current = false;
    };

    const showReactionList = () => {
        const screen = 'ReactionList';
        const passProps = {
            postId,
        };

        if (!pressed.current) {
            showModalOverCurrentContext(screen, passProps);
        }
    };

    let addMoreReactions = null;
    const {reactionsByName, highlightedReactions} = buildReactionsMap();
    if (!disabled && canAddReaction && reactionsByName.size < MAX_ALLOWED_REACTIONS) {
        addMoreReactions = (
            <TouchableWithFeedback
                key='addReaction'
                onPress={handleAddReaction}
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

    return (
        <View style={styles.reactionsContainer}>
            {
                Array.from(reactionsByName.keys()).map((r) => {
                    return (
                        <Reaction
                            key={r}
                            count={reactionsByName.get(r)!.length}
                            emojiName={r}
                            highlight={highlightedReactions.includes(r)}
                            onPress={handleReactionPress}
                            onLongPress={showReactionList}
                            theme={theme}
                        />
                    );
                })
            }
            {addMoreReactions}
        </View>
    );
};

export default React.memo(Reactions);
