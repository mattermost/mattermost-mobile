// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {chunk} from 'lodash';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {NativeScrollEvent, NativeSyntheticEvent, SectionList, SectionListData, StyleSheet, View} from 'react-native';
import sectionListGetItemLayout from 'react-native-section-list-get-item-layout';

import {fetchCustomEmojis} from '@actions/remote/custom_emoji';
import {EMOJIS_PER_PAGE} from '@constants/emoji';
import {useServerUrl} from '@context/server';
import {CategoryNames, EmojiIndicesByCategory, CategoryTranslations, CategoryMessage} from '@utils/emoji';
import {fillEmoji} from '@utils/emoji/helpers';

import EmojiSectionBar, {SCROLLVIEW_NATIVE_ID, SectionIconType} from './icons_bar';
import SectionFooter from './section_footer';
import SectionHeader, {SECTION_HEADER_HEIGHT} from './section_header';
import TouchableEmoji from './touchable_emoji';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

export const EMOJI_SIZE = 30;
export const EMOJI_GUTTER = 8;

const ICONS: Record<string, string> = {
    recent: 'clock-outline',
    'smileys-emotion': 'emoticon-happy-outline',
    'people-body': 'eye-outline',
    'animals-nature': 'leaf-outline',
    'food-drink': 'food-apple',
    'travel-places': 'airplane-variant',
    activities: 'basketball',
    objects: 'lightbulb-outline',
    symbols: 'heart-outline',
    flags: 'flag-outline',
    custom: 'emoticon-custom-outline',
};

const categoryToI18n: Record<string, CategoryTranslation> = {};
const getItemLayout = sectionListGetItemLayout({
    getItemHeight: () => (EMOJI_SIZE + (EMOJI_GUTTER * 2)),
    getSectionHeaderHeight: () => SECTION_HEADER_HEIGHT,
});

const styles = StyleSheet.create(({
    row: {
        flexDirection: 'row',
        marginBottom: EMOJI_GUTTER,
    },
    emoji: {
        height: EMOJI_SIZE + EMOJI_GUTTER,
        marginHorizontal: 7,
        width: EMOJI_SIZE + EMOJI_GUTTER,
    },
}));

type Props = {
    customEmojis: CustomEmojiModel[];
    customEmojisEnabled: boolean;
    onEmojiPress: (emoji: string) => void;
    recentEmojis: string[];
    skinTone: string;
    width: number;
}

CategoryNames.forEach((name: string) => {
    if (CategoryTranslations.has(name) && CategoryMessage.has(name)) {
        categoryToI18n[name] = {
            id: CategoryTranslations.get(name)!,
            defaultMessage: CategoryMessage.get(name)!,
            icon: ICONS[name],
        };
    }
});

