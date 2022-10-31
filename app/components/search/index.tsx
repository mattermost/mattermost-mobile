// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable react/prop-types */
// We disable the prop types check here as forwardRef & typescript has a bug

import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {ActivityIndicatorProps, Keyboard, NativeSyntheticEvent, Platform, StyleProp, TextInput, TextInputProps, TextInputSelectionChangeEventData, TextStyle, TouchableOpacityProps, ViewStyle} from 'react-native';
import {SearchBar} from 'react-native-elements';

import CompassIcon from '@components/compass_icon';
import {SEARCH_INPUT_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export type SearchProps = TextInputProps & {
    cursorPosition: number;
    selection?: {start: number; end?: number | undefined } | undefined;
    cancelIcon?: React.ReactElement;
    cancelButtonProps?: Partial<TouchableOpacityProps> & {
        buttonStyle?: StyleProp<ViewStyle>;
        buttonTextStyle?: StyleProp<TextStyle>;
        color?: string;
        buttonDisabledStyle?: StyleProp<ViewStyle>;
        buttonDisabledTextStyle?: StyleProp<ViewStyle>;
    };
    cancelButtonTitle?: string;
    clearIcon?: React.ReactElement;
    clearIconColor?: string;
    containerStyle?: StyleProp<ViewStyle>;
    inputContainerStyle?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<TextStyle>;
    leftIconContainerStyle?: StyleProp<ViewStyle>;
    loadingProps?: ActivityIndicatorProps;
    onCancel?(): void;
    onClear?(): void;
    rightIconContainerStyle?: StyleProp<ViewStyle>;
    searchIcon?: React.ReactElement;
    searchIconColor?: string;
    selectionColor?: string;
    showCancel?: boolean;
    showLoading?: boolean;
};

export type SearchRef = {
    blur?: () => void;
    cancel?: () => void;
    clear?: () => void;
    focus?: () => void;
    onSelectionChange: (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    containerStyle: {
        backgroundColor: undefined,
        height: undefined,
        paddingTop: 0,
        paddingBottom: 0,
    },
    inputContainerStyle: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.12),
        borderRadius: 8,
        height: SEARCH_INPUT_HEIGHT,
        marginLeft: 0,
    },
    inputStyle: {
        color: theme.centerChannelColor,
        marginLeft: Platform.select({ios: 6, android: 14}),
        top: Platform.select({android: 1}),
        ...typography('Body', 200, 'Regular'),
        lineHeight: undefined,
    },
}));

const Search = forwardRef<SearchRef, SearchProps>((props: SearchProps, ref) => {
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const searchRef = useRef<TextInput>(null);
    const [value, setValue] = useState(props.defaultValue || props.value || '');
    const searchClearButtonTestID = `${props.testID}.search.clear.button`;
    const searchCancelButtonTestID = `${props.testID}.search.cancel.button`;
    const searchInputTestID = `${props.testID}.search.input`;
    const [localCursorPosition, setLocalCursorPosition] = useState(props.cursorPosition);

    useEffect(() => {
        if (localCursorPosition !== props.cursorPosition) {
            setLocalCursorPosition(props.cursorPosition);
        }

        // setLocalSelection({start: props.cursorPosition});
    }, [props.cursorPosition]);

    const onChangeText = useCallback((text: string) => {
        setValue(text);
        props.onChangeText?.(text);
    }, [props.onChangeText, value, props.selection]);

    const onSelectionChange = useCallback((event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    // const onSelectionChange = useCallback(({nativeEvent: {selection, text}}) => {
        console.log('<><> onSelectionChange - selection', event.nativeEvent.selection);

        setLocalCursorPosition(event.nativeEvent.selection.start);

        // setLocalSelection(selection);
    }, [props.selection]);

    // console.log('props.selection', props.selection, 'localSelection', localSelection);
    // console.log('props.selection', props.selection);

    const onCancel = useCallback(() => {
        Keyboard.dismiss();
        setValue('');
        props.onCancel?.();
    }, [props.onCancel]);

    const onClear = useCallback(() => {
        setValue('');
        props.onClear?.();
    }, [props.onClear]);

    const cancelButtonProps = useMemo(() => ({
        buttonTextStyle: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            ...typography('Body', 100, 'Regular'),
        },
    }), [theme]);

    useEffect(() => {
        setValue(props.defaultValue || props.value || '');
    }, [props.defaultValue, props.value]);

    const clearIcon = (
        <CompassIcon
            color={changeOpacity(props.clearIconColor || theme.centerChannelColor, Platform.select({android: 0.56, default: 0.72}))}
            name={Platform.select({android: 'close', default: 'close-circle'})}
            onPress={searchRef.current?.clear}
            size={Platform.select({android: 24, default: 18})}
            testID={searchClearButtonTestID}
        />
    );

    const searchIcon = (
        <CompassIcon
            color={changeOpacity(props.searchIconColor || theme.centerChannelColor, Platform.select({android: 0.56, default: 0.72}))}
            name='magnify'
            onPress={searchRef.current?.focus}
            size={24}
        />
    );

    const cancelIcon = (
        <CompassIcon
            color={changeOpacity(props.cancelButtonProps?.color || theme.centerChannelColor, Platform.select({android: 0.56, default: 0.72}))}
            name='arrow-left'
            onPress={onCancel}
            size={24}
            testID={searchCancelButtonTestID}
        />
    );

    useImperativeHandle(ref, () => ({
        blur: () => {
            searchRef.current?.blur();
        },
        cancel: () => {
            // @ts-expect-error cancel is not part of TextInput does exist in SearchBar
            searchRef.current?.cancel();
        },
        clear: () => {
            searchRef.current?.clear();
        },
        focus: () => {
            searchRef.current?.focus();
        },
        onSelectionChange: (event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
            // console.log('. IN HERE!');
            console.log('event?.nativeEvent.selection', event);

            // @ts-expect-error cancel is not part of TextInput does exist in SearchBar
            searchRef.current?.onSelectionChange?.(event);
        },
    }), [searchRef]);

    return (
        <SearchBar
            {...props}
            cancelButtonProps={props.cancelButtonProps || cancelButtonProps}
            cancelButtonTitle={props.cancelButtonTitle || intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
            cancelIcon={cancelIcon}

            // @ts-expect-error clearIcon definition does not include a ReactElement
            clearIcon={clearIcon}
            containerStyle={[styles.containerStyle, props.containerStyle]}
            inputContainerStyle={[styles.inputContainerStyle, props.inputContainerStyle]}
            inputStyle={[styles.inputStyle, props.inputStyle]}
            returnKeyType='search'
            onCancel={onCancel}
            onClear={onClear}

            // @ts-expect-error onChangeText type definition is wrong in elements
            onChangeText={onChangeText}
            selection={{start: localCursorPosition}}
            onSelectionChange={onSelectionChange}
            placeholder={props.placeholder || intl.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
            placeholderTextColor={props.placeholderTextColor || changeOpacity(theme.centerChannelColor, Platform.select({android: 0.56, default: 0.72}))}
            platform={Platform.select({android: 'android', default: 'ios'})}
            ref={searchRef}

            // @ts-expect-error searchIcon definition does not include a ReactElement
            searchIcon={searchIcon}
            selectionColor={Platform.select({android: changeOpacity(props.selectionColor || theme.centerChannelColor, 0.24), default: props.selectionColor || theme.centerChannelColor})}
            testID={searchInputTestID}
            value={value}
        />
    );
});

Search.displayName = 'SeachBar';

export default Search;
