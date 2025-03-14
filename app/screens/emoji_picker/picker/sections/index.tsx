// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BottomSheetFlashList} from '@gorhom/bottom-sheet';
import {FlashList, type ListRenderItemInfo} from '@shopify/flash-list';
import {chunk} from 'lodash';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, StyleSheet} from 'react-native';

import {fetchCustomEmojis} from '@actions/remote/custom_emoji';
import {EMOJI_CATEGORY_ICONS, EMOJI_ROW_MARGIN, EMOJI_SIZE, EMOJIS_PER_PAGE, EMOJIS_PER_ROW, EMOJIS_PER_ROW_TABLET} from '@constants/emoji';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import {setEmojiCategoryBarIcons, setEmojiCategoryBarSection, useEmojiCategoryBar} from '@hooks/emoji_category_bar';
import {CategoryNames, EmojiIndicesByCategory, CategoryTranslations, CategoryMessage} from '@utils/emoji';
import {fillEmoji} from '@utils/emoji/helpers';

import EmojiCategoryBar from '../emoji_category_bar';

import EmojiRow, {type EmojiSectionRow} from './emoji_row';
import SectionFooter from './section_footer';
import SectionHeader, {type EmojiSection} from './section_header';

import type {CustomEmojiModel} from '@database/models/server';

type SectionListItem = EmojiSection | EmojiSectionRow;

const categoryToI18n: Record<string, CategoryTranslation> = {};

const emptyEmoji: EmojiAlias = {
    name: '',
    short_name: '',
    aliases: [],
};

const keyExtractor = (item: SectionListItem) => {
    return (item.type === 'section' ? `${item.key}` : `${item.sectionIndex}-${item.index}-${item.category}`);
};

const getItemType = (item: SectionListItem) => item.type;

const styles = StyleSheet.create({
    container: {flex: 1, paddingBottom: 20},
    containerStyle: {paddingBottom: 50},
});

type Props = {
    customEmojis: CustomEmojiModel[];
    customEmojisEnabled: boolean;
    imageUrl?: string;
    file?: ExtractedFileInfo;
    onEmojiPress: (emoji: string) => void;
    recentEmojis: string[];
}

CategoryNames.forEach((name: string) => {
    if (CategoryTranslations.has(name) && CategoryMessage.has(name)) {
        categoryToI18n[name] = {
            id: CategoryTranslations.get(name)!,
            defaultMessage: CategoryMessage.get(name)!,
            icon: EMOJI_CATEGORY_ICONS[name],
        };
    }
});

