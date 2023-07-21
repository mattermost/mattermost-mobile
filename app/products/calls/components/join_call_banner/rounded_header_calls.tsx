// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {DEFAULT_HEADER_HEIGHT, JOIN_CALL_BAR_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    threadScreen?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: '#339970', // intentionally not themed
        height: 40,
        width: '100%',
        position: 'absolute',
    },
    content: {
        backgroundColor: theme.centerChannelBg,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        flex: 1,
    },
}));

export const RoundedHeaderCalls = ({threadScreen}: Props) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const styles = getStyleSheet(theme);
    const containerTop = {
        top: insets.top + (threadScreen ? JOIN_CALL_BAR_HEIGHT : JOIN_CALL_BAR_HEIGHT + DEFAULT_HEADER_HEIGHT),
    };

    return (
        <View style={[styles.container, containerTop]}>
            <View style={styles.content}/>
        </View>
    );
};
