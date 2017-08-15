// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    TouchableHighlight,
    Text,
    View
} from 'react-native';

import Badge from 'app/components/badge';
import ChanneIcon from 'app/components/channel_icon';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelItem extends PureComponent {
    static propTypes = {
        channel: PropTypes.object.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
        isActive: PropTypes.bool.isRequired,
        hasUnread: PropTypes.bool.isRequired,
        mentions: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired
    };

    onPress = () => {
        const {channel, onSelectChannel} = this.props;
        setTimeout(() => {
            preventDoubleTap(onSelectChannel, this, channel);
        }, 100);
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
        let activeText;
        let unreadText;

        let activeBorder;
        let badge;

        if (mentions && !isActive) {
            badge = (
                <Badge
                    style={style.badge}
                    countStyle={style.mention}
                    count={mentions}
                    minHeight={20}
                    minWidth={20}
                    onPress={this.onPress}
                />
            );
        }

        if (hasUnread) {
            unreadText = style.textUnread;
        }

        if (isActive) {
            activeItem = style.itemActive;
            activeText = style.textActive;

            activeBorder = (
                <View style={style.borderActive}/>
            );
        }

        const icon = (
            <ChanneIcon
                isActive={isActive}
                hasUnread={hasUnread}
                membersCount={channel.display_name.split(',').length}
                size={16}
                status={channel.status}
                theme={theme}
                type={channel.type}
            />
        );

        return (
            <TouchableHighlight
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                onPress={this.onPress}
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
    return {
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
        badge: {
            backgroundColor: theme.mentionBj,
            borderColor: theme.sidebarHeaderBg,
            borderRadius: 10,
            borderWidth: 1,
            padding: 3,
            position: 'relative',
            right: 16
        },
        mention: {
            color: theme.mentionColor,
            fontSize: 10
        }
    };
});
