// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';
import Badge from './badge';
import {TouchableHighlight, Text, View} from 'react-native';
import {OnlineStatus, AwayStatus, OfflineStatus} from 'app/components/status_icons';
import {Constants} from 'service/constants';

export default class ChannelItem extends React.Component {
    static propTypes = {
        channel: React.PropTypes.object.isRequired,
        onSelectChannel: React.PropTypes.func.isRequired,
        isActive: React.PropTypes.bool.isRequired,
        hasUnread: React.PropTypes.bool.isRequired,
        mentions: React.PropTypes.number.isRequired,
        theme: React.PropTypes.object.isRequired
    };

    changeOpacity = (oldColor, opacity) => {
        let color = oldColor;
        if (color[0] === '#') {
            color = color.slice(1);
        }

        if (color.length === 3) {
            const tempColor = color;
            color = '';

            color += tempColor[0] + tempColor[0];
            color += tempColor[1] + tempColor[1];
            color += tempColor[2] + tempColor[2];
        }

        const r = parseInt(color.substring(0, 2), 16);
        const g = parseInt(color.substring(2, 4), 16);
        const b = parseInt(color.substring(4, 6), 16);

        return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
    };

    render() {
        const {
            channel,
            theme,
            mentions,
            hasUnread,
            isActive
        } = this.props;

        let iconColor = this.changeOpacity(theme.centerChannelColor, 0.7);
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
            itemStyle.backgroundColor = this.changeOpacity(theme.sidebarTextActiveColor, 0.1);

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
                        color={this.changeOpacity(theme.centerChannelColor, 0.7)}
                    />
                );
                break;
            }
        }

        return (
            <TouchableHighlight
                underlayColor={this.changeOpacity(theme.sidebarTextHoverBg, 0.3)}
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
