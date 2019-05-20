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
import FormattedText from 'app/components/formatted_text';

export default class ChannelTitle extends PureComponent {
    static propTypes = {
        currentChannelName: PropTypes.string,
        displayName: PropTypes.string,
        isChannelMuted: PropTypes.bool,
        onPress: PropTypes.func,
        theme: PropTypes.object,
        isArchived: PropTypes.bool,
        isGuest: PropTypes.bool.isRequired,
        hasGuests: PropTypes.bool.isRequired,
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
        const {currentChannelName, displayName, isChannelMuted, onPress, theme, isGuest, hasGuests} = this.props;

        const style = getStyle(theme);

        const channelName = displayName || currentChannelName;
        let guestBadge = null;
        if (isGuest) {
            guestBadge = (
                <GuestTag
                    theme={this.props.theme}
                    inTitle={true}
                />
            );
        }
        let hasGuestsText = null;
        if (hasGuests) {
            hasGuestsText = (
                <View style={style.guestsWrapper}>
                    <FormattedText
                        id='channel_title.hasGuests'
                        numberOfLines={1}
                        ellipsizeMode='tail'
                        defaultMessage='This group message has guests'
                        style={style.guestsText}
                    />
                </View>
            );
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
                    {guestBadge}
                    {icon}
                    {mutedIcon}
                </View>
                {hasGuestsText}
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
        guestsWrapper: {
            alignItems: 'flex-start',
            flex: 1,
            position: 'relative',
            top: -1,
            width: '90%',
        },
        guestsText: {
            color: theme.sidebarHeaderTextColor,
            fontSize: 14,
            opacity: 0.6,
        },
    };
});
