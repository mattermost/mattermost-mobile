// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    StyleSheet,
    TouchableHighlight,
    Text,
    View
} from 'react-native';

import ChanneIcon from 'app/components/channel_icon';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelDrawerItem extends PureComponent {
    static propTypes = {
        channel: PropTypes.object.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
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
            isActive,
            onSelectChannel
        } = this.props;

        const style = getStyleSheet(theme);
        let activeItem;
        let activeText;
        let unreadText;

        let activeBorder;
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
                onPress={() => preventDoubleTap(onSelectChannel, this, channel)}
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
            borderRadius: 7,
            height: 15,
            justifyContent: 'center',
            marginRight: 16,
            width: 16
        },
        badge: {
            color: theme.mentionColor,
            fontSize: 10,
            fontWeight: '600'
        }
    });
});
