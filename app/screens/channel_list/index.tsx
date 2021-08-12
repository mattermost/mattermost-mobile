// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {makeStyleSheetFromTheme} from '@utils/theme';

type ChannelProps = {
    theme: Theme;
}

const ChannelList = ({theme}: ChannelProps) => {
    const styles = getStyleSheet(theme);

    return (
        <View
            testID='channel.screen'
            style={styles.container}
        >
            <Text style={styles.screenTitle}>{' Channel Screen '}</Text>
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme(() => ({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    tabContainer: {
        position: 'absolute',
        bottom: 0,
        backgroundColor: '#ffffff',
    },
    textContainer: {
        marginTop: 30,
        alignItems: 'center',
    },
    screenTitle: {
        fontSize: 30,
        alignSelf: 'center',
    },
}));

export default ChannelList;
