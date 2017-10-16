// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    TouchableHighlight,
    Text,
    View
} from 'react-native';

import Badge from 'app/components/badge';
import ChannelIcon from 'app/components/channel_icon';
import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelUnreadItem extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string.isRequired,
        currentChannelId: PropTypes.string.isRequired,
        displayName: PropTypes.string.isRequired,
        hasUnread: PropTypes.bool.isRequired,
        mentions: PropTypes.number.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
        status: PropTypes.string,
        type: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired
    };

    onPress = wrapWithPreventDoubleTap(() => {
        const {channelId, currentChannelId, displayName, onSelectChannel} = this.props;
        requestAnimationFrame(() => {
            onSelectChannel({id: channelId, display_name: displayName}, currentChannelId);
        });
    });

    render() {
        const {
            displayName,
            mentions,
            hasUnread,
            status,
            theme,
            type
        } = this.props;

        const style = getStyleSheet(theme);

        let badge;
        if (mentions) {
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

        const icon = (
            <ChannelIcon
                isActive={false}
                hasUnread={hasUnread}
                membersCount={displayName.split(',').length}
                size={16}
                status={status}
                theme={theme}
                type={type}
            />
        );

        return (
            <TouchableHighlight
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                onPress={this.onPress}
            >
                <View style={style.container}>
                    <View style={style.item}>
                        {icon}
                        <Text
                            style={style.text}
                            ellipsizeMode='tail'
                            numberOfLines={1}
                        >
                            {displayName}
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
        item: {
            alignItems: 'center',
            height: 44,
            flex: 1,
            flexDirection: 'row',
            paddingLeft: 16
        },
        text: {
            color: theme.sidebarUnreadText,
            flex: 1,
            fontSize: 14,
            fontWeight: '600',
            lineHeight: 16,
            paddingRight: 40
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
