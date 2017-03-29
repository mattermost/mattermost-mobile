// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {
    StyleSheet,
    Text,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {OnlineStatus, AwayStatus, OfflineStatus} from 'app/components/status_icons';

import {Constants} from 'mattermost-redux/constants';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

function channelIcon(props) {
    const {isActive, hasUnread, isInfo, membersCount, size, status, theme, type} = props;
    const style = getStyleSheet(theme);

    let activeIcon;
    let unreadIcon;
    let activeGroupBox;
    let unreadGroupBox;
    let activeGroup;
    let unreadGroup;

    if (hasUnread) {
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
    }

    if (type === Constants.OPEN_CHANNEL) {
        return (
            <Icon
                name='globe'
                style={[style.icon, unreadIcon, activeIcon, {fontSize: size}]}
            />
        );
    } else if (type === Constants.PRIVATE_CHANNEL) {
        return (
            <Icon
                name='lock'
                style={[style.icon, unreadIcon, activeIcon, {fontSize: size}]}
            />
        );
    } else if (type === Constants.GM_CHANNEL) {
        return (
            <View style={style.groupContainer}>
                <View style={[style.groupBox, unreadGroupBox, activeGroupBox, {width: size, height: size}]}>
                    <Text style={[style.group, unreadGroup, activeGroup, {fontSize: (size - 6)}]}>
                        {membersCount}
                    </Text>
                </View>
            </View>
        );
    }
    switch (status) {
    case Constants.ONLINE:
        return (
            <View style={style.statusIcon}>
                <OnlineStatus
                    width={size}
                    height={size}
                    color={theme.onlineIndicator}
                />
            </View>
        );
    case Constants.AWAY:
        return (
            <View style={style.statusIcon}>
                <AwayStatus
                    width={size}
                    height={size}
                    color={theme.awayIndicator}
                />
            </View>
        );
    default:
        return (
            <View style={style.statusIcon}>
                <OfflineStatus
                    width={size}
                    height={size}
                    color={changeOpacity(theme.sidebarText, 0.5)}
                />
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        icon: {
            color: changeOpacity(theme.sidebarText, 0.4),
            paddingRight: 12
        },
        iconActive: {
            color: theme.sidebarTextActiveColor
        },
        iconUnread: {
            color: theme.sidebarUnreadText
        },
        iconInfo: {
            color: theme.sidebarText
        },
        statusIcon: {
            paddingRight: 12
        },
        groupContainer: {
            paddingRight: 12
        },
        groupBox: {
            alignSelf: 'flex-start',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: changeOpacity(theme.sidebarText, 0.4),
            justifyContent: 'center'
        },
        groupBoxActive: {
            borderColor: theme.sidebarTextActiveColor
        },
        groupBoxUnread: {
            borderColor: theme.sidebarUnreadText
        },
        groupBoxInfo: {
            borderColor: theme.sidebarText
        },
        group: {
            color: changeOpacity(theme.sidebarText, 0.4),
            fontSize: 10,
            fontWeight: '600'
        },
        groupActive: {
            color: theme.sidebarTextActiveColor
        },
        groupUnread: {
            color: theme.sidebarUnreadText
        },
        groupInfo: {
            color: theme.sidebarText
        }
    });
});

channelIcon.propTypes = {
    isActive: PropTypes.bool,
    isInfo: PropTypes.bool,
    hasUnread: PropTypes.bool,
    membersCount: PropTypes.number,
    size: PropTypes.number,
    status: PropTypes.string,
    theme: PropTypes.object.isRequired,
    type: PropTypes.string.isRequired
};

channelIcon.defaultProps = {
    isActive: false,
    isInfo: false,
    hasUnread: false,
    size: 12
};

export default channelIcon;
