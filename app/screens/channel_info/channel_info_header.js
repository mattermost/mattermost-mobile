// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    View,
    Platform,
} from 'react-native';

import {General} from 'mattermost-redux/constants';

import ChannelIcon from 'app/components/channel_icon';
import FormattedDate from 'app/components/formatted_date';
import FormattedText from 'app/components/formatted_text';
import Markdown from 'app/components/markdown';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from 'app/utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {t} from 'app/utils/i18n';

export default class ChannelInfoHeader extends React.PureComponent {
    static propTypes = {
        createAt: PropTypes.number.isRequired,
        creator: PropTypes.string,
        memberCount: PropTypes.number,
        displayName: PropTypes.string.isRequired,
        header: PropTypes.string,
        onPermalinkPress: PropTypes.func,
        purpose: PropTypes.string,
        status: PropTypes.string,
        theme: PropTypes.object.isRequired,
        type: PropTypes.string.isRequired,
        isArchived: PropTypes.bool.isRequired,
        isBot: PropTypes.bool.isRequired,
        hasGuests: PropTypes.bool.isRequired,
        isGroupConstrained: PropTypes.bool,
    };

    renderHasGuestText = (style) => {
        const {type, hasGuests} = this.props;
        if (!hasGuests) {
            return null;
        }

        let messageId;
        let defaultMessage;

        if (type === General.GM_CHANNEL) {
            messageId = t('channel.hasGuests');
            defaultMessage = 'This group message has guests';
        } else if (type === General.DM_CHANNEL) {
            messageId = t('channel.isGuest');
            defaultMessage = 'This person is a guest';
        } else {
            messageId = t('channel.channelHasGuests');
            defaultMessage = 'This channel has guests';
        }
        return (
            <View style={style.section}>
                <FormattedText
                    style={style.header}
                    id={messageId}
                    defaultMessage={defaultMessage}
                />
            </View>
        );
    }

    render() {
        const {
            createAt,
            creator,
            displayName,
            header,
            memberCount,
            onPermalinkPress,
            purpose,
            status,
            theme,
            type,
            isArchived,
            isBot,
            isGroupConstrained,
        } = this.props;

        const style = getStyleSheet(theme);
        const textStyles = getMarkdownTextStyles(theme);
        const blockStyles = getMarkdownBlockStyles(theme);
        const baseTextStyle = Platform.OS === 'ios' ?
            {...style.detail, lineHeight: 20} :
            style.detail;

        return (
            <View style={style.container}>
                <View style={style.channelNameContainer}>
                    <ChannelIcon
                        isInfo={true}
                        membersCount={memberCount - 1}
                        size={16}
                        status={status}
                        theme={theme}
                        type={type}
                        isArchived={isArchived}
                        isBot={isBot}
                    />
                    <Text
                        ellipsizeMode='tail'
                        numberOfLines={1}
                        style={style.channelName}
                    >
                        {displayName}
                    </Text>
                </View>
                {this.renderHasGuestText(style)}
                {purpose.length > 0 &&
                    <View style={style.section}>
                        <FormattedText
                            style={style.header}
                            id='channel_info.purpose'
                            defaultMessage='Purpose'
                        />
                        <Markdown
                            onPermalinkPress={onPermalinkPress}
                            baseTextStyle={baseTextStyle}
                            textStyles={textStyles}
                            blockStyles={blockStyles}
                            value={purpose}
                        />
                    </View>
                }
                {header.length > 0 &&
                    <View style={style.section}>
                        <FormattedText
                            style={style.header}
                            id='channel_info.header'
                            defaultMessage='Header'
                        />
                        <Markdown
                            onPermalinkPress={onPermalinkPress}
                            baseTextStyle={baseTextStyle}
                            textStyles={textStyles}
                            blockStyles={blockStyles}
                            value={header}
                        />
                    </View>
                }
                {isGroupConstrained &&
                    <Text style={style.createdBy}>
                        <FormattedText
                            id='mobile.routes.channelInfo.groupManaged'
                            defaultMessage='Members are managed by linked groups'
                        />
                    </Text>
                }
                {creator &&
                    <Text style={style.createdBy}>
                        <FormattedText
                            id='mobile.routes.channelInfo.createdBy'
                            defaultMessage='Created by {creator} on '
                            values={{
                                creator,
                            }}
                        />
                        <FormattedDate
                            value={new Date(createAt)}
                            year='numeric'
                            month='long'
                            day='2-digit'
                        />
                    </Text>
                }
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            marginBottom: 40,
            padding: 15,
            borderBottomWidth: 1,
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        channelName: {
            flex: 1,
            fontSize: 15,
            fontWeight: '600',
            color: theme.centerChannelColor,
        },
        channelNameContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
        },
        createdBy: {
            flexDirection: 'row',
            fontSize: 12,
            marginTop: 5,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            backgroundColor: 'transparent',
        },
        detail: {
            fontSize: 13,
            color: theme.centerChannelColor,
        },
        header: {
            fontSize: 13,
            marginBottom: 10,
            color: theme.centerChannelColor,
            backgroundColor: 'transparent',
        },
        section: {
            marginTop: 15,
        },
    };
});
