// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useBottomSheet, useBottomSheetInternal} from '@gorhom/bottom-sheet';
import React, {useCallback} from 'react';
import {NativeSyntheticEvent, Platform, TextInputFocusEventData} from 'react-native';

import SearchBar, {SearchProps} from '@components/search';

const BottomSheetSearch = ({onBlur, onFocus, ...props}: SearchProps) => {
    const {expand} = useBottomSheet();
    const {shouldHandleKeyboardEvents} = useBottomSheetInternal();

    const handleOnFocus = useCallback((event: NativeSyntheticEvent<TextInputFocusEventData>) => {
        if (Platform.OS === 'android') {
            expand();
        } else {
            shouldHandleKeyboardEvents.value = true;
        }

        onFocus?.(event);
    }, [onFocus, expand, shouldHandleKeyboardEvents]);

    const handleOnBlur = useCallback((event: NativeSyntheticEvent<TextInputFocusEventData>) => {
        shouldHandleKeyboardEvents.value = false;
        onBlur?.(event);
    }, [onBlur, shouldHandleKeyboardEvents]);

    return (
        <SearchBar
            onFocus={handleOnFocus}
            onBlur={handleOnBlur}
            {...props}
        />
    );
};

export default BottomSheetSearch;
