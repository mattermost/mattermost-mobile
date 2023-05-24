// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useBottomSheet} from '@gorhom/bottom-sheet';
import React, {useCallback} from 'react';

import SearchBar, {type SearchProps} from '@components/search';

import type {NativeSyntheticEvent, TextInputFocusEventData} from 'react-native';

const BottomSheetSearch = ({onFocus, ...props}: SearchProps) => {
    const {expand} = useBottomSheet();

    const handleOnFocus = useCallback((event: NativeSyntheticEvent<TextInputFocusEventData>) => {
        expand();
        onFocus?.(event);
    }, [onFocus, expand]);

    return (
        <SearchBar
            onFocus={handleOnFocus}
            {...props}
        />
    );
};

export default BottomSheetSearch;
