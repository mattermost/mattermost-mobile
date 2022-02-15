// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

const Header = () => {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);

    return (
        <>
            <SafeAreaView
                edges={['top']}
                mode='padding'
                style={style.header}
            >
                <Text style={style.title}>{'Threads'}</Text>
            </SafeAreaView>
            <View style={style.separatorContainer}>
                <View style={style.separatorContent}/>
            </View>
        </>
    );
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        header: {
            backgroundColor: theme.sidebarBg,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            width: '100%',
            ...Platform.select({
                android: {
                    elevation: 10,
                    height: 56,
                },
                ios: {
                    zIndex: 10,
                    height: 88,
                },
            }),
        },
        separatorContainer: {
            backgroundColor: theme.sidebarBg,
            height: 16,
            width: '100%',
            position: 'absolute',
            top: Platform.OS === 'ios' ? 88 : 56,
        },
        separatorContent: {
            backgroundColor: theme.centerChannelBg,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            flex: 1,
        },
        title: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 18,
            fontFamily: 'OpenSans-Semibold',
            textAlign: 'center',
            flex: 0,
            flexShrink: 1,
        },
    };
});

export default Header;
