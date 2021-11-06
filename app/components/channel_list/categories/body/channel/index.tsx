// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingVertical: 4,
        flexDirection: 'row',
    },
    icon: {
        fontSize: 24,
        lineHeight: 28,
        color: changeOpacity(theme.sidebarText, 0.72),
    },
    text: {
        marginTop: 1,
        color: changeOpacity(theme.sidebarText, 0.72),
        paddingLeft: 12,
    },
    highlight: {
        color: theme.sidebarText,
    },
}));

const textStyle = StyleSheet.create({
    bright: typography('Body', 200, 'SemiBold'),
    regular: typography('Body', 200, 'Regular'),
});

type Props = {
    unreadCount?: number;
    highlight?: boolean;
    name: string;
    icon: string;
}

const ChannelListItem = (props: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const {unreadCount, highlight, name, icon} = props;

    // Make it brighter if it's highlighted, or has unreads
    const bright = highlight || (unreadCount && unreadCount > 0);

    return (
        <View style={styles.container}>
            {icon && (
                <CompassIcon
                    name={icon}
                    style={styles.icon}
                />
            )}
            <Text
                style={[
                    bright ? textStyle.bright : textStyle.regular,
                    styles.text,
                    bright && styles.highlight,
                ]}
            >
                {name}
            </Text>

        </View>
    );
};

export default ChannelListItem;
