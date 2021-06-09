// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleProp, Text, View, ViewStyle} from 'react-native';

import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';
import {General} from '@mm-redux/constants';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/preferences';

type Props = {
    hasDraft: boolean;
    isActive: boolean;
    isArchived: boolean;
    isInfo: boolean;
    isUnread: boolean;
    membersCount: number;
    shared: boolean;
    size: number;
    statusStyle?: StyleProp<ViewStyle>;
    style?: StyleProp<ViewStyle>;
    testID?: string;
    theme: Theme;
    type: string;
    userId?: string;
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
            color: theme.sidebarTextActiveColor,
        },
        iconUnread: {
            color: theme.sidebarUnreadText,
        },
        iconInfo: {
            color: theme.centerChannelColor,
        },
        groupBox: {
            alignItems: 'center',
            backgroundColor: changeOpacity(theme.sidebarText, 0.16),
            borderRadius: 4,
            justifyContent: 'center',
        },
        groupBoxActive: {
            backgroundColor: changeOpacity(theme.sidebarTextActiveColor, 0.3),
        },
        groupBoxUnread: {
            backgroundColor: changeOpacity(theme.sidebarUnreadText, 0.3),
        },
        groupBoxInfo: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.3),
        },
        group: {
            color: theme.sidebarText,
            fontSize: 10,
            fontWeight: '600',
        },
        groupActive: {
            color: theme.sidebarTextActiveColor,
        },
        groupUnread: {
            color: theme.sidebarUnreadText,
        },
        groupInfo: {
            color: theme.centerChannelColor,
        },
    };
});

const ChannelIcon = (props: Props) => {
    const style = getStyleSheet(props.theme);

    let activeIcon;
    let unreadIcon;
    let activeGroupBox;
    let unreadGroupBox;
    let activeGroup;
    let unreadGroup;

    if (props.isUnread) {
        unreadIcon = style.iconUnread;
        unreadGroupBox = style.groupBoxUnread;
        unreadGroup = style.groupUnread;
    }

    if (props.isActive) {
        activeIcon = style.iconActive;
        activeGroupBox = style.groupBoxActive;
        activeGroup = style.groupActive;
    }

    if (props.isInfo) {
        activeIcon = style.iconInfo;
        activeGroupBox = style.groupBoxInfo;
        activeGroup = style.groupInfo;
    }

    let icon;
    if (props.isArchived) {
        icon = (
            <CompassIcon
                name='archive-outline'
                style={[style.icon, unreadIcon, activeIcon, {fontSize: props.size, left: 1}]}
                testID={`${props.testID}.archive`}
            />
        );
    } else if (props.hasDraft) {
        icon = (
            <CompassIcon
                name='pencil-outline'
                style={[style.icon, unreadIcon, activeIcon, {fontSize: props.size, left: 2}]}
                testID={`${props.testID}.draft`}
            />
        );
    } else if (props.shared) {
        const iconName = props.type === General.PRIVATE_CHANNEL ? 'circle-multiple-outline-lock' : 'circle-multiple-outline';
        const sharedTestID = props.type === General.PRIVATE_CHANNEL ? 'channel_icon.shared_private' : 'channel_icon.shared_open';
        icon = (
            <CompassIcon
                name={iconName}
                style={[style.icon, unreadIcon, activeIcon, {fontSize: props.size, left: 0.5}]}
                testID={sharedTestID}
            />
        );
    } else if (props.type === General.OPEN_CHANNEL) {
        icon = (
            <CompassIcon
                name='globe'
                style={[style.icon, unreadIcon, activeIcon, {fontSize: props.size, left: 1}]}
                testID={`${props.testID}.public`}
            />
        );
    } else if (props.type === General.PRIVATE_CHANNEL) {
        icon = (
            <CompassIcon
                name='lock-outline'
                style={[style.icon, unreadIcon, activeIcon, {fontSize: props.size, left: 0.5}]}
                testID={`${props.testID}.private`}
            />
        );
    } else if (props.type === General.GM_CHANNEL) {
        const fontSize = (props.size - 12);
        const boxSize = (props.size - 4);
        icon = (
            <View style={[style.groupBox, unreadGroupBox, activeGroupBox, {width: boxSize, height: boxSize}]}>
                <Text
                    style={[style.group, unreadGroup, activeGroup, {fontSize}]}
                    testID={`${props.testID}.gm_member_count`}
                >
                    {props.membersCount}
                </Text>
            </View>
        );
    } else if (props.type === General.DM_CHANNEL) {
        icon = (
            <ProfilePicture
                size={props.size}
                statusSize={12}
                userId={props.userId}
                testID={props.testID}
                statusStyle={props.statusStyle}
            />
        );
    }

    return (
        <View style={[style.container, {width: props.size, height: props.size}, props.style]}>
            {icon}
        </View>
    );
};

ChannelIcon.defaultProps = {
    hasDraft: false,
    isActive: false,
    isArchived: false,
    isInfo: false,
    isUnread: false,
    membersCount: 0,
    size: 12,
};

export default ChannelIcon;
