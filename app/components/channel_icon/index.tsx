// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, Text, View, ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import General from '@constants/general';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import DmAvatar from './dm_avatar';

type ChannelIconProps = {
    hasDraft?: boolean;
    isActive?: boolean;
    isArchived?: boolean;
    isInfo?: boolean;
    isUnread?: boolean;
    isMuted?: boolean;
    membersCount?: number;
    name: string;
    shared: boolean;
    size?: number;
    style?: StyleProp<ViewStyle>;
    testID?: string;
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
        iconActive: {
            color: theme.sidebarText,
        },
        iconUnread: {
            color: theme.sidebarUnreadText,
        },
        iconInfo: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
        },
        iconInfoUnread: {
            color: theme.centerChannelColor,
        },
        groupBox: {
            alignItems: 'center',
            backgroundColor: changeOpacity(theme.sidebarText, 0.16),
            borderRadius: 4,
            justifyContent: 'center',
        },
        groupBoxActive: {
            backgroundColor: changeOpacity(theme.sidebarText, 0.3),
        },
        groupBoxUnread: {
            backgroundColor: changeOpacity(theme.sidebarUnreadText, 0.3),
        },
        groupBoxInfo: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.3),
        },
        group: {
            color: theme.sidebarText,
            ...typography('Body', 75, 'SemiBold'),
        },
        groupActive: {
            color: theme.sidebarText,
        },
        groupUnread: {
            color: theme.sidebarUnreadText,
        },
        groupInfo: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
        },
        groupInfoUnread: {
            color: theme.centerChannelColor,
        },
        muted: {
            opacity: 0.4,
        },
    };
});

const ChannelIcon = ({
    hasDraft = false, isActive = false, isArchived = false,
    isInfo = false, isUnread = false, isMuted = false,
    membersCount = 0, name,
    shared, size = 12, style, testID, type,
}: ChannelIconProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    let activeIcon;
    let unreadIcon;
    let activeGroupBox;
    let unreadGroupBox;
    let activeGroup;
    let unreadGroup;
    let mutedStyle;

    if (isUnread && !isMuted) {
        unreadIcon = styles.iconUnread;
        unreadGroupBox = styles.groupBoxUnread;
        unreadGroup = styles.groupUnread;
    }

    if (isActive) {
        activeIcon = styles.iconActive;
        activeGroupBox = styles.groupBoxActive;
        activeGroup = styles.groupActive;
    }

    if (isInfo) {
        activeIcon = isUnread && !isMuted ? styles.iconInfoUnread : styles.iconInfo;
        activeGroupBox = styles.groupBoxInfo;
        activeGroup = isUnread ? styles.groupInfoUnread : styles.groupInfo;
    }

    if (isMuted) {
        mutedStyle = styles.muted;
    }

    let icon;
    if (isArchived) {
        icon = (
            <CompassIcon
                name='archive-outline'
                style={[styles.icon, unreadIcon, activeIcon, {fontSize: size, left: 1}]}
                testID={`${testID}.archive`}
            />
        );
    } else if (hasDraft) {
        icon = (
            <CompassIcon
                name='pencil-outline'
                style={[styles.icon, unreadIcon, activeIcon, {fontSize: size, left: 2}]}
                testID={`${testID}.draft`}
            />
        );
    } else if (shared) {
        const iconName = type === General.PRIVATE_CHANNEL ? 'circle-multiple-outline-lock' : 'circle-multiple-outline';
        const sharedTestID = type === General.PRIVATE_CHANNEL ? 'channel_icon.shared_private' : 'channel_icon.shared_open';
        icon = (
            <CompassIcon
                name={iconName}
                style={[styles.icon, unreadIcon, activeIcon, {fontSize: size, left: 0.5}]}
                testID={sharedTestID}
            />
        );
    } else if (type === General.OPEN_CHANNEL) {
        icon = (
            <CompassIcon
                name='globe'
                style={[styles.icon, unreadIcon, activeIcon, {fontSize: size, left: 1}]}
                testID={`${testID}.public`}
            />
        );
    } else if (type === General.PRIVATE_CHANNEL) {
        icon = (
            <CompassIcon
                name='lock-outline'
                style={[styles.icon, unreadIcon, activeIcon, {fontSize: size, left: 0.5}]}
                testID={`${testID}.private`}
            />
        );
    } else if (type === General.GM_CHANNEL) {
        const fontSize = size - 12;
        icon = (
            <View
                style={[styles.groupBox, unreadGroupBox, activeGroupBox, {width: size, height: size}]}
            >
                <Text
                    style={[styles.group, unreadGroup, activeGroup, {fontSize}]}
                    testID={`${testID}.gm_member_count`}
                >
                    {membersCount - 1}
                </Text>
            </View>
        );
    } else if (type === General.DM_CHANNEL) {
        icon = (
            <DmAvatar
                channelName={name}
                isInfo={isInfo}
            />
        );
    }

    return (
        <View style={[styles.container, {width: size, height: size}, style, mutedStyle]}>
            {icon}
        </View>
    );
};

export default React.memo(ChannelIcon);
