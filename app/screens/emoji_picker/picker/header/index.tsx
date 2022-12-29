// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {LayoutChangeEvent, View} from 'react-native';
import {useSharedValue} from 'react-native-reanimated';

import SearchBar, {SearchProps} from '@components/search';
import {useIsTablet} from '@hooks/device';

import BottomSheetSearch from './bottom_sheet_search';
import SkinToneSelector from './skintone_selector';

type Props = SearchProps & {
    skinTone: string;
}

const PickerHeader = ({skinTone, ...props}: Props) => {
    const isTablet = useIsTablet();
    const containerWidth = useSharedValue(0);
    const isSearching = useSharedValue(false);

    const onBlur = useCallback(() => {
        isSearching.value = false;
    }, []);

    const onFocus = useCallback(() => {
        isSearching.value = true;
    }, []);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        containerWidth.value = e.nativeEvent.layout.width;
    }, []);

    let search;
    if (isTablet) {
        search = (
            <SearchBar
                {...props}
                onBlur={onBlur}
                onFocus={onFocus}
            />
        );
    } else {
        search = (
            <BottomSheetSearch
                {...props}
                onBlur={onBlur}
                onFocus={onFocus}
            />
        );
    }

    return (
        <View
            onLayout={onLayout}
            style={{flexDirection: 'row'}}
        >
            <View style={{flex: 1}}>
                {search}
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
