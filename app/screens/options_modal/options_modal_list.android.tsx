// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleSheet, View} from 'react-native';

import OptionsItem from '@components/options_item';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    items: any[];
    onCancelPress?: () => void;
    onItemPress?: () => void;
};

const OptionsModalList = ({items = [], onCancelPress, onItemPress}: Props) => {
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
        }, 250);
    }), []);

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
};

const style = StyleSheet.create({
    option: {
        alignSelf: 'stretch',
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
    },
    optionBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    optionContainer: {
        alignSelf: 'stretch',
        backgroundColor: 'white',
        borderRadius: 2,
        marginHorizontal: 30,
    },
    optionIcon: {
        color: '#7f8180',
    },
    optionText: {
        color: '#000',
        flex: 1,
        fontSize: 16,
    },
    wrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default OptionsModalList;
