// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarBg,
        height: 16,
        width: '100%',
        position: 'absolute',
    },
    content: {
        backgroundColor: theme.centerChannelBg,
        borderRadius: 12,
        flex: 1,
    },
    hideExtraBorders: {
        backgroundColor: theme.centerChannelBg,
        position: 'absolute',
        top: 9,
        width: '100%',
        height: 14,
        flexDirection: 'row',
    },
}));

const RoundedHeaderContext = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    return (
        <>
            <View style={styles.container}>
                <View style={styles.content}/>
            </View>
            <View style={styles.hideExtraBorders}/>
        </>
    );
};

export default RoundedHeaderContext;
