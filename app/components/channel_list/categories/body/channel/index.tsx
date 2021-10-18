// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

import {useTheme} from '@app/context/theme';
import {typography} from '@app/utils/typography';
import CompassIcon, {COMPASS_ICONS} from '@components/compass_icon';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingVertical: 4,
        display: 'flex',
        flexDirection: 'row',
    },
    icon: {
        fontSize: 24,
        lineHeight: 28,
        color: changeOpacity(theme.sidebarText, 0.72),
    },
    text: {
        color: changeOpacity(theme.sidebarText, 0.72),
        paddingLeft: 12,
    },
    highlight: {
        color: theme.sidebarText,
    },
}));

type Props = {
    unreadCount?: number;
    highlight?: boolean;
    archived?: boolean;
    muted?: boolean;
    name: string;
    leftIcon: COMPASS_ICONS;
}

const ChannelListItemComponent = (props: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const {unreadCount, highlight, name, leftIcon} = props;

    // Make it brighter if it's highlighted, or has unreads
    const bright = highlight || (unreadCount && unreadCount > 0);

    return (
        <View style={styles.container}>
            {leftIcon && (
                <CompassIcon
                    name={leftIcon}
                    style={styles.icon}
                />
            )}
            <Text
                style={[
                    typography('Body', 200, bright ? 'SemiBold' : 'Regular'),
                    styles.text,

                    bright && styles.highlight,
                ]}
            >
                {name}
            </Text>

        </View>
    );
};

export default ChannelListItemComponent;
