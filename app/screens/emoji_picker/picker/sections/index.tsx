// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetSectionList} from '@gorhom/bottom-sheet';
import {chunk} from 'lodash';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {type ListRenderItemInfo, type NativeScrollEvent, type NativeSyntheticEvent, SectionList, type SectionListData, StyleSheet, View} from 'react-native';
import sectionListGetItemLayout from 'react-native-section-list-get-item-layout';

import {fetchCustomEmojis} from '@actions/remote/custom_emoji';
import TouchableEmoji from '@components/touchable_emoji';
import {EMOJIS_PER_PAGE} from '@constants/emoji';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import {setEmojiCategoryBarIcons, setEmojiCategoryBarSection, useEmojiCategoryBar} from '@hooks/emoji_category_bar';
import {CategoryNames, EmojiIndicesByCategory, CategoryTranslations, CategoryMessage} from '@utils/emoji';
import {fillEmoji} from '@utils/emoji/helpers';

import EmojiCategoryBar from '../emoji_category_bar';

import SectionFooter from './section_footer';
import SectionHeader, {SECTION_HEADER_HEIGHT} from './section_header';

import type CustomEmojiModel from '@typings/database/models/servers/custom_emoji';

const EMOJI_SIZE = 34;
const EMOJIS_PER_ROW = 7;
const EMOJIS_PER_ROW_TABLET = 9;
const EMOJI_ROW_MARGIN = 12;

const ICONS: Record<string, string> = {
    recent: 'clock-outline',
    'smileys-emotion': 'emoticon-happy-outline',
    'people-body': 'account-outline',
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
let emojiSectionsByOffset: number[] = [];

const getItemLayout = sectionListGetItemLayout({
    getItemHeight: () => EMOJI_SIZE + EMOJI_ROW_MARGIN,
    getSectionHeaderHeight: () => SECTION_HEADER_HEIGHT,
    sectionOffsetsCallback: (offsetsById) => {
        emojiSectionsByOffset = offsetsById;
    },
});

const styles = StyleSheet.create(({
    flex: {flex: 1},
    contentContainerStyle: {paddingBottom: 50},
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: EMOJI_ROW_MARGIN,
    },
    emoji: {
        height: EMOJI_SIZE,
        width: EMOJI_SIZE,
    },
}));

