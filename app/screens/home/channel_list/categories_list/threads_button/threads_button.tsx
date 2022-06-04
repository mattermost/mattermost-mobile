// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';

import {switchToGlobalThreads} from '@actions/local/thread';
import Badge from '@components/badge';
import {
    getStyleSheet as getChannelItemStyleSheet,
    textStyle as channelItemTextStyle,
} from '@components/channel_item/channel_item';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    baseContainer: {
        marginLeft: -18,
        marginRight: -20,
    },
    icon: {
        color: changeOpacity(theme.sidebarText, 0.5),
        fontSize: 24,
    },
    iconActive: {
        color: theme.sidebarText,
    },
    text: {
        flex: 1,
    },
}));

type Props = {
    currentChannelId: string;
    onlyUnreads: boolean;
    unreadsAndMentions: {
        unreads: number;
        mentions: number;
    };
};

const ThreadsButton = ({currentChannelId, onlyUnreads, unreadsAndMentions}: Props) => {
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();

    const theme = useTheme();
    const styles = getChannelItemStyleSheet(theme);
    const customStyles = getStyleSheet(theme);

    const handlePress = useCallback(preventDoubleTap(() => {
        switchToGlobalThreads(serverUrl);
    }), [serverUrl]);

    const {unreads, mentions} = unreadsAndMentions;
    const isActive = isTablet && !currentChannelId;

    const [containerStyle, iconStyle, textStyle] = useMemo(() => {
        const container = [
            styles.container,
            isActive ? styles.activeItem : undefined,
        ];

        const icon = [
            customStyles.icon,
            isActive || unreads ? customStyles.iconActive : undefined,
        ];

        const text = [
            customStyles.text,
            unreads ? channelItemTextStyle.bold : channelItemTextStyle.regular,
            styles.text,
            unreads ? styles.highlight : undefined,
            isActive ? styles.textActive : undefined,
        ];

        return [container, icon, text];
    }, [customStyles, isActive, styles, unreads]);

    if (onlyUnreads && !isActive && !unreads && !mentions) {
        return null;
    }

    return (
        <TouchableOpacity
            onPress={handlePress}
            testID='channel_list.threads.button'
        >
            <View style={customStyles.baseContainer}>
                <View style={containerStyle}>
                    <CompassIcon
                        name='message-text-outline'
                        style={iconStyle}
                    />
                    <FormattedText
                        id='threads'
                        defaultMessage='Threads'
                        style={textStyle}
                    />
                    <Badge
                        value={mentions}
                        style={styles.badge}
                        visible={mentions > 0}
                    />
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default ThreadsButton;
