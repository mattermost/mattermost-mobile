// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {TouchableOpacity, View} from 'react-native';

import {switchToGlobalThreads} from '@actions/local/thread';
import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        display: 'flex',
        flexDirection: 'row',
        paddingLeft: 3,
    },
    badge: {
        backgroundColor: theme.mentionBg,
        position: 'relative',
        left: 0,
    },
    icon: {
        color: changeOpacity(theme.sidebarText, 0.5),
        fontSize: 24,
    },
    iconHighlight: {
        color: theme.sidebarText,
    },
    textContainer: {
        flex: 1,
    },
    text: {
        color: changeOpacity(theme.sidebarText, 0.72),
        paddingLeft: 9,
        ...typography('Body', 200, 'Regular'),
    },
    textHighlight: {
        color: theme.sidebarText,
        ...typography('Body', 200, 'SemiBold'),
    },
}));

type Props = {
    currentChannelId: string;
    unreadsAndMentions: {
        unreads: number;
        mentions: number;
    };
};

const ThreadsButton = ({currentChannelId, unreadsAndMentions}: Props) => {
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();

    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handlePress = useCallback(preventDoubleTap(() => {
        switchToGlobalThreads(serverUrl);
    }), [serverUrl]);

    const {unreads, mentions} = unreadsAndMentions;

    const [iconStyle, textStyle] = useMemo(() => {
        const icon = [styles.icon];
        const text = [styles.text];

        // Highlight the menu if:
        // 1. There are unreads
        // 2. No channel is selected and it's a tablet, which means thread screen is selected
        if (unreads || (isTablet && !currentChannelId)) {
            icon.push(styles.iconHighlight);
            text.push(styles.textHighlight);
        }
        return [icon, text];
    }, [currentChannelId, isTablet, styles, unreads]);

    return (
        <TouchableOpacity onPress={handlePress} >
            <View style={styles.container}>
                <CompassIcon
                    name='message-text-outline'
                    style={iconStyle}
                />
                <View style={styles.textContainer}>
                    <FormattedText
                        id='threads'
                        defaultMessage='Threads'
                        style={textStyle}
                    />
                </View>
                <Badge
                    borderColor='transparent'
                    value={mentions}
                    style={styles.badge}
                    visible={mentions > 0}
                />
            </View>
        </TouchableOpacity>
    );
};

export default ThreadsButton;
