// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform, type StyleProp, StyleSheet, TouchableOpacity, View, type ViewStyle} from 'react-native';

import {updateThreadFollowing} from '@actions/remote/thread';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    isFollowing: boolean;
    teamId: string;
    threadId: string;
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
            ...typography('Heading', 75),
        },
    };
});

function ThreadFollow({isFollowing, teamId, threadId}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const serverUrl = useServerUrl();

    const onPress = preventDoubleTap(() => {
        updateThreadFollowing(serverUrl, teamId, threadId, !isFollowing, false);
    });

    if (!threadId) {
        return null;
    }

    const containerStyle: StyleProp<ViewStyle> = [styles.container];
    let followTextProps = {
        id: t('threads.follow'),
        defaultMessage: 'Follow',
    };
    if (isFollowing) {
        containerStyle.push(styles.containerActive);
        followTextProps = {
            id: t('threads.following'),
            defaultMessage: 'Following',
        };
    }

    const followThreadButtonTestId = isFollowing ? 'thread.following_thread.button' : 'thread.follow_thread.button';

    return (
        <TouchableOpacity
            onPress={onPress}
            testID={followThreadButtonTestId}
        >
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
