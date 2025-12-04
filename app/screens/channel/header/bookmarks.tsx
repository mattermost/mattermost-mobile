// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View} from 'react-native';

import ChannelBookmarks from '@components/channel_bookmarks';
import {useTheme} from '@context/theme';
import {useDefaultHeaderHeight} from '@hooks/header';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    canAddBookmarks: boolean;
    channelId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarBg,
        width: '100%',
        position: 'absolute',
    },
    content: {
        backgroundColor: theme.centerChannelBg,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    separator: {
        height: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
    },
    separatorContainer: {
        backgroundColor: theme.centerChannelBg,
        zIndex: 1,
    },
    padding: {
        paddingTop: 2,
    },
    paddingHorizontal: {
        paddingLeft: 10,
    },
}));

const ChannelHeaderBookmarks = ({canAddBookmarks, channelId}: Props) => {
    const theme = useTheme();
    const defaultHeight = useDefaultHeaderHeight();
    const styles = getStyleSheet(theme);

    const containerStyle = useMemo(() => ({
        ...styles.content,
        top: defaultHeight,
        zIndex: 1,
    }), [defaultHeight, styles.content]);

    return (
        <View style={containerStyle}>
            <View style={styles.content}>
                <View style={styles.paddingHorizontal}>
                    <ChannelBookmarks
                        channelId={channelId}
                        showInInfo={false}
                        canAddBookmarks={canAddBookmarks}
                        separator={false}
                    />
                </View>
            </View>
            <View style={styles.separatorContainer}>
                <View style={styles.separator}/>
            </View>
        </View>
    );
};

export default ChannelHeaderBookmarks;