type Props = {
    customEmojis: CustomEmojiModel[];
    customEmojisEnabled: boolean;
    onEmojiPress: (emoji: string) => void;
    recentEmojis: string[];
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

const emptyEmoji: EmojiAlias = {
    name: '',
    short_name: '',
    aliases: [],
};

const EmojiSections = ({customEmojis, customEmojisEnabled, onEmojiPress, recentEmojis}: Props) => {
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const {currentIndex, selectedIndex} = useEmojiCategoryBar();
    const list = useRef<SectionList<EmojiSection>>(null);
    const categoryIndex = useRef(currentIndex);
    const [customEmojiPage, setCustomEmojiPage] = useState(0);
    const [fetchingCustomEmojis, setFetchingCustomEmojis] = useState(false);
    const [loadedAllCustomEmojis, setLoadedAllCustomEmojis] = useState(false);
    const offset = useRef(0);
    const manualScroll = useRef(false);

    const sections: EmojiSection[] = useMemo(() => {
        const emojisPerRow = isTablet ? EMOJIS_PER_ROW_TABLET : EMOJIS_PER_ROW;

        return CategoryNames.map((category) => {
            const emojiIndices = EmojiIndicesByCategory.get('default')?.get(category);

            let data: EmojiAlias[][];
            switch (category) {
                case 'custom': {
                    const builtInCustom = emojiIndices.map(fillEmoji.bind(null, 'custom'));

                    // eslint-disable-next-line max-nested-callbacks
                    const custom = customEmojisEnabled ? customEmojis.map((ce) => ({
                        aliases: [],
                        name: ce.name,
                        short_name: '',
                    })) : [];

                    data = chunk<EmojiAlias>(builtInCustom.concat(custom), emojisPerRow);
                    break;
                }
                case 'recent':
                    // eslint-disable-next-line max-nested-callbacks
                    data = chunk<EmojiAlias>(recentEmojis.map((emoji) => ({
                        aliases: [],
                        name: emoji,
                        short_name: '',
                    })), EMOJIS_PER_ROW);
                    break;
                default:
                    data = chunk(emojiIndices.map(fillEmoji.bind(null, category)), emojisPerRow);
                    break;
            }

            for (const d of data) {
                if (d.length < emojisPerRow) {
                    d.push(
                        ...(new Array(emojisPerRow - d.length).fill(emptyEmoji)),
                    );
                }
            }

            return {
                ...categoryToI18n[category],
                data,
                key: category,
            };
        }).filter((s: EmojiSection) => s.data.length);
    }, [customEmojis, customEmojisEnabled, isTablet]);

    useEffect(() => {
        setEmojiCategoryBarIcons(sections.map((s) => ({
            key: s.key,
            icon: s.icon,
        })));
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
        const direction = contentOffset.y > offset.current ? 'up' : 'down';
        offset.current = contentOffset.y;

        if (manualScroll.current) {
            return;
        }

        const nextIndex = contentOffset.y >= emojiSectionsByOffset[categoryIndex.current + 1] - SECTION_HEADER_HEIGHT ? categoryIndex.current + 1 : categoryIndex.current;
        const prevIndex = Math.max(0, contentOffset.y <= emojiSectionsByOffset[categoryIndex.current] - SECTION_HEADER_HEIGHT ? categoryIndex.current - 1 : categoryIndex.current);
        if (nextIndex > categoryIndex.current && direction === 'up') {
            categoryIndex.current = nextIndex;
            setEmojiCategoryBarSection(nextIndex);
        } else if (prevIndex < categoryIndex.current && direction === 'down') {
            categoryIndex.current = prevIndex;
            setEmojiCategoryBarSection(prevIndex);
        }
    }, []);

    const scrollToIndex = (index: number) => {
        manualScroll.current = true;
        list.current?.scrollToLocation({sectionIndex: index, itemIndex: 0, animated: false, viewOffset: 0});
        setEmojiCategoryBarSection(index);
        setTimeout(() => {
            manualScroll.current = false;
        }, 350);
    };

    const renderSectionHeader = useCallback(({section}: {section: SectionListData<EmojiAlias[], EmojiSection>}) => {
        return (
            <SectionHeader section={section}/>
        );
    }, []);

    const renderFooter = useMemo(() => {
        return fetchingCustomEmojis ? <SectionFooter/> : null;
    }, [fetchingCustomEmojis]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<EmojiAlias[]>) => {
        return (
            <View style={styles.row}>
                {item.map((emoji: EmojiAlias, index: number) => {
                    if (!emoji.name && !emoji.short_name) {
                        return (
                            <View
                                key={`empty-${index.toString()}`}
                                style={styles.emoji}
                            />
                        );
                    }

                    return (
                        <TouchableEmoji
                            key={emoji.name}
                            name={emoji.name}
                            onEmojiPress={onEmojiPress}
                            category={emoji.category}
                        />
                    );
                })}
            </View>
        );
    }, []);

    const List = useMemo(() => (isTablet ? SectionList : BottomSheetSectionList), [isTablet]);

    useEffect(() => {
        if (selectedIndex != null) {
            scrollToIndex(selectedIndex);
        }
    }, [selectedIndex]);

    return (
        <View style={styles.flex}>
            <List

                // @ts-expect-error bottom sheet definition
                getItemLayout={getItemLayout}
                keyboardDismissMode='interactive'
                keyboardShouldPersistTaps='always'
                ListFooterComponent={renderFooter}
                onEndReached={onLoadMoreCustomEmojis}
                onEndReachedThreshold={2}
                onScroll={onScroll}
                ref={list}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                sections={sections}
                contentContainerStyle={styles.contentContainerStyle}
                stickySectionHeadersEnabled={true}
                showsVerticalScrollIndicator={false}
                testID='emoji_picker.emoji_sections.section_list'
            />
            {isTablet &&
            <EmojiCategoryBar/>
            }
        </View>
    );
};

export default EmojiSections;
