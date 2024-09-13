// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {StyleSheet, View, type LayoutChangeEvent} from 'react-native';
import {useSharedValue, withTiming, type SharedValue} from 'react-native-reanimated';

import SearchBar, {type SearchProps} from '@app/components/search';
import {setEmojiSkinTone} from '@app/hooks/emoji_category_bar';
import SkinToneSelector from '@app/screens/emoji_picker/picker/header/skintone_selector';

type Props = SearchProps & {
    skinTone: string;
    setIsEmojiSearchFocused: React.Dispatch<React.SetStateAction<boolean>>;
    emojiPickerHeight: SharedValue<number>;
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    row: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingTop: 12,
    },
});

const EmojiPickerHeader: React.FC<Props> = ({
    skinTone,
    emojiPickerHeight,
    setIsEmojiSearchFocused,
    ...props
}) => {
    const containerWidth = useSharedValue(0);
    const isSearching = useSharedValue(false);

    useEffect(() => {
        const req = requestAnimationFrame(() => {
            setEmojiSkinTone(skinTone);
        });

        return () => cancelAnimationFrame(req);
    }, [skinTone]);

    const onBlur = useCallback(() => {
        emojiPickerHeight.value = withTiming(300, {duration: 0});
        setIsEmojiSearchFocused(false);
        isSearching.value = false;
    }, [
        emojiPickerHeight,
        setIsEmojiSearchFocused,
    ]);

    const onFocus = useCallback(() => {
        emojiPickerHeight.value = withTiming(100, {duration: 0});
        setIsEmojiSearchFocused(true);
        isSearching.value = true;
    }, [
        emojiPickerHeight,
        setIsEmojiSearchFocused,
    ]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        containerWidth.value = e.nativeEvent.layout.width;
    }, []);

    return (
        <View
            onLayout={onLayout}
            style={styles.row}
        >
            <View style={styles.flex}>
                <SearchBar
                    {...props}
                    onBlur={onBlur}
                    onFocus={onFocus}
                />
            </View>
            <SkinToneSelector
                skinTone={skinTone}
                containerWidth={containerWidth}
                isSearching={isSearching}
            />
        </View>
    );
};

export default EmojiPickerHeader;
