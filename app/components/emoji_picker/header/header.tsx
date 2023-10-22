// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {type LayoutChangeEvent, StyleSheet, View} from 'react-native';
import {useSharedValue} from 'react-native-reanimated';

import SearchBar, {type SearchProps} from '@components/search';
import {setEmojiSkinTone} from '@hooks/emoji_category_bar';

import SkinToneSelector from './skintone_selector';

type Props = SearchProps & {
    skinTone: string;
    disableBottomSheet?: boolean;
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    row: {flexDirection: 'row'},
});

const PickerHeader = ({skinTone, ...props}: Props) => {
    const containerWidth = useSharedValue(0);
    const isSearching = useSharedValue(false);

    useEffect(() => {
        const req = requestAnimationFrame(() => {
            setEmojiSkinTone(skinTone);
        });

        return () => cancelAnimationFrame(req);
    }, [skinTone]);

    const onBlur = useCallback(() => {
        isSearching.value = false;
    }, []);

    const onFocus = useCallback(() => {
        isSearching.value = true;
    }, []);

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

export default PickerHeader;
