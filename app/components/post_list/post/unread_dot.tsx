// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        badgeContainer: {
            position: 'absolute',
            left: 21,
            bottom: 9,
        },
        unreadDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.sidebarTextActiveBorder,
            alignSelf: 'center',
            top: -6,
            left: 4,
        },
    };
});

const UnreadDot = () => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    return (
        <View
            style={styles.badgeContainer}
            testID='post_unread_dot.badge'
        >
            <View style={styles.unreadDot}/>
        </View>
    );
};

export default UnreadDot;
