// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import OptionsItem from '@components/options_item';
import {preventDoubleTap} from '@utils/tap';

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
        width: '100%',
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
        borderRadius: 12,
        marginBottom: 20,
        marginHorizontal: 20,
    },
    optionIcon: {
        color: '#4E8ACC',
    },
    optionText: {
        color: '#4E8ACC',
        flex: 1,
        fontSize: 20,
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
        maxWidth: 450,
        width: '100%',
    },
});

export default OptionsModalList;
