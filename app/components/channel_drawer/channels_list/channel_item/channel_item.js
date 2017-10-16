// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    TouchableHighlight,
    Text,
    View
} from 'react-native';

import ChannelIcon from 'app/components/channel_icon';
import {wrapWithPreventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelItem extends PureComponent {
    static propTypes = {
        channelId: PropTypes.string.isRequired,
        currentChannelId: PropTypes.string.isRequired,
        displayName: PropTypes.string.isRequired,
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
            channelId,
            currentChannelId,
            displayName,
            status,
            theme,
            type
        } = this.props;

        const style = getStyleSheet(theme);
        const isActive = channelId === currentChannelId;

        let activeItem;
        let activeText;
        let activeBorder;

        if (isActive) {
            activeItem = style.itemActive;
            activeText = style.textActive;

            activeBorder = (
                <View style={style.borderActive}/>
            );
        }

        const icon = (
            <ChannelIcon
                isActive={isActive}
                hasUnread={false}
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
                    {activeBorder}
                    <View style={[style.item, activeItem]}>
                        {icon}
                        <Text
                            style={[style.text, activeText]}
                            ellipsizeMode='tail'
                            numberOfLines={1}
                        >
                            {displayName}
                        </Text>
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
        }
    };
});
