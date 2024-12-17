// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, TouchableOpacity} from 'react-native';

import {addReaction, removeReaction, toggleReaction} from '@actions/remote/reactions';
import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {MAX_ALLOWED_REACTIONS} from '@constants/emoji';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {bottomSheetModalOptions, openAsBottomSheet, showModal, showModalOverCurrentContext} from '@screens/navigation';
import {getEmojiFirstAlias} from '@utils/emoji/helpers';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import Reaction from './reaction';

import type ReactionModel from '@typings/database/models/servers/reaction';

type ReactionsProps = {
    canAddReaction: boolean;
    canRemoveReaction: boolean;
    disabled: boolean;
    currentUserId: string;
    location: string;
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
            borderRadius: 4,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            flexDirection: 'row',
            height: 32,
            marginBottom: 12,
            marginRight: 6,
            paddingVertical: 4,
            paddingHorizontal: 6,
            width: 36,
        },
    };
});

const Reactions = ({currentUserId, canAddReaction, canRemoveReaction, disabled, location, postId, reactions, theme}: ReactionsProps) => {
    const {formatMessage} = useIntl();
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const pressed = useRef(false);
    const [sortedReactions, setSortedReactions] = useState(new Set(reactions.map((r) => getEmojiFirstAlias(r.emojiName))));
    const styles = getStyleSheet(theme);

    useDidUpdate(() => {
        // This helps keep the reactions in the same position at all times until unmounted
        const rs = reactions.map((r) => getEmojiFirstAlias(r.emojiName));
        const sorted = new Set([...sortedReactions]);
        const added = rs.filter((r) => !sorted.has(r));
        added.forEach(sorted.add, sorted);
        const removed = [...sorted].filter((s) => !rs.includes(s));
        removed.forEach(sorted.delete, sorted);
        setSortedReactions(sorted);
    }, [reactions]);

    const buildReactionsMap = useCallback(() => {
        const highlightedReactions: string[] = [];

        const reactionsByName = reactions.reduce((acc, reaction) => {
            if (reaction) {
                const emojiAlias = getEmojiFirstAlias(reaction.emojiName);
                if (acc.has(emojiAlias)) {
                    const rs = acc.get(emojiAlias)!;
                    // eslint-disable-next-line max-nested-callbacks
                    const present = rs.findIndex((r) => r.userId === reaction.userId) > -1;
                    if (!present) {
                        rs.push(reaction);
                    }
                } else {
                    acc.set(emojiAlias, [reaction]);
                }

                if (reaction.userId === currentUserId) {
                    highlightedReactions.push(emojiAlias);
                }
            }

            return acc;
        }, new Map<string, ReactionModel[]>());

        return {reactionsByName, highlightedReactions};
    }, [reactions, currentUserId]);

    const handleToggleReactionToPost = (emoji: string) => {
        toggleReaction(serverUrl, postId, emoji);
    };

    const handleAddReaction = useCallback(preventDoubleTap(() => {
        openAsBottomSheet({
            closeButtonId: 'close-add-reaction',
            screen: Screens.EMOJI_PICKER,
            theme,
            title: formatMessage({id: 'mobile.post_info.add_reaction', defaultMessage: 'Add Reaction'}),
            props: {onEmojiPress: handleToggleReactionToPost},
        });
    }), [formatMessage, theme]);

    const handleReactionPress = useCallback(async (emoji: string, remove: boolean) => {
        pressed.current = true;
        if (remove && canRemoveReaction && !disabled) {
            await removeReaction(serverUrl, postId, emoji);
        } else if (!remove && canAddReaction && !disabled) {
            await addReaction(serverUrl, postId, emoji);
        }

        pressed.current = false;
    }, [canRemoveReaction, canAddReaction, disabled]);

    const showReactionList = useCallback((initialEmoji: string) => {
        const screen = Screens.REACTIONS;
        const passProps = {
            initialEmoji,
            location,
            postId,
        };

        Keyboard.dismiss();
        const title = isTablet ? formatMessage({id: 'post.reactions.title', defaultMessage: 'Reactions'}) : '';

        if (!pressed.current) {
            if (isTablet) {
                showModal(screen, title, passProps, bottomSheetModalOptions(theme, 'close-post-reactions'));
            } else {
                showModalOverCurrentContext(screen, passProps, bottomSheetModalOptions(theme));
            }
        }
    }, [formatMessage, isTablet, location, postId, theme]);

    let addMoreReactions = null;
    const {reactionsByName, highlightedReactions} = buildReactionsMap();
    if (!disabled && canAddReaction && reactionsByName.size < MAX_ALLOWED_REACTIONS) {
        addMoreReactions = (
            <TouchableOpacity
                key='addReaction'
                onPress={handleAddReaction}
                style={styles.reaction}
            >
                <CompassIcon
                    name='emoticon-plus-outline'
                    size={24}
                    style={styles.addReaction}
                />
            </TouchableOpacity>
        );
    }

    return (
        <>
            {
                Array.from(sortedReactions).map((r) => {
                    const reaction = reactionsByName.get(r);
                    return (
                        <Reaction
                            key={r}
                            count={reaction?.length || 1}
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
        </>
    );
};

export default Reactions;
