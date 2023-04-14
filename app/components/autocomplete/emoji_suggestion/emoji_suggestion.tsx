// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Fuse from 'fuse.js';
import {debounce} from 'lodash';
import React, {useCallback, useEffect, useMemo} from 'react';
import {FlatList, Platform, type StyleProp, Text, View, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {searchCustomEmojis} from '@actions/remote/custom_emoji';
import {handleReactionToLatestPost} from '@actions/remote/reactions';
import Emoji from '@components/emoji';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {getEmojiByName, getEmojis, searchEmojis} from '@utils/emoji/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

const EMOJI_REGEX = /(^|\s|^\+|^-)(:([^:\s]*))$/i;
const EMOJI_REGEX_WITHOUT_PREFIX = /\B(:([^:\s]*))$/i;
const REACTION_REGEX = /^(\+|-):([^:\s]+)$/;
const FUSE_OPTIONS = {
    findAllMatches: true,
    ignoreLocation: true,
    includeMatches: true,
    shouldSort: false,
    includeScore: true,
};

const EMOJI_SIZE = 24;
const MIN_SEARCH_LENGTH = 2;
const SEARCH_DELAY = 500;

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        emoji: {
            marginRight: 5,
        },
        emojiName: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
        emojiText: {
            color: '#000',
            fontWeight: 'bold',
        },
        listView: {
            paddingTop: 16,
        },
        row: {
            flexDirection: 'row',
            alignItems: 'center',
            overflow: 'hidden',
            paddingBottom: 8,
            height: 40,
        },
    };
});

const keyExtractor = (item: string) => item;

type Props = {
    cursorPosition: number;
    customEmojis: CustomEmojiModel[];
    updateValue: (v: string) => void;
    onShowingChange: (c: boolean) => void;
    rootId?: string;
    value: string;
    nestedScrollEnabled: boolean;
    skinTone: string;
    hasFilesAttached?: boolean;
    inPost: boolean;
    listStyle: StyleProp<ViewStyle>;
}
const EmojiSuggestion = ({
    cursorPosition,
    customEmojis = [],
    updateValue,
    onShowingChange,
    rootId,
    value,
    nestedScrollEnabled,
    skinTone,
    hasFilesAttached = false,
    inPost,
    listStyle,
}: Props) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const serverUrl = useServerUrl();

    const containerStyle = useMemo(() =>
        ({paddingBottom: insets.bottom + 12})
    , [insets.bottom]);

    const emojis = useMemo(() => getEmojis(skinTone, customEmojis), [skinTone, customEmojis]);

    const searchTerm = useMemo(() => {
        const match = value.substring(0, cursorPosition).match(EMOJI_REGEX);
        return match?.[3] || '';
    }, [value, cursorPosition]);

    const fuse = useMemo(() => {
        return new Fuse(emojis, FUSE_OPTIONS);
    }, [emojis]);

    const data = useMemo(() => {
        if (searchTerm.length < MIN_SEARCH_LENGTH) {
            return [];
        }

        return searchEmojis(fuse, searchTerm);
    }, [fuse, searchTerm]);

    const showingElements = Boolean(data.length);

    const completeSuggestion = useCallback((emoji: string) => {
        if (!hasFilesAttached && inPost) {
            const match = value.match(REACTION_REGEX);
            if (match) {
                handleReactionToLatestPost(serverUrl, emoji, match[1] === '+', rootId);
                updateValue('');
                return;
            }
        }

        // We are going to set a double : on iOS to prevent the auto correct from taking over and replacing it
        // with the wrong value, this is a hack but I could not found another way to solve it
        let completedDraft: string;
        let prefix = ':';
        if (Platform.OS === 'ios') {
            prefix = '::';
        }

        const emojiPart = value.substring(0, cursorPosition);
        const emojiData = getEmojiByName(emoji, customEmojis);
        if (emojiData?.image && emojiData.category !== 'custom') {
            const codeArray: string[] = emojiData.image.split('-');
            const code = codeArray.reduce((acc, c) => {
                return acc + String.fromCodePoint(parseInt(c, 16));
            }, '');
            completedDraft = emojiPart.replace(EMOJI_REGEX_WITHOUT_PREFIX, `${code} `);
        } else {
            completedDraft = emojiPart.replace(EMOJI_REGEX_WITHOUT_PREFIX, `${prefix}${emoji}: `);
        }

        if (value.length > cursorPosition) {
            completedDraft += value.substring(cursorPosition);
        }

        updateValue(completedDraft);

        if (Platform.OS === 'ios' && (!emojiData?.filename || emojiData.category !== 'custom')) {
            // This is the second part of the hack were we replace the double : with just one
            // after the auto correct vanished
            setTimeout(() => {
                updateValue(completedDraft.replace(`::${emoji}: `, `:${emoji}: `));
            });
        }
    }, [value, updateValue, rootId, cursorPosition, hasFilesAttached]);

    const renderItem = useCallback(({item}: {item: string}) => {
        const completeItemSuggestion = () => completeSuggestion(item);
        const emojiSuggestionItemTestId = `autocomplete.emoji_suggestion_item.${item}`;

        return (
            <TouchableWithFeedback
                onPress={completeItemSuggestion}
                underlayColor={changeOpacity(theme.buttonBg, 0.08)}
                type={'native'}
            >
                <View style={style.row}>
                    <View style={style.emoji}>
                        <Emoji
                            emojiName={item}
                            textStyle={style.emojiText}
                            size={EMOJI_SIZE}
                            testID={emojiSuggestionItemTestId}
                        />
                    </View>
                    <Text
                        style={style.emojiName}
                        testID={`${emojiSuggestionItemTestId}.name`}
                    >
                        {`:${item}:`}
                    </Text>
                </View>
            </TouchableWithFeedback>
        );
    }, [completeSuggestion, theme.buttonBg, style]);

    useEffect(() => {
        onShowingChange(showingElements);
    }, [showingElements]);

    useEffect(() => {
        const search = debounce(() => searchCustomEmojis(serverUrl, searchTerm), SEARCH_DELAY);
        if (searchTerm.length >= MIN_SEARCH_LENGTH) {
            search();
        }

        return () => {
            search.cancel();
        };
    }, [searchTerm]);

    if (!data.length) {
        return null;
    }

    return (
        <FlatList
            keyboardShouldPersistTaps='always'
            style={[style.listView, listStyle]}
            data={data}
            keyExtractor={keyExtractor}
            removeClippedSubviews={true}
            renderItem={renderItem}
            nestedScrollEnabled={nestedScrollEnabled}
            contentContainerStyle={containerStyle}
            testID='autocomplete.emoji_suggestion.flat_list'
        />
    );
};

export default EmojiSuggestion;
