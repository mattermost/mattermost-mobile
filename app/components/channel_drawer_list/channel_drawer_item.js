// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    StyleSheet,
    TouchableHighlight,
    Text,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {OnlineStatus, AwayStatus, OfflineStatus} from 'app/components/status_icons';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {Constants} from 'mattermost-redux/constants';

export default class ChannelDrawerItem extends PureComponent {
    static propTypes = {
        channel: PropTypes.object.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
        onLongPress: PropTypes.func,
        isActive: PropTypes.bool.isRequired,
        hasUnread: PropTypes.bool.isRequired,
        mentions: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired
    };

    render() {
        const {
            channel,
            theme,
            mentions,
            hasUnread,
            isActive
        } = this.props;

        const style = getStyleSheet(theme);
        let activeItem;
        let activeIcon;
        let unreadIcon;
        let activeGroupBox;
        let unreadGroupBox;
        let activeGroup;
        let unreadGroup;
        let activeText;
        let unreadText;

        let activeBorder;
        let icon;
        let badge;

        if (mentions && !isActive) {
            badge = (
                <View style={style.badgeContainer}>
                    <Text style={style.badge}>
                        {mentions}
                    </Text>
                </View>
            );
        }

        if (hasUnread) {
            unreadIcon = style.iconUnread;
            unreadText = style.textUnread;
            unreadGroupBox = style.groupBoxUnread;
            unreadGroup = style.groupUnread;
        }

        if (isActive) {
            activeItem = style.itemActive;
            activeIcon = style.iconActive;
            activeGroupBox = style.groupBoxActive;
            activeGroup = style.groupActive;
            activeText = style.textActive;

            activeBorder = (
                <View style={style.borderActive}/>
            );
        }

        if (channel.type === Constants.OPEN_CHANNEL) {
            icon = (
                <Icon
                    name='globe'
                    style={[style.icon, unreadIcon, activeIcon]}
                />
            );
        } else if (channel.type === Constants.PRIVATE_CHANNEL) {
            icon = (
                <Icon
                    name='lock'
                    style={[style.icon, unreadIcon, activeIcon]}
                />
            );
        } else if (channel.type === Constants.GM_CHANNEL) {
            icon = (
                <View style={style.groupContainer}>
                    <View style={[style.groupBox, unreadGroupBox, activeGroupBox]}>
                        <Text style={[style.group, unreadGroup, activeGroup]}>
                            {channel.display_name.split(',').length}
                        </Text>
                    </View>
                </View>
            );
        } else {
            switch (channel.status) {
            case Constants.ONLINE:
                icon = (
                    <View style={style.statusIcon}>
                        <OnlineStatus
                            width={12}
                            height={12}
                            color={theme.onlineIndicator}
                        />
                    </View>
                );
                break;
            case Constants.AWAY:
                icon = (
                    <View style={style.statusIcon}>
                        <AwayStatus
                            width={12}
                            height={12}
                            color={theme.awayIndicator}
                        />
                    </View>
                );
                break;
            default:
                icon = (
                    <View style={style.statusIcon}>
                        <OfflineStatus
                            width={12}
                            height={12}
                            color={changeOpacity(theme.centerChannelColor, 0.4)}
                        />
                    </View>
                );
                break;
            }
        }

        return (
            <TouchableHighlight
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                onPress={() => this.props.onSelectChannel(channel)}
                delayLongPress={1000}
                onLongPress={() => {
                    this.props.onLongPress(channel);
                }}
            >
                <View style={style.container}>
                    {activeBorder}
                    <View style={[style.item, activeItem]}>
                        {icon}
                        <Text
                            style={[style.text, unreadText, activeText]}
                            ellipsizeMode='tail'
                            numberOfLines={1}
                        >
                            {channel.display_name}
                        </Text>
                        {badge}
                    </View>
                </View>
            </TouchableHighlight>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'row',
            height: 44
        },
        borderActive: {
            backgroundColor: theme.sidebarTextActiveBorder,
            width: 5
        },
        item: {
            alignItems: 'center',
            height: 44,
            flex: 1,
            flexDirection: 'row',
            paddingLeft: 16
        },
        itemActive: {
            backgroundColor: changeOpacity(theme.sidebarTextActiveColor, 0.1),
            paddingLeft: 11
        },
        icon: {
            color: changeOpacity(theme.sidebarText, 0.4),
            fontSize: 12,
            paddingRight: 12
        },
        iconActive: {
            color: theme.sidebarTextActiveColor
        },
        iconUnread: {
            color: theme.sidebarUnreadText
        },
        statusIcon: {
            paddingRight: 12
        },
        groupContainer: {
            paddingRight: 12
        },
        groupBox: {
            alignItems: 'center',
            borderWidth: 1,
            borderColor: changeOpacity(theme.sidebarText, 0.4),
            height: 15,
            justifyContent: 'center',
            width: 12
        },
        groupBoxActive: {
            borderColor: theme.sidebarTextActiveColor
        },
        groupBoxUnread: {
            borderColor: theme.sidebarUnreadText
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
        text: {
            color: changeOpacity(theme.sidebarText, 0.4),
            flex: 1,
            fontSize: 14,
            fontWeight: '600',
            lineHeight: 16,
            paddingRight: 40
        },
        textActive: {
            color: theme.sidebarTextActiveColor
        },
        textUnread: {
            color: theme.sidebarUnreadText
        },
        badgeContainer: {
            alignItems: 'center',
            backgroundColor: theme.mentionBj,
            height: 15,
            justifyContent: 'center',
            marginRight: 16,
            width: 15
        },
        badge: {
            color: theme.mentionColor,
            fontSize: 10,
            fontWeight: '600'
        }
    });
});
