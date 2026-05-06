// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';
import {Pressable, type StyleProp, StyleSheet, View, type ViewStyle} from 'react-native';

import {updateThreadFollowing} from '@actions/remote/thread';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
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
        },
        containerActive: {
            backgroundColor: changeOpacity(theme.sidebarHeaderTextColor, 0.24),
            borderColor: 'transparent',
            opacity: 1,
        },
        pressed: {
            opacity: 0.72,
        },
        text: {
            color: theme.sidebarHeaderTextColor,
            ...typography('Heading', 75),
        },
    };
});

const messages = defineMessages({
    follow: {
        id: 'threads.follow',
        defaultMessage: 'Follow',
    },
    following: {
        id: 'threads.following',
        defaultMessage: 'Following',
    },
});

function ThreadFollow({isFollowing, teamId, threadId}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const serverUrl = useServerUrl();

    const onPress = usePreventDoubleTap(useCallback(() => {
        updateThreadFollowing(serverUrl, teamId, threadId, !isFollowing, false);
    }, [isFollowing, serverUrl, teamId, threadId]));

    if (!threadId) {
        return null;
    }

    const containerStyle: StyleProp<ViewStyle> = [styles.container];
    let followTextProps = messages.follow;
    if (isFollowing) {
        containerStyle.push(styles.containerActive);
        followTextProps = messages.following;
    }

    const followThreadButtonTestId = isFollowing ? 'thread.following_thread.button' : 'thread.follow_thread.button';

    return (
        <Pressable
            onPress={onPress}
            testID={followThreadButtonTestId}
            style={({pressed}) => [pressed && styles.pressed]}
        >
            <View style={containerStyle}>
                <FormattedText
                    {...followTextProps}
                    style={styles.text}
                />
            </View>
        </Pressable>
    );
}

export default ThreadFollow;
