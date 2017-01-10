// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {TouchableHighlight, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {OnlineStatus, AwayStatus, OfflineStatus} from 'app/components/status_icons';
import {changeOpacity} from 'app/utils/colors';

import {Constants} from 'service/constants';

import Badge from './badge';

export default class ChannelItem extends React.Component {
    static propTypes = {
        channel: React.PropTypes.object.isRequired,
        onSelectChannel: React.PropTypes.func.isRequired,
        isActive: React.PropTypes.bool.isRequired,
        hasUnread: React.PropTypes.bool.isRequired,
        mentions: React.PropTypes.number.isRequired,
        theme: React.PropTypes.object.isRequired
    };

    render() {
        const {
            channel,
            theme,
            mentions,
            hasUnread,
            isActive
        } = this.props;

        let iconColor = changeOpacity(theme.centerChannelColor, 0.7);
        let icon;
        let activeBorder;
        let badge;

        if (mentions && !isActive) {
            const badgeStyle = {
                position: 'absolute',
                top: 10,
                right: 10,
                flexDirection: 'row',
                backgroundColor: theme.mentionBj
            };

            const mentionStyle = {
                color: theme.mentionColor,
                fontSize: 14
            };

            badge = (
                <Badge
                    style={badgeStyle}
                    countStyle={mentionStyle}
                    count={mentions}
                    minHeight={20}
                    minWidth={20}
                />
            );
        }

        const itemStyle = {
            alignItems: 'center',
            height: 40,
            paddingLeft: 20,
            paddingRight: 10,
            flex: 1,
            flexDirection: 'row'
        };

        const style = {
            marginLeft: 5,
            opacity: 0.6,
            color: theme.sidebarText
        };

        const activeStyle = {
            width: 5,
            height: 40,
            backgroundColor: theme.sidebarTextActiveBorder,
            position: 'absolute'
        };

        if (hasUnread) {
            style.fontWeight = 'bold';
            style.color = theme.sidebarUnreadText;
            style.opacity = 1;
            iconColor = theme.centerChannelColor;
        }

        if (isActive) {
            iconColor = theme.sidebarTextActiveColor;
            style.color = theme.sidebarTextActiveColor;
            style.opacity = 1;
            itemStyle.backgroundColor = changeOpacity(theme.sidebarTextActiveColor, 0.1);

            activeBorder = (
                <View style={activeStyle}/>
            );
        }

        if (channel.type === Constants.OPEN_CHANNEL) {
            icon = (
                <Icon
                    name='globe'
                    size={15}
                    color={iconColor}
                />
            );
        } else if (channel.type === Constants.PRIVATE_CHANNEL) {
            icon = (
                <Icon
                    name='lock'
                    size={15}
                    color={iconColor}
                />
            );
        } else {
            switch (channel.status) {
            case Constants.ONLINE:
                icon = (
                    <OnlineStatus
                        width={13}
                        height={13}
                        color={theme.onlineIndicator}
                    />
                );
                break;
            case Constants.AWAY:
                icon = (
                    <AwayStatus
                        width={13}
                        height={13}
                        color={theme.awayIndicator}
                    />
                );
                break;
            default:
                icon = (
                    <OfflineStatus
                        width={13}
                        height={13}
                        color={changeOpacity(theme.centerChannelColor, 0.7)}
                    />
                );
                break;
            }
        }

        return (
            <TouchableHighlight
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.3)}
                onPress={() => this.props.onSelectChannel(channel)}
            >
                <View style={{flex: 1}}>
                    {activeBorder}
                    <View style={itemStyle}>
                        {icon}
                        <Text
                            style={style}
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
