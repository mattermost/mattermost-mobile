// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {makeStyleSheetFromTheme} from 'app/utils/theme';
import GuestTag from 'app/components/guest_tag';

export default class ChannelTitle extends PureComponent {
    static propTypes = {
        currentChannelName: PropTypes.string,
        displayName: PropTypes.string,
        isChannelMuted: PropTypes.bool,
        onPress: PropTypes.func,
        theme: PropTypes.object,
        isArchived: PropTypes.bool,
        guests: PropTypes.string,
    };

    static defaultProps = {
        currentChannel: {},
        displayName: null,
        theme: {},
    };

    archiveIcon(style) {
        let content = null;
        if (this.props.isArchived) {
            content = (
                <Icon
                    name='archive'
                    style={[style.archiveIcon]}
                />
            );
        }
        return content;
    }

    render() {
        const {currentChannelName, displayName, isChannelMuted, onPress, theme, guests} = this.props;

        const style = getStyle(theme);

        let channelName = displayName || currentChannelName;
        if (guests) {
            const users = channelName.split(',');
            const isGuest = guests.split(',').map((v) => v === 'GUEST');

            channelName = [];
            users.forEach((value, index) => {
                channelName.push(
                    <React.Fragment key={value}>
                        {value}
                        {isGuest[index] &&
                            <GuestTag
                                theme={this.props.theme}
                                inTitle={true}
                            />}
                        {index + 1 !== users.length && <Text style={style.text}>{', '}</Text>}
                    </React.Fragment>
                );
            });
        }

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
                    {this.archiveIcon(style)}
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
        archiveIcon: {
            fontSize: 17,
            color: theme.sidebarHeaderTextColor,
            paddingRight: 7,
        },
    };
});
