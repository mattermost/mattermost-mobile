// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    View,
} from 'react-native';

import {General} from '@mm-redux/constants';

import CompassIcon from '@components/compass_icon';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

export default class ChannelIcon extends React.PureComponent {
    static propTypes = {
        isActive: PropTypes.bool,
        isInfo: PropTypes.bool,
        isUnread: PropTypes.bool,
        hasDraft: PropTypes.bool,
        membersCount: PropTypes.number,
        size: PropTypes.number,
        status: PropTypes.string,
        theme: PropTypes.object.isRequired,
        type: PropTypes.string.isRequired,
        isArchived: PropTypes.bool.isRequired,
        isBot: PropTypes.bool.isRequired,
        testID: PropTypes.string,
    };

    static defaultProps = {
        isActive: false,
        isInfo: false,
        isUnread: false,
        size: 12,
    };

    render() {
        const {
            isActive,
            isUnread,
            isInfo,
            hasDraft,
            membersCount,
            size,
            status,
            theme,
            type,
            isArchived,
            isBot,
            testID,
        } = this.props;
        const style = getStyleSheet(theme);

        let activeIcon;
        let unreadIcon;
        let activeGroupBox;
        let unreadGroupBox;
        let activeGroup;
        let unreadGroup;
        let offlineColor = changeOpacity(theme.sidebarText, 0.5);

        if (isUnread) {
            unreadIcon = style.iconUnread;
            unreadGroupBox = style.groupBoxUnread;
            unreadGroup = style.groupUnread;
        }

        if (isActive) {
            activeIcon = style.iconActive;
            activeGroupBox = style.groupBoxActive;
            activeGroup = style.groupActive;
        }

        if (isInfo) {
            activeIcon = style.iconInfo;
            activeGroupBox = style.groupBoxInfo;
            activeGroup = style.groupInfo;
            offlineColor = changeOpacity(theme.centerChannelColor, 0.5);
        }

        let icon;
        if (isArchived) {
            icon = (
                <CompassIcon
                    name='archive-outline'
                    style={[style.icon, unreadIcon, activeIcon, {fontSize: size}]}
                    testID={`${testID}.archive`}
                />
            );
        } else if (isBot) {
            icon = (
                <CompassIcon
                    name='robot-happy'
                    style={[style.icon, unreadIcon, activeIcon, {fontSize: size, left: -1.5, top: -1}]}
                    testID={`${testID}.bot`}
                />
            );
        } else if (hasDraft) {
            icon = (
                <CompassIcon
                    name='pencil-outline'
                    style={[style.icon, unreadIcon, activeIcon, {fontSize: size}]}
                    testID={`${testID}.draft`}
                />
            );
        } else if (type === General.OPEN_CHANNEL) {
            icon = (
                <CompassIcon
                    name='globe'
                    style={[style.icon, unreadIcon, activeIcon, {fontSize: size}]}
                    testID={`${testID}.public`}
                />
            );
        } else if (type === General.PRIVATE_CHANNEL) {
            icon = (
                <CompassIcon
                    name='lock-outline'
                    style={[style.icon, unreadIcon, activeIcon, {fontSize: size, left: 0.5}]}
                    testID={`${testID}.private`}
                />
            );
        } else if (type === General.GM_CHANNEL) {
            const fontSize = (size - 10);
            icon = (
                <View style={[style.groupBox, unreadGroupBox, activeGroupBox, {width: size, height: size}]}>
                    <Text
                        style={[style.group, unreadGroup, activeGroup, {fontSize}]}
                        testID={`${testID}.gm_member_count`}
                    >
                        {membersCount}
                    </Text>
                </View>
            );
        } else if (type === General.DM_CHANNEL) {
            switch (status) {
            case General.AWAY:
                icon = (
                    <CompassIcon
                        name='clock'
                        style={[style.icon, unreadIcon, activeIcon, {fontSize: size, color: theme.awayIndicator}]}
                        testID={`${testID}.away`}
                    />
                );
                break;
            case General.DND:
                icon = (
                    <CompassIcon
                        name='minus-circle'
                        style={[style.icon, unreadIcon, activeIcon, {fontSize: size, color: theme.dndIndicator}]}
                        testID={`${testID}.dnd`}
                    />
                );
                break;
            case General.ONLINE:
                icon = (
                    <CompassIcon
                        name='check-circle'
                        style={[style.icon, unreadIcon, activeIcon, {fontSize: size, color: theme.onlineIndicator}]}
                        testID={`${testID}.online`}
                    />
                );
                break;
            default:
                icon = (
                    <CompassIcon
                        name='circle-outline'
                        style={[style.icon, unreadIcon, activeIcon, {fontSize: size, color: offlineColor}]}
                        testID={`${testID}.offline`}
                    />
                );
                break;
            }
        }

        return (
            <View style={[style.container, {height: size}]}>
                {icon}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            marginRight: 8,
            alignItems: 'center',
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
            alignSelf: 'flex-start',
            alignItems: 'center',
            backgroundColor: changeOpacity(theme.sidebarText, 0.3),
            borderColor: changeOpacity(theme.sidebarText, 0.3),
            borderWidth: 1,
            borderRadius: 2,
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
            color: changeOpacity(theme.sidebarText, 0.6),
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
