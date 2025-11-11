// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

type UnreadDotProps = {
    isInFooter?: boolean;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        badgeContainer: {
            position: 'absolute',
            bottom: '20%',
        },
        badgeContainerFooter: {
            paddingHorizontal: 8,
        },
        unreadDot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.sidebarTextActiveBorder,
            alignSelf: 'center',
        },
    };
});

const UnreadDot = ({isInFooter = false}: UnreadDotProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    return (
        <View
            style={isInFooter ? styles.badgeContainerFooter : styles.badgeContainer}
            testID='post_unread_dot.badge'
        >
            <View style={styles.unreadDot}/>
        </View>
    );
};

export default UnreadDot;
