// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Platform, StyleSheet, TouchableOpacity, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {preventDoubleTap} from '@utils/tap';

import OptionsItem from './options_item';

type Props = {
    items: any[];
    onCancelPress?: () => void;
    onItemPress?: () => void;
    title: string | any;
};

const OptionsModalList = ({items = [], onCancelPress, onItemPress, title}: Props) => {
    const handleCancelPress = useCallback(preventDoubleTap(() => {
        onCancelPress?.();
    }), []);

    const handleItemPress = useCallback(preventDoubleTap((action) => {
        onItemPress?.();
        const timer = setTimeout(() => {
            clearTimeout(timer);
            if (typeof action === 'function') {
                action();
            }
        }, 100);
    }), []);

    if (Platform.OS === 'android') {
        return (
            <View style={style.wrapper}>
                <View style={style.optionContainer}>
                    <OptionsItem
                        onHandleItemPress={handleItemPress}
                        onHandleCancelPress={handleCancelPress}
                        items={items}
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={style.container}>
            <View style={style.wrapper}>
                <View style={[style.optionContainer]}>
                    <OptionsItem
                        onHandleItemPress={handleItemPress}
                        onHandleCancelPress={handleCancelPress}
                        items={items}
                        title={title}
                    />
                </View>
                <View style={style.optionContainer}>
                    <TouchableOpacity
                        onPress={handleCancelPress}
                        style={style.option}
                    >
                        <FormattedText
                            id='channel_modal.cancel'
                            defaultMessage='Cancel'
                            style={style.optionCancelText}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const style = StyleSheet.create({
    option: {
        alignSelf: 'stretch',
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        ...Platform.select({
            ios: {
                width: '100%',
            },
        }),
    },
    optionBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    optionCancelText: {
        color: '#CC3239',
        flex: 1,
        fontSize: 20,
        textAlign: 'center',
    },
    optionContainer: {
        alignSelf: 'stretch',
        backgroundColor: 'white',
        ...Platform.select({
            ios: {
                borderRadius: 12,
                marginBottom: 20,
                marginHorizontal: 20,
            },
            android: {
                borderRadius: 2,
                marginHorizontal: 30,
            },
        }),
    },
    optionIcon: {
        ...Platform.select({
            ios: {
                color: '#4E8ACC',
            },
            android: {
                color: '#7f8180',
            },
        }),
    },
    optionText: {
        ...Platform.select({
            ios: {
                color: '#4E8ACC',
                flex: 1,
                fontSize: 20,
            },
            android: {
                color: '#000',
                flex: 1,
                fontSize: 16,
            },
        }),

    },
    optionTitleText: {
        color: '#7f8180',
        flex: 1,
        textAlign: 'center',
    },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    wrapper: {
        ...Platform.select({
            ios: {
                maxWidth: 450,
                width: '100%',
            },
            android: {
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
            },
        }),
    },
});

export default OptionsModalList;
