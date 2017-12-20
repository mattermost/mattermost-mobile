// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelTitle extends PureComponent {
    static propTypes = {
        currentChannelName: PropTypes.string,
        deviceWidth: PropTypes.number,
        displayName: PropTypes.string,
        height: PropTypes.number,
        onPress: PropTypes.func,
        theme: PropTypes.object
    };

    static defaultProps = {
        currentChannel: {},
        displayName: null,
        theme: {}
    };

    render() {
        const {currentChannelName, deviceWidth, displayName, height, onPress, theme} = this.props;
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

        return (
            <TouchableOpacity
                style={[style.container, {height, width: deviceWidth}]}
                onPress={onPress}
            >
                <View style={[style.wrapper, {width: deviceWidth}]}>
                    <View style={style.innerContainer}>
                        <Text
                            ellipsizeMode='tail'
                            numberOfLines={1}
                            style={style.text}
                        >
                            {channelName}
                        </Text>
                        {icon}
                    </View>
                </View>
            </TouchableOpacity>
        );
    }
}

const getStyle = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            position: 'absolute',
            zIndex: 40
        },
        wrapper: {
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center'
        },
        innerContainer: {
            alignItems: 'center',
            flexDirection: 'row',
            marginHorizontal: 55
        },
        icon: {
            color: theme.sidebarHeaderTextColor,
            marginHorizontal: 5
        },
        text: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 17,
            fontWeight: 'bold',
            textAlign: 'center'
        }
    };
});
