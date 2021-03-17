// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import {General} from '@mm-redux/constants';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {t} from '@utils/i18n';
import CustomStatusEmoji from '@components/custom_status/custom_status_emoji';

export default class ChannelTitle extends PureComponent {
    static propTypes = {
        currentChannelName: PropTypes.string,
        displayName: PropTypes.string,
        channelType: PropTypes.string,
        isChannelMuted: PropTypes.bool,
        onPress: PropTypes.func,
        theme: PropTypes.object,
        isArchived: PropTypes.bool,
        isGuest: PropTypes.bool.isRequired,
        hasGuests: PropTypes.bool.isRequired,
        canHaveSubtitle: PropTypes.bool.isRequired,
        isSelfDMChannel: PropTypes.bool.isRequired,
        teammateId: PropTypes.string,
    };

    static defaultProps = {
        currentChannel: {},
        displayName: null,
        theme: {},
        isSelfDMChannel: false,
    };

    archiveIcon(style) {
        let content = null;
        if (this.props.isArchived) {
            content = (
                <CompassIcon
                    name='archive-outline'
                    style={[style.archiveIcon]}
                />
            );
        }
        return content;
    }

    renderHasGuestsText = (style) => {
        const {channelType, isGuest, hasGuests, canHaveSubtitle} = this.props;
        if (!canHaveSubtitle) {
            return null;
        }
        if (!isGuest && !hasGuests) {
            return null;
        }
        if (channelType === General.DM_CHANNEL && !isGuest) {
            return null;
        }

        let messageId;
        let defaultMessage;
        if (channelType === General.DM_CHANNEL) {
            messageId = t('channel.isGuest');
            defaultMessage = 'This person is a guest';
        } else if (channelType === General.GM_CHANNEL) {
            messageId = t('channel.hasGuests');
            defaultMessage = 'This group message has guests';
        } else if (channelType === General.OPEN_CHANNEL || channelType === General.PRIVATE_CHANNEL) {
            messageId = t('channel.channelHasGuests');
            defaultMessage = 'This channel has guests';
        } else {
            return null;
        }
        return (
            <View style={style.guestsWrapper}>
                <FormattedText
                    numberOfLines={1}
                    ellipsizeMode='tail'
                    id={messageId}
                    defaultMessage={defaultMessage}
                    style={style.guestsText}
                />
            </View>
        );
    }

    renderChannelDisplayName = () => {
        const {
            displayName,
            currentChannelName,
            isSelfDMChannel,
        } = this.props;

        const channelDisplayName = displayName || currentChannelName;

        if (isSelfDMChannel) {
            const messageId = t('channel_header.directchannel.you');
            const defaultMessage = '{displayname} (you)';
            const values = {displayname: channelDisplayName};

            return (
                <FormattedText
                    id={messageId}
                    defaultMessage={defaultMessage}
                    values={values}
                />
            );
        }

        return channelDisplayName;
    }

    render() {
        const {
            isChannelMuted,
            onPress,
            theme,
        } = this.props;

        const style = getStyle(theme);
        const hasGuestsText = this.renderHasGuestsText(style);
        const channelDisplayName = this.renderChannelDisplayName();

        let icon;
        if (channelDisplayName) {
            icon = (
                <CompassIcon
                    style={style.icon}
                    size={24}
                    name='chevron-down'
                />
            );
        }

        let mutedIcon;
        let wrapperWidth = 90;
        if (isChannelMuted) {
            mutedIcon = (
                <CompassIcon
                    style={[style.icon, style.muted]}
                    size={24}
                    name='bell-off-outline'
                />
            );
            wrapperWidth -= 10;
        }

        const customStatus = this.props.channelType === General.DM_CHANNEL ?
            (
                <CustomStatusEmoji
                    userID={this.props.teammateId}
                    emojiSize={18}
                    style={[style.icon, style.emoji]}
                />
            ) : null;

        if (customStatus) {
            wrapperWidth -= 10;
        }

        return (
            <TouchableOpacity
                testID={'channel.title.button'}
                style={style.container}
                onPress={onPress}
            >
                <View style={[style.wrapper, {width: `${wrapperWidth}%`}]}>
                    {this.archiveIcon(style)}
                    <Text
                        ellipsizeMode='tail'
                        numberOfLines={1}
                        style={style.text}
                        testID='channel.nav_bar.title'
                    >
                        {channelDisplayName}
                    </Text>
                    {icon}
                    {customStatus}
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
        },
        icon: {
            color: theme.sidebarHeaderTextColor,
            marginHorizontal: 1,
        },
        emoji: {
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
