// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef} from 'react';
import {View, type LayoutChangeEvent} from 'react-native';
import {useSharedValue, type SharedValue} from 'react-native-reanimated';

import SearchBar, {type SearchProps, type SearchRef} from '@components/search';
import {useKeyboardState} from '@context/keyboard_state';
import {useTheme} from '@context/theme';
import {setEmojiSkinTone} from '@hooks/emoji_category_bar';
import SkinToneSelector from '@screens/emoji_picker/picker/header/skintone_selector';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = SearchProps & {
    skinTone: string;
    setIsEmojiSearchFocused: React.Dispatch<React.SetStateAction<boolean>>;
    emojiPickerHeight: SharedValue<number>;
    isSelectingEmojiRef?: React.MutableRefObject<boolean>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {flex: 1},
    row: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.08),
        borderBottomWidth: 1,
        borderBottomColor: changeOpacity(theme.centerChannelColor, 0.08),
        backgroundColor: theme.centerChannelBg,
    },
}));

const EmojiPickerHeader: React.FC<Props> = ({
    skinTone,
    emojiPickerHeight,
    setIsEmojiSearchFocused,
    isSelectingEmojiRef,
    ...props
}) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const {showInputAccessoryView} = useKeyboardState();
    const containerWidth = useSharedValue(0);
    const isSearching = useSharedValue(false);

    const searchRef = useRef<SearchRef>(null);

    useEffect(() => {
        const req = requestAnimationFrame(() => {
            setEmojiSkinTone(skinTone);
        });

        return () => cancelAnimationFrame(req);
    }, [skinTone]);

    // Reset search state when emoji picker is dismissed
    useEffect(() => {
        if (!showInputAccessoryView) {
            isSearching.value = false;
        }
    }, [showInputAccessoryView, isSearching]);

    const onBlur = useCallback(() => {
        if (isSelectingEmojiRef?.current) {
            isSelectingEmojiRef.current = false;
            return;
        }

        setIsEmojiSearchFocused(false);
        isSearching.value = false;
    }, [isSearching, setIsEmojiSearchFocused, isSelectingEmojiRef]);

    const onFocus = useCallback(() => {
        setIsEmojiSearchFocused(true);
        isSearching.value = true;
    }, [isSearching, setIsEmojiSearchFocused]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        containerWidth.value = e.nativeEvent.layout.width;
    }, [containerWidth]);

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
                    ref={searchRef}
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
