// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo} from 'react';
import {ActivityIndicator, View} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

const Footer = () => {
    const theme = useTheme();
    const styles = getStyleSheetFromTheme(theme);

    return (
        <View style={styles.loading}>
            <ActivityIndicator color={theme.centerChannelColor}/>
        </View>
    );
};

const getStyleSheetFromTheme = makeStyleSheetFromTheme(() => {
    return {
        loading: {
            flex: 1,
            alignItems: 'center',
        },
    };
});

export default memo(Footer);
