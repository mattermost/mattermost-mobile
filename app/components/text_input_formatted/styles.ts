// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Platform, StyleSheet, TextStyle, ViewStyle} from 'react-native';

export const getSearchBarStyle = (backgroundColor: string, cancelButtonStyle: ViewStyle | undefined, containerHeight: number, inputHeight: number, inputStyle: TextStyle | undefined, placeholderTextColor: string, searchBarRightMargin: number, tintColorDelete: string, tintColorSearch: string, titleCancelColor: string) => ({
    cancelButtonText: {
        ...cancelButtonStyle,
        color: titleCancelColor,
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        height: containerHeight,
        overflow: 'hidden',
    },
    clearIconColorIos: tintColorDelete || 'grey',
    clearIconColorAndroid: titleCancelColor || placeholderTextColor,
    inputStyle: {
        ...inputStyle,
        backgroundColor: 'transparent',
        height: inputHeight,
    },
    inputContainer: {
        backgroundColor: inputStyle?.backgroundColor,
        height: inputHeight,
    },
    searchBarWrapper: {
        marginRight: searchBarRightMargin,
        height: Platform.select({
            ios: inputHeight || containerHeight - 10,
            android: inputHeight,
        }),
    },
    searchBarContainer: {
        backgroundColor,
    },
    searchIcon: {
        color: tintColorSearch || placeholderTextColor,
        top: 8,
    },
    searchIconColor: tintColorSearch || placeholderTextColor,
});

export const getStyles = () => StyleSheet.create({
    defaultColor: {
        color: 'grey',
    },
    fullWidth: {
        flex: 1,
    },
    inputContainer: {
        borderRadius: Platform.select({
            ios: 2,
            android: 0,
        }),
    },
    inputMargin: {
        marginLeft: 4,
        paddingTop: 0,
        marginTop: Platform.select({
            ios: 0,
            android: 8,
        }),
    },
    leftIcon: {
        marginLeft: 4,
        width: 30,
    },
    searchContainer: {
        paddingTop: 0,
        paddingBottom: 0,
    },
    text: {
        fontSize: Platform.select({
            ios: 14,
            android: 15,
        }),
        color: '#fff',
    },
    leftComponent: {
        position: 'relative',
        marginLeft: 2,
    },
});

export const getSearchStyles = (backgroundColor: string, cancelButtonStyle: ViewStyle | undefined, containerHeight: number, inputHeight: number, inputStyle: TextStyle | undefined, placeholderTextColor: string, searchBarRightMargin: number, tintColorDelete: string, tintColorSearch: string, titleCancelColor: string) => {
    const searchBarStyle = getSearchBarStyle(backgroundColor, cancelButtonStyle, containerHeight, inputHeight, inputStyle, placeholderTextColor, searchBarRightMargin, tintColorDelete, tintColorSearch, titleCancelColor);

    const styles = getStyles();

    const inputTextStyle = {
        ...styles.text,
        ...styles.inputMargin,
        ...searchBarStyle.inputStyle,
    };

    const inputContainerStyle = {
        ...styles.inputContainer,
        ...searchBarStyle.inputContainer,
    };

    const containerStyle = {
        ...styles.searchContainer,
        ...styles.fullWidth,
        ...searchBarStyle.searchBarContainer,
    };

    const cancelButtonPropStyle = {
        buttonTextStyle: {
            ...styles.text,
            ...searchBarStyle.cancelButtonText,
        },
    };

    return {
        cancelButtonPropStyle,
        containerStyle,
        inputContainerStyle,
        inputTextStyle,
        searchBarStyle,
        styles,
    };
};
