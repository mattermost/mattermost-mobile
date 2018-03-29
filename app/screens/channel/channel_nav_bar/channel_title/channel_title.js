// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelTitle extends PureComponent {
    static propTypes = {
        currentChannelName: PropTypes.string,
        displayName: PropTypes.string,
        isChannelMuted: PropTypes.bool,
        onPress: PropTypes.func,
        theme: PropTypes.object,
    };

    static defaultProps = {
        currentChannel: {},
        displayName: null,
        theme: {},
    };

    render() {
        const {currentChannelName, displayName, isChannelMuted, onPress, theme} = this.props;
        const channelName = displayName || currentChannelName;
        const style = getStyle(theme);
        let icon;
        if (channelName) {
            icon = (
                <Icon
                    style={style.icon}
                    size={12}
                    name='chevron-down'
                />
            );
        }

        let mutedIcon;
        if (isChannelMuted) {
            mutedIcon = (
                <Icon
                    style={[style.icon, style.muted]}
                    size={15}
                    name='bell-slash-o'
                />
            );
        }

        return (
            <TouchableOpacity
                style={style.container}
                onPress={onPress}
            >
                <View style={style.wrapper}>
                    <Text
                        ellipsizeMode='tail'
                        numberOfLines={1}
                        style={style.text}
                    >
                        {channelName}
                    </Text>
                    {icon}
                    {mutedIcon}
                </View>
            </TouchableOpacity>
        );
    }
}

const getStyle = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        wrapper: {
            alignItems: 'center',
            flex: 1,
            position: 'relative',
            top: -1,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            width: '90%',
        },
        icon: {
            color: theme.sidebarHeaderTextColor,
            marginHorizontal: 5,
        },
        text: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 18,
            fontWeight: 'bold',
            textAlign: 'center',
        },
        muted: {
            marginTop: 1,
            opacity: 0.6,
            marginLeft: 0,
        },
    };
});
