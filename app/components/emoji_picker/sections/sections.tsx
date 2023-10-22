// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlashList, type ListRenderItemInfo} from '@shopify/flash-list';
import {isArray} from 'lodash';
import React, {useCallback, useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';

import emojiStore from '@app/store/emoji_picker';
import {isCategoryItem} from '@app/utils/emoji/picker';
import TouchableEmoji from '@components/touchable_emoji';

import {EMOJI_ROW_MARGIN, EMOJI_SIZE} from '../constant';
import EmojiCategoryBar from '../emoji_category_bar';

import SectionHeader from './section_header';

import type {EmojiCategoryType, EmojiRowType} from '@app/store/emoji_picker/interface';
import type {ViewableItemsChanged} from '@typings/components/post_list';

const styles = StyleSheet.create(({
    container: {
        flex: 1,
        minHeight: 200,
        width: '100%',
    },
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
    emojiBySectionRows: EmojiRowType[];
    categories: EmojiCategoryType[];
    currentCagoryIndex: number;
    onEmojiPress: (emoji: string) => void;
}

const EmojiSections = ({emojiBySectionRows, categories, currentCagoryIndex, onEmojiPress}: Props) => {
    const list = useRef<FlashList<EmojiRowType>>(null);
    const manualScroll = useRef(false);
    const autoScroll = useRef(false);
    const isScrolling = useRef(false);

    const onMomentumScrollBegin = useCallback(() => {
        isScrolling.current = true;
    }, [[]]);

    const onMomentumScrollEnd = useCallback(() => {
        isScrolling.current = false;
    }, []);

    const scrollToIndex = (index: number) => {
        if (autoScroll.current) {
            return;
        }

        manualScroll.current = true;
        const actualIndex: number = categories?.[index]?.index || 0;
        const viewOffset = -(EMOJI_SIZE + EMOJI_ROW_MARGIN);
        list.current?.scrollToIndex({index: actualIndex, animated: false, viewOffset});

        emojiStore.setCurrentCategoryIndex(index);

        setTimeout(() => {
            manualScroll.current = false;
        }, 350);
    };

    useEffect(() => {
        if (!isScrolling.current && currentCagoryIndex != null) {
            scrollToIndex(currentCagoryIndex);
        }
    }, [currentCagoryIndex, isScrolling.current]);

    const renderSectionHeader = (section?: EmojiCategoryType) => {
        return (

            <SectionHeader section={section}/>
        );
    };

    const renderItem = ({item}: ListRenderItemInfo<EmojiRowType>) => {
        const isCategory = isCategoryItem(item);

        if (isCategory) {
            return renderSectionHeader(item as EmojiCategoryType);
        }

        if (!isArray(item)) {
            return null;
        }

        return (
            <View style={styles.row}>
                {item.map((emoji: EmojiAlias, index: number) => {
                    if (!emoji.name && !emoji.short_name) {
                        // render Empty View to fill the space of row
                        return (
                            <View
                                // eslint-disable-next-line react/no-array-index-key
                                key={`emoji-${index}`}
                                style={styles.emoji}
                            />
                        );
                    }

                    return (
                        <TouchableEmoji
                            key={`emoji-${emoji.name}`}
                            name={emoji.name}
                            size={EMOJI_SIZE}
                            onEmojiPress={onEmojiPress}
                            category={emoji.category}
                        />
                    );
                })}
            </View>
        );
    };

    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        if (manualScroll.current) {
            return;
        }

        autoScroll.current = true;
        let newIndex = -1;
        categories.forEach((category) => {
            const viewableItemIndex = viewableItems?.[0]?.index || -1;
            if (category?.index <= viewableItemIndex) {
                newIndex++;
            }
        });

        if (newIndex >= 0) {
            emojiStore.setCurrentCategoryIndex(newIndex);
        }
        setTimeout(() => {
            autoScroll.current = false;
        }, 350);
    }, [manualScroll.current]);

    const stickyHeaderIndices = emojiBySectionRows.
        map((item, index) => {
            if (isCategoryItem(item)) {
                return index;
            }
            return null;
        }).
        filter((item) => item !== null) as number[];

    const getItemType = (item: EmojiRowType) => {
        // To achieve better performance, specify the type based on the item
        return isCategoryItem(item) ? 'sectionHeader' : 'row';
    };

    const keyExtractor = useCallback((item: EmojiRowType, index: number) => {
        const key = 'key' in item ? item.key : index;

        return `emoji-picker-section-item-${key}`;
    }, []);

    return (
        <View style={styles.container}>
            <FlashList
                ref={list}
                keyboardDismissMode='interactive'
                testID='emoji_picker.emoji_sections.section_list'
                keyboardShouldPersistTaps='always'
                data={emojiBySectionRows}
                showsVerticalScrollIndicator={false}
                renderScrollComponent={ScrollView}
                scrollEventThrottle={100}
                renderItem={renderItem}
                onMomentumScrollBegin={onMomentumScrollBegin}
                onMomentumScrollEnd={onMomentumScrollEnd}
                estimatedItemSize={EMOJI_SIZE + EMOJI_ROW_MARGIN}
                stickyHeaderIndices={stickyHeaderIndices}
                onViewableItemsChanged={onViewableItemsChanged}
                getItemType={getItemType}
                keyExtractor={keyExtractor}
            />
            <EmojiCategoryBar/>
        </View>
    );
};

export default EmojiSections;
