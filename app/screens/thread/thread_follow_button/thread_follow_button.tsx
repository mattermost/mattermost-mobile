// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, StyleSheet, TouchableOpacity, View} from 'react-native';

import {updateThreadFollowing} from '@actions/remote/thread';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type ThreadModel from '@typings/database/models/servers/thread';

type Props = {
    teamId: string;
    thread: ThreadModel;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            borderColor: theme.sidebarHeaderTextColor,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: 4,
            paddingVertical: 4.5,
            paddingHorizontal: 10,
            opacity: 0.72,
            ...Platform.select({
                android: {
                    marginRight: 12,
                },
                ios: {
                    right: -4,
                },
            }),
        },
        containerActive: {
            backgroundColor: changeOpacity(theme.sidebarHeaderTextColor, 0.24),
            borderColor: 'transparent',
            opacity: 1,
        },
        text: {
            color: theme.sidebarHeaderTextColor,
            ...typography('Heading', 75, 'SemiBold'),
        },
    };
});

function ThreadFollow({teamId, thread}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const serverUrl = useServerUrl();

    const onPress = preventDoubleTap(() => {
        updateThreadFollowing(serverUrl, teamId, thread.id, !thread.isFollowing);
    });

    const containerStyle = [styles.container];
    let followTextProps = {
        id: 'threads.follow',
        defaultMessage: 'Follow',
    };
    if (thread.isFollowing) {
        containerStyle.push(styles.containerActive);
        followTextProps = {
            id: 'threads.following',
            defaultMessage: 'Following',
        };
    }

    return (
        <TouchableOpacity onPress={onPress}>
            <View style={containerStyle}>
                <FormattedText
                    {...followTextProps}
                    style={styles.text}
                />
            </View>
        </TouchableOpacity>
    );
}

export default ThreadFollow;
