// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable react/prop-types */
// We disable the prop types check here as forwardRef & typescript has a bug

import React, {forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {ActivityIndicatorProps, Platform, StyleProp, TextInput, TextInputProps, TextStyle, TouchableOpacityProps, ViewStyle} from 'react-native';
import {SearchBar} from 'react-native-elements';

import CompassIcon from '@components/compass_icon';
import {SEARCH_INPUT_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export type SearchProps = TextInputProps & {
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
    containerStyle?: StyleProp<ViewStyle>;
    inputContainerStyle?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<TextStyle>;
    loadingProps?: ActivityIndicatorProps;
    leftIconContainerStyle?: StyleProp<ViewStyle>;
    onCancel?(): void;
    onClear?(): void;
    rightIconContainerStyle?: StyleProp<ViewStyle>;
    searchIcon?: React.ReactElement;
    showCancel?: boolean;
    showLoading?: boolean;
};

type SearchRef = {
    blur: () => void;
    cancel: () => void;
    clear: () => void;
    focus: () => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    containerStyle: {
        backgroundColor: undefined,
        height: undefined,
        paddingTop: 0,
        paddingBottom: 0,
    },
    inputContainerStyle: {
        backgroundColor: changeOpacity(theme.sidebarText, 0.12),
        borderRadius: 8,
        height: SEARCH_INPUT_HEIGHT,
        marginLeft: 0,
    },
    inputStyle: {
        color: theme.sidebarText,
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
    const [value, setValue] = useState(props.value || '');
    const searchClearButtonTestID = `${props.testID}.search.clear.button`;
    const searchCancelButtonTestID = `${props.testID}.search.cancel.button`;
    const searchInputTestID = `${props.testID}.search.input`;

    const onCancel = useCallback(() => {
        setValue('');
        props.onCancel?.();
    }, []);

    const onClear = useCallback(() => {
        setValue('');
        props.onClear?.();
    }, []);

    const onChangeText = useCallback((text: string) => {
        setValue(text);
        props.onChangeText?.(text);
    }, []);

    const cancelButtonProps = useMemo(() => ({
        buttonTextStyle: {
            color: changeOpacity(theme.sidebarText, 0.72),
            ...typography('Body', 100, 'Regular'),
        },
    }), [theme]);

    const clearIcon = useMemo(() => {
        return (
            <CompassIcon
                color={changeOpacity(theme.sidebarText, Platform.select({android: 0.56, default: 0.72}))}
                name={Platform.select({android: 'close', default: 'close-circle'})}
                onPress={searchRef.current?.clear}
                size={Platform.select({android: 24, default: 18})}
                testID={searchClearButtonTestID}
            />
        );
    }, [searchRef.current, theme]);

    const searchIcon = useMemo(() => (
        <CompassIcon
            color={changeOpacity(theme.sidebarText, Platform.select({android: 0.56, default: 0.72}))}
            name='magnify'
            size={24}
        />
    ), [theme]);

    const cancelIcon = useMemo(() => (
        <CompassIcon
            color={changeOpacity(theme.sidebarText, Platform.select({android: 0.56, default: 0.72}))}
            name='arrow-left'

            // @ts-expect-error cancel is not part of TextInput does exist in SearchBar
            onPress={searchRef.current?.cancel}
            size={24}
            testID={searchCancelButtonTestID}
        />
    ), [searchRef.current, theme]);

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
            placeholder={props.placeholder || intl.formatMessage({id: 'search_bar.search', defaultMessage: 'Search'})}
            placeholderTextColor={props.placeholderTextColor || changeOpacity(theme.sidebarText, Platform.select({android: 0.56, default: 0.72}))}
            platform={Platform.select({android: 'android', default: 'ios'})}
            ref={searchRef}

            // @ts-expect-error searchIcon definition does not include a ReactElement
            searchIcon={searchIcon}
            selectionColor={Platform.select({android: changeOpacity(theme.sidebarText, 0.24), default: theme.sidebarText})}
            testID={searchInputTestID}
            value={value}
        />
    );
});

Search.displayName = 'SeachBar';

export default Search;