export default function EmojiSectionList({customEmojis, customEmojisEnabled, file, imageUrl, onEmojiPress, recentEmojis}: Props) {
    const [customEmojiPage, setCustomEmojiPage] = useState(() => Math.ceil(customEmojis.length / EMOJIS_PER_PAGE));
    const [fetchingCustomEmojis, setFetchingCustomEmojis] = useState(false);
    const [loadedAllCustomEmojis, setLoadedAllCustomEmojis] = useState(false);
    const scrollingToIndex = useRef(false);
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const {currentIndex, selectedIndex} = useEmojiCategoryBar();

    const list = useRef<FlashList<SectionListItem> | null>(null);

    const sections: SectionListItem[] = useMemo(() => {
        const emojisPerRow = isTablet ? EMOJIS_PER_ROW_TABLET : EMOJIS_PER_ROW;
        const sectionsArray = CategoryNames.map<EmojiSection>((category) => {
            return {
                type: 'section',
                ...categoryToI18n[category],
                key: category,
            };
        });

        if (imageUrl || file) {
            sectionsArray.unshift({
                type: 'section',
                id: 'emoji_picker.default',
                defaultMessage: 'Default',
                icon: 'bookmark-outline',
                key: 'default',
            });
        }

        return sectionsArray.reduce<SectionListItem[]>((acc, section, sectionIndex) => {
            acc.push(section);
            const emojiIndices = EmojiIndicesByCategory.get('default')?.get(section.key);
            let emojiArray: EmojiAlias[][];
            switch (section.key) {
                case 'custom': {
                    const builtInCustom = emojiIndices.map(fillEmoji.bind(null, 'custom'));
                    const mapCustom = (ce: CustomEmojiModel) => ({
                        aliases: [],
                        name: ce.name,
                        short_name: '',
                    });
                    const custom = customEmojisEnabled ? customEmojis.map(mapCustom) : [];
                    emojiArray = chunk<EmojiAlias>(builtInCustom.concat(custom), emojisPerRow);
                    break;
                }
                case 'recent': {
                    const recentMap = (emoji: string) => ({
                        aliases: [],
                        name: emoji,
                        short_name: '',
                    });
                    if (recentEmojis.length === 0) {
                        acc.pop();
                        return acc;
                    }
                    emojiArray = chunk<EmojiAlias>(recentEmojis.map(recentMap), emojisPerRow);
                    break;
                }
                case 'default':
                    acc.push({
                        type: 'row',
                        emojis: [{
                            aliases: [],
                            name: imageUrl || file?.name || '',
                            short_name: imageUrl || file?.name || '',
                            category: 'image',
                        }],
                        sectionIndex,
                        category: section.key,
                        index: 0,
                    });
                    return acc;
                default:
                    emojiArray = chunk(emojiIndices.map(fillEmoji.bind(null, section.key)), emojisPerRow);
                    break;
            }

            for (let index = 0; index < emojiArray.length; index++) {
                const d = emojiArray[index];
                const emojis = d.length < emojisPerRow ? d.concat(new Array(emojisPerRow - d.length).fill(emptyEmoji)) : d;
                acc.push({
                    type: 'row',
                    emojis,
                    sectionIndex,
                    category: section.key,
                    index,
                });
            }

            return acc;
        }, []);
    }, [customEmojis, customEmojisEnabled, file, imageUrl, isTablet, recentEmojis]);

    const stickyHeaderIndices = useMemo(() =>
       sections.
           map((item, index) => (item.type === 'section' ? index : undefined)).
           filter((item) => item !== undefined) as number[],
    [sections]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<SectionListItem>) => {
        if (item.type === 'section') {
            return (
                <SectionHeader
                    key={item.key}
                    section={item}
                />
            );
        }

        return (
            <EmojiRow
                key={`${item.sectionIndex}-${item.index}-${item.category}`}
                emojis={item.emojis}
                file={file}
                imageUrl={imageUrl}
                onEmojiPress={onEmojiPress}
            />
        );
    }, [file, imageUrl, onEmojiPress]);

    const scrollToIndex = useCallback((index: number) => {
        scrollingToIndex.current = true;
        list.current?.scrollToIndex({animated: false, index: stickyHeaderIndices[index], viewOffset: 0});
        setEmojiCategoryBarSection(index);
        setTimeout(() => {
            scrollingToIndex.current = false;
        }, 250);
    }, [stickyHeaderIndices]);

    const loadMoreCustomEmojis = useCallback(async () => {
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
    }, [customEmojisEnabled, fetchingCustomEmojis, loadedAllCustomEmojis, serverUrl, customEmojiPage]);

    const handleStickyHeaderIndexChanged = useCallback((index: number) => {
        if (scrollingToIndex.current) {
            return;
        }

        const stickyIndex = stickyHeaderIndices.indexOf(index);
        if (stickyIndex !== -1 && currentIndex !== stickyIndex) {
            requestAnimationFrame(() => {
                setEmojiCategoryBarSection(stickyIndex);
            });
        }
    }, [currentIndex, stickyHeaderIndices]);

    const renderFooter = useMemo(() => {
        return fetchingCustomEmojis ? <SectionFooter/> : null;
    }, [fetchingCustomEmojis]);

    const List = useMemo(() => (isTablet ? FlashList : BottomSheetFlashList), [isTablet]);

    useEffect(() => {
        setEmojiCategoryBarIcons(sections.filter((s) => s.type === 'section').map((s) => ({
            key: s.key,
            icon: s.icon,
        })));
    }, [sections]);

    useEffect(() => {
        if (selectedIndex != null) {
            scrollToIndex(selectedIndex);
        }

        // do not include scrollToIndex in dependencies
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedIndex]);

    return (
        <View style={styles.container}>
            <List
                contentContainerStyle={styles.containerStyle}
                data={sections}
                estimatedItemSize={EMOJI_SIZE + EMOJI_ROW_MARGIN}
                getItemType={getItemType}
                keyExtractor={keyExtractor}
                ListFooterComponent={renderFooter}
                onEndReachedThreshold={0.5}
                onEndReached={loadMoreCustomEmojis}
                onStickyHeaderIndexChanged={handleStickyHeaderIndexChanged}

                //@ts-expect-error type definition for ref
                ref={list}
                renderItem={renderItem}
                stickyHeaderIndices={stickyHeaderIndices}
            />
            {isTablet &&
            <EmojiCategoryBar/>
            }
        </View>
    );
}
