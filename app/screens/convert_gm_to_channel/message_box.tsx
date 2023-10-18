// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, TextBase, View} from 'react-native';

import CompassIcon from '@app/components/compass_icon';
import {useTheme} from '@app/context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@app/utils/theme';
import {typography} from '@app/utils/typography';

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            backgroundColor: changeOpacity(theme.sidebarTextActiveBorder, 0.08),
            borderWidth: 1,
            borderRadius: 8,
            borderColor: changeOpacity(theme.sidebarTextActiveBorder, 0.16),
            display: 'flex',
            flexDirection: 'row',
            padding: 16,
            gap: 12,
        },
        icon: {
            marginTop: 5,
            fontSize: 20,
            width: 28,
            height: 28,
            borderWidth: 3,
            color: theme.sidebarTextActiveBorder,
            borderColor: theme.sidebarTextActiveBorder,
            borderRadius: 14,
            textAlign: 'center',
        },
        iconContainer: {},
        textContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            flex: 1,
        },
        heading: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'SemiBold'),
        },
        body: {
            color: theme.centerChannelColor,
            ...typography('Body', 100),
        },
        text: {
            color: 'red',
        },
    };
});

export const MessageBox = () => {
    const theme = useTheme();
    const styles = getStyleFromTheme(theme);

    const intl = useIntl();
    const header = intl.formatMessage({
        id: 'channel_info.convert_gm_to_channel.warning.header',
        defaultMessage: 'Conversation history will be visible to any channel members',
    });
    const body = intl.formatMessage({
        id: 'channel_info.convert_gm_to_channel.warning.body',
        defaultMessage: 'You are about to convert the Group Message with Leonard Riley, Regina Wilson, Todd Smith and Aliya Mosta to a Channel. This cannot be undone.',
    });

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <CompassIcon
                    name='exclamation-thick'
                    style={styles.icon}
                />
            </View>
            <View style={styles.textContainer}>
                <View>
                    <Text style={styles.heading}>
                        {header}
                    </Text>
                </View>
                <View>
                    <Text style={styles.body}>
                        {body}
                    </Text>
                </View>
            </View>
        </View>
    );
};