const EmojiSections = ({customEmojis, customEmojisEnabled, onEmojiPress, recentEmojis, skinTone, width}: Props) => {
    const serverUrl = useServerUrl();
    const list = useRef<SectionList<EmojiSection>>(null);
    const [sectionIndex, setSectionIndex] = useState(0);
    const [customEmojiPage, setCustomEmojiPage] = useState(0);
    const [fetchingCustomEmojis, setFetchingCustomEmojis] = useState(false);
    const [loadedAllCustomEmojis, setLoadedAllCustomEmojis] = useState(false);

    const sections: EmojiSection[] = useMemo(() => {
        if (!width) {
            return [];
        }
        const chunkSize = Math.floor(width / (EMOJI_SIZE + EMOJI_GUTTER));

        return CategoryNames.map((category) => {
            const emojiIndices = EmojiIndicesByCategory.get(skinTone)?.get(category);

            let data: EmojiAlias[][];
            switch (category) {
                case 'custom': {
                    const builtInCustom = emojiIndices.map(fillEmoji);

                    // eslint-disable-next-line max-nested-callbacks
                    const custom = customEmojisEnabled ? customEmojis.map((ce) => ({
                        aliases: [],
                        name: ce.name,
                        short_name: '',
                    })) : [];

                    data = chunk<EmojiAlias>(builtInCustom.concat(custom), chunkSize);
                    break;
                }
                case 'recent':
                    // eslint-disable-next-line max-nested-callbacks
                    data = chunk<EmojiAlias>(recentEmojis.map((emoji) => ({
                        aliases: [],
                        name: emoji,
                        short_name: '',
                    })), chunkSize);
                    break;
                default:
                    data = chunk(emojiIndices.map(fillEmoji), chunkSize);
                    break;
            }

            return {
                ...categoryToI18n[category],
                data,
                key: category,
            };
        }).filter((s: EmojiSection) => s.data.length);
    }, [skinTone, customEmojis, customEmojisEnabled, width]);

    const sectionIcons: SectionIconType[] = useMemo(() => {
        return sections.map((s) => ({
            key: s.key,
            icon: s.icon,
        }));
    }, [sections]);

    const emojiSectionsByOffset = useMemo(() => {
        let lastOffset = 0;
        return sections.map((s) => {
            const start = lastOffset;
            const nextOffset = s.data.length * (EMOJI_SIZE + (EMOJI_GUTTER * 2));
            lastOffset += nextOffset;
            return start;
        });
    }, [sections]);

    const onLoadMoreCustomEmojis = useCallback(async () => {
        if (!customEmojisEnabled || fetchingCustomEmojis || loadedAllCustomEmojis) {
            return;
        }
        setFetchingCustomEmojis(true);
        const {data, error} = await fetchCustomEmojis(serverUrl, customEmojiPage, EMOJIS_PER_PAGE);
        if (data?.length) {
            setCustomEmojiPage(customEmojiPage + 1);
        } else if (!error && (data && data.length < EMOJIS_PER_PAGE)) {
            setLoadedAllCustomEmojis(true);
        }

        setFetchingCustomEmojis(false);
    }, [customEmojiPage, customEmojisEnabled, loadedAllCustomEmojis, fetchingCustomEmojis]);

    const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const {contentOffset} = e.nativeEvent;
        let nextIndex = emojiSectionsByOffset.findIndex(
            (offset) => contentOffset.y <= offset,
        );

        if (nextIndex === -1) {
            nextIndex = emojiSectionsByOffset.length - 1;
        } else if (nextIndex !== 0) {
            nextIndex -= 1;
        }

        if (nextIndex !== sectionIndex) {
            setSectionIndex(nextIndex);
        }
    }, [emojiSectionsByOffset, sectionIndex]);

    const scrollToIndex = (index: number) => {
        list.current?.scrollToLocation({sectionIndex: index, itemIndex: 0, animated: false, viewOffset: 0});
        setSectionIndex(index);
    };

    const renderSectionHeader = useCallback(({section}: {section: SectionListData<EmojiAlias[], EmojiSection>}) => {
        return (
            <SectionHeader section={section}/>
        );
    }, []);

    const renderFooter = useMemo(() => {
        return fetchingCustomEmojis ? <SectionFooter/> : null;
    }, [fetchingCustomEmojis]);

    const renderItem = useCallback(({item}) => {
        return (
            <View style={styles.row}>
                {item.map((emoji: EmojiAlias) => {
                    return (
                        <TouchableEmoji
                            key={emoji.name}
                            name={emoji.name}
                            onEmojiPress={onEmojiPress}
                            size={EMOJI_SIZE}
                            style={styles.emoji}
                        />
                    );
                })}
            </View>
        );
    }, []);

    return (
        <>
            <SectionList
                getItemLayout={getItemLayout}
                initialNumToRender={20}
                keyboardDismissMode='interactive'
                keyboardShouldPersistTaps='always'
                ListFooterComponent={renderFooter}
                maxToRenderPerBatch={20}
                nativeID={SCROLLVIEW_NATIVE_ID}
                onEndReached={onLoadMoreCustomEmojis}
                onEndReachedThreshold={2}
                onScroll={onScroll}
                ref={list}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                sections={sections}
                contentContainerStyle={{paddingBottom: 50}}
                windowSize={100}
            />
            <EmojiSectionBar
                currentIndex={sectionIndex}
                scrollToIndex={scrollToIndex}
                sections={sectionIcons}
            />
        </>
    );
};

export default EmojiSections;
