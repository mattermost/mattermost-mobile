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
import {t} from 'app/utils/i18n';
import {General} from 'mattermost-redux/constants';
import FormattedText from 'app/components/formatted_text';

export default class ChannelTitle extends PureComponent {
    static propTypes = {
        canHaveSubtitle: PropTypes.bool.isRequired,
        channelType: PropTypes.string.isRequired,
        displayName: PropTypes.string.isRequired,
        hasGuests: PropTypes.bool.isRequired,
        isArchived: PropTypes.bool.isRequired,
        isChannelMuted: PropTypes.bool.isRequired,
        isGuest: PropTypes.bool.isRequired,
        isOwnDM: PropTypes.bool.isRequired,
        onPress: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        displayName: null,
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
            isOwnDM,
        } = this.props;

        const channelDisplayName = displayName;

        if (isOwnDM) {
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
    };

    render() {
        const {isChannelMuted, onPress, theme} = this.props;
        const style = getStyle(theme);
        const hasGuestsText = this.renderHasGuestsText(style);
        const channelDisplayName = this.renderChannelDisplayName();

        let icon;
        if (channelDisplayName) {
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
                        {channelDisplayName}
                    </Text>
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
