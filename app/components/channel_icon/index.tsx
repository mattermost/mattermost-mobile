// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable */
import React from 'react';
import {type StyleProp, type TextStyle, View, type ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import General from '@constants/general';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

// Generate consistent color based on channel name
const generateAvatarColor = (name: string): string => {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
        '#A9DFBF', '#F9E79F', '#D5A6BD', '#A3E4D7', '#FADBD8',
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
};

import DmAvatar from './dm_avatar';

type ChannelIconProps = {
    hasDraft?: boolean;
    isActive?: boolean;
    isArchived?: boolean;
    isOnCenterBg?: boolean;
    isUnread?: boolean;
    isMuted?: boolean;
    membersCount?: number;
    name: string;
    shared: boolean;
    size?: number;
    style?: StyleProp<Intersection<TextStyle, ViewStyle>>;
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
        iconOnCenterBg: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
        },
        iconUnreadOnCenterBg: {
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
        groupBoxOnCenterBg: {
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
        groupOnCenterBg: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
        },
        groupUnreadOnCenterBg: {
            color: theme.centerChannelColor,
        },
        muted: {
            opacity: 0.4,
        },
    };
});

const ChannelIcon = ({
    hasDraft = false, isActive = false, isArchived = false,
    isOnCenterBg = false, isUnread = false, isMuted = false,
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

    if (isOnCenterBg) {
        activeIcon = isUnread && !isMuted ? styles.iconUnreadOnCenterBg : styles.iconOnCenterBg;
        activeGroupBox = styles.groupBoxOnCenterBg;
        activeGroup = isUnread ? styles.groupUnreadOnCenterBg : styles.groupOnCenterBg;
    }

    if (isMuted) {
        mutedStyle = styles.muted;
    }

    const commonStyles: StyleProp<Intersection<TextStyle, ViewStyle>> = [
        style,
        mutedStyle,
    ];

    const commonIconStyles: StyleProp<TextStyle> = [
        styles.icon,
        unreadIcon,
        activeIcon,
        commonStyles,
        {fontSize: size},
    ];

    let icon = null;
    if (isArchived) {
        icon = (
            <CompassIcon
                name='archive-outline'
                style={[
                    commonIconStyles,
                    {left: 1},
                ]}
                testID={`${testID}.archive`}
            />
        );
    } else if (hasDraft) {
        icon = (
            <CompassIcon
                name='pencil-outline'
                style={[
                    commonIconStyles,
                    {left: 2},
                ]}
                testID={`${testID}.draft`}
            />
        );
    } else if (shared) {
        const iconName = type === General.PRIVATE_CHANNEL ? 'circle-multiple-outline-lock' : 'circle-multiple-outline';
        const sharedTestID = type === General.PRIVATE_CHANNEL ? 'channel_icon.shared_private' : 'channel_icon.shared_open';
        icon = (
            <CompassIcon
                name={iconName}
                style={[
                    commonIconStyles,
                    {left: 0.5},
                ]}
                testID={sharedTestID}
            />
        );
    } else if (type === General.OPEN_CHANNEL) {
        icon = (
            <CompassIcon
                name='globe'
                style={[
                    commonIconStyles,
                    {left: 1},
                ]}
                testID={`${testID}.public`}
            />
        );
    } else if (type === General.PRIVATE_CHANNEL) {
        icon = (
            <CompassIcon
                name='lock-outline'
                style={[
                    commonIconStyles,
                    {left: 0.5},
                ]}
                testID={`${testID}.private`}
            />
        );
    } else if (type === General.GM_CHANNEL) {
        // Render GM as circular avatar with group icon and random color
        const iconSize = Math.max(10, size - 12);
        const avatarColor = generateAvatarColor(name);
        icon = (
            <View
                style={[
                    styles.groupBox,
                    unreadGroupBox,
                    activeGroupBox,
                    commonStyles,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        padding: 2,
                        backgroundColor: avatarColor,
                    },
                ]}
            >
                <CompassIcon
                    name='account-multiple-outline'
                    style={[
                        styles.group,
                        unreadGroup,
                        activeGroup,
                        {
                            fontSize: iconSize,
                            lineHeight: iconSize,
                            color: '#FFFFFF', // White icon on colored background
                        },
                    ]}
                    testID={`${testID}.gm_icon`}
                />
            </View>
        );
    } else if (type === General.DM_CHANNEL) {
        icon = (
            <DmAvatar
                channelName={name}
                isOnCenterBg={isOnCenterBg}
                style={commonStyles}
                size={size}
            />
        );
    }

    return icon;
};

export default React.memo(ChannelIcon);
