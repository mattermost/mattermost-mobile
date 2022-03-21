// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import {makeStyleSheetFromTheme} from '@utils/theme';

import type ThreadModel from '@typings/database/models/servers/thread';

type Props = {
    testID: string;
    theme: Theme;
    thread: ThreadModel;
};

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

const Badge = ({testID, theme, thread}: Props) => {
    if (thread.unreadMentions || thread.unreadReplies) {
        const styles = getStyleSheet(theme);
        return (
            <View
                style={styles.badgeContainer}
                testID={testID}
            >
                <View style={styles.unreadDot}/>
            </View>
        );
    }
    return null;
};

export default Badge;
