// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useBottomSheet} from '@gorhom/bottom-sheet';
import React, {useCallback} from 'react';
import {NativeSyntheticEvent, TextInputFocusEventData} from 'react-native';

import SearchBar, {SearchProps} from '@components/search';

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
