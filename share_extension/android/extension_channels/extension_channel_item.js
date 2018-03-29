// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    TouchableHighlight,
    Text,
    View,
} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';

import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import {DirectChannel, GroupChannel, PublicChannel, PrivateChannel} from 'share_extension/common/icons/channel_type';

const channelTypes = {
    D: DirectChannel,
    G: GroupChannel,
    O: PublicChannel,
    P: PrivateChannel,
};

export default class ExtensionChannelItem extends PureComponent {
    static propTypes = {
        channel: PropTypes.object.isRequired,
        currentChannelId: PropTypes.string.isRequired,
        onSelectChannel: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    onPress = preventDoubleTap(() => {
        const {channel, onSelectChannel} = this.props;
        requestAnimationFrame(() => {
            onSelectChannel(channel);
        });
    });

    render() {
        const {
            channel,
            currentChannelId,
            theme,
        } = this.props;

        const style = getStyleSheet(theme);
        const isCurrent = channel.id === currentChannelId;
        let current;

        if (isCurrent) {
            current = (
                <View style={style.checkmarkContainer}>
                    <IonIcon
                        name='md-checkmark'
                        style={style.checkmark}
                    />
                </View>
            );
        }

        const Type = channelTypes[channel.type] || PublicChannel;
        const icon = <Type/>;

        return (
            <TouchableHighlight
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                onPress={this.onPress}
            >
                <View style={style.container}>
                    <View style={style.item}>
                        {icon}
                        <Text
                            style={[style.text]}
                            ellipsizeMode='tail'
                            numberOfLines={1}
                        >
                            {channel.display_name}
                        </Text>
                        {current}
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
            height: 45,
            paddingHorizontal: 15,
        },
        item: {
            alignItems: 'center',
            height: 45,
            flex: 1,
            flexDirection: 'row',
        },
        text: {
            color: theme.centerChannelColor,
            flex: 1,
            fontSize: 16,
            paddingRight: 5,
        },
        iconContainer: {
            marginRight: 5,
        },
        checkmarkContainer: {
            alignItems: 'flex-end',
        },
        checkmark: {
            color: theme.linkColor,
            fontSize: 16,
        },
    };
});
