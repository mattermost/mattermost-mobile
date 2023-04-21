// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type StyleProp, Text, View, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import General from '@constants/general';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Avatar from './avatar';

import type {Database} from '@nozbe/watermelondb';

type ChannelIconProps = {
    database: Database;
    membersCount?: number;
    name: string;
    shared: boolean;
    size?: number;
    style?: StyleProp<ViewStyle>;
    theme: Theme;
    type: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignItems: 'center',
            justifyContent: 'center',
        },
        icon: {
            color: changeOpacity(theme.sidebarText, 0.4),
        },
        iconInfo: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
        },
        groupBox: {
            alignItems: 'center',
            backgroundColor: changeOpacity(theme.sidebarText, 0.16),
            borderRadius: 4,
            justifyContent: 'center',
        },
        groupBoxInfo: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.3),
        },
        group: {
            color: theme.sidebarText,
            ...typography('Body', 75, 'SemiBold'),
        },
        groupInfo: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
        },
    };
});

const ChannelIcon = ({
    database, membersCount = 0, name,
    shared, size = 12, style, theme, type,
}: ChannelIconProps) => {
    const styles = getStyleSheet(theme);

    let icon;
    if (shared) {
        const iconName = type === General.PRIVATE_CHANNEL ? 'circle-multiple-outline-lock' : 'circle-multiple-outline';
        icon = (
            <CompassIcon
                name={iconName}
                style={[styles.icon, styles.iconInfo, {fontSize: size, left: 0.5}]}
            />
        );
    } else if (type === General.OPEN_CHANNEL) {
        icon = (
            <CompassIcon
                name='globe'
                style={[styles.icon, styles.iconInfo, {fontSize: size, left: 1}]}
            />
        );
    } else if (type === General.PRIVATE_CHANNEL) {
        icon = (
            <CompassIcon
                name='lock-outline'
                style={[styles.icon, styles.iconInfo, {fontSize: size, left: 0.5}]}
            />
        );
    } else if (type === General.GM_CHANNEL) {
        const fontSize = size - 12;
        icon = (
            <View
                style={[styles.groupBox, styles.groupBoxInfo, {width: size, height: size}]}
            >
                <Text
                    style={[styles.group, styles.groupInfo, {fontSize}]}
                >
                    {membersCount - 1}
                </Text>
            </View>
        );
    } else if (type === General.DM_CHANNEL) {
        icon = (
            <Avatar
                channelName={name}
                database={database}
                theme={theme}
            />
        );
    }

    return (
        <View style={[styles.container, {width: size, height: size}, style]}>
            {icon}
        </View>
    );
};

export default React.memo(ChannelIcon);
