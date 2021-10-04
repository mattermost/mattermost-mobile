// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {NativeScrollEvent, NativeSyntheticEvent, Platform, SectionList} from 'react-native';

import {EMOJI_GUTTER, EMOJI_SIZE, SCROLL_VIEW_NATIVE_ID, SECTION_MARGIN} from '@components/emoji_picker';
import EmojiPickerRow from '@components/emoji_picker/components/emoji_picker_row';
import Footer from '@components/emoji_picker/components/footer';
import SectionHeader from '@components/emoji_picker/components/section_header';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

type EmojiSectionListProps = {
    deviceWidth: number;
    emojis: RenderableEmojis[];
    missingPages: boolean;
    onEmojiPress: (emoji: string) => void;
    onHandleScrollToSectionFailed: ({index}: {index: number}) => void;
    onLoadMoreCustomEmojis: () => void;
    onMomentumScrollEnd: () => void;
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
    onSetSectionListRef: (ref: any) => void;
    margin: number;
};

const EmojiSectionList = ({deviceWidth, emojis, missingPages, onEmojiPress, onHandleScrollToSectionFailed, onLoadMoreCustomEmojis, onMomentumScrollEnd, onScroll, onSetSectionListRef, margin}: EmojiSectionListProps) => {
    const theme = useTheme();
    const styles = getStyleSheetFromTheme(theme);

    const renderSectionItem = ({item}: any) => {
        return (
            <EmojiPickerRow
                emojiGutter={EMOJI_GUTTER}
                emojiSize={EMOJI_SIZE}
                item={item}
                key={item.key}
                onEmojiPress={onEmojiPress}
            />
        );
    };

    const renderSectionHeader = useCallback(({section}) => {
        return (
            <SectionHeader section={section}/>
        );
    }, []);

    const renderFooter = useCallback(() => {
        if (!missingPages) {
            return null;
        }

        return (
            <Footer/>
        );
    }, []);

    return (
        <SectionList
            ListFooterComponent={renderFooter}
            initialNumToRender={50}
            keyboardDismissMode='interactive'
            keyboardShouldPersistTaps='always'
            nativeID={SCROLL_VIEW_NATIVE_ID}
            onEndReached={onLoadMoreCustomEmojis}
            onEndReachedThreshold={Platform.OS === 'ios' ? 0 : 1}
            onMomentumScrollEnd={onMomentumScrollEnd}
            onScroll={onScroll}
            onScrollToIndexFailed={onHandleScrollToSectionFailed}
            ref={onSetSectionListRef}
            removeClippedSubviews={true}
            renderItem={renderSectionItem}
            renderSectionHeader={renderSectionHeader}
            sections={emojis}
            showsVerticalScrollIndicator={false}
            style={[styles.sectionList, {width: deviceWidth - (SECTION_MARGIN * margin)}]}
        />
    );
};

const getStyleSheetFromTheme = makeStyleSheetFromTheme(() => {
    return {
        sectionList: {
            ...Platform.select({
                android: {
                    marginBottom: 35,
                },
            }),
        },
    };
});

export default EmojiSectionList;
