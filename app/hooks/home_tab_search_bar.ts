// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from '@react-navigation/native';
import {useLayoutEffect, type RefObject} from 'react';
import {type NativeSyntheticEvent, type TextInputFocusEventData} from 'react-native';

import type {SearchBarCommands} from 'react-native-screens';

type Props = {
    enabled: boolean;
    nativeSearchRef: RefObject<SearchBarCommands | null>;
    onBlur: () => void;
    onCancel: () => void;
    onChangeText: (text: string) => void;
    onFocus: () => void;
    onSubmit: (text: string) => void;
    placeholder: string;
    tintColor: string;
}

export function useHomeTabSearchBar({
    enabled,
    nativeSearchRef,
    onBlur,
    onCancel,
    onChangeText,
    onFocus,
    onSubmit,
    placeholder,
    tintColor,
}: Props) {
    const navigation = useNavigation();

    useLayoutEffect(() => {
        if (!enabled) {
            return;
        }

        navigation.setOptions({
            headerSearchBarOptions: {
                ref: nativeSearchRef,
                autoCapitalize: 'none',
                hideWhenScrolling: false,
                hideNavigationBar: false,
                placement: 'stacked',
                allowToolbarIntegration: false,
                placeholder,
                textColor: tintColor,
                tintColor,
                onChangeText: (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
                    onChangeText(event.nativeEvent.text);
                },
                onSearchButtonPress: (event: NativeSyntheticEvent<TextInputFocusEventData>) => {
                    onSubmit(event.nativeEvent.text);
                },
                onCancelButtonPress: onCancel,
                onFocus,
                onBlur,
            },
        });
    }, [
        enabled,
        nativeSearchRef,
        navigation,
        onBlur,
        onCancel,
        onChangeText,
        onFocus,
        onSubmit,
        placeholder,
        tintColor,
    ]);
}
