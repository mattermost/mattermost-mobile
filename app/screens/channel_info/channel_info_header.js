// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Clipboard,
    Platform,
    Text,
    TouchableHighlight,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';

import ChannelIcon from 'app/components/channel_icon';
import FormattedDate from 'app/components/formatted_date';
import FormattedText from 'app/components/formatted_text';
import Markdown from 'app/components/markdown';
import mattermostManaged from 'app/mattermost_managed';
import BottomSheet from 'app/utils/bottom_sheet';
import {getMarkdownTextStyles, getMarkdownBlockStyles} from 'app/utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class ChannelInfoHeader extends React.PureComponent {
    static propTypes = {
        createAt: PropTypes.number.isRequired,
        creator: PropTypes.string,
        memberCount: PropTypes.number,
        displayName: PropTypes.string.isRequired,
        header: PropTypes.string,
        navigator: PropTypes.object.isRequired,
        onPermalinkPress: PropTypes.func,
        purpose: PropTypes.string,
        status: PropTypes.string,
        theme: PropTypes.object.isRequired,
        type: PropTypes.string.isRequired,
        isArchived: PropTypes.bool.isRequired,
        isBot: PropTypes.bool.isRequired,
        isGroupConstrained: PropTypes.bool,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    handleLongPress = (text, actionText) => {
        const {formatMessage} = this.context.intl;

        const config = mattermostManaged.getCachedConfig();

        if (config?.copyAndPasteProtection !== 'true') {
            const cancelText = formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'});

            BottomSheet.showBottomSheetWithOptions({
                options: [actionText, cancelText],
                cancelButtonIndex: 1,
            }, (value) => {
                if (value !== 1) {
                    this.handleCopy(text);
                }
            });
        }
    };

    handleCopy = (text) => {
        Clipboard.setString(text);
    }

    render() {
        const {formatMessage} = this.context.intl;
        const {
            createAt,
            creator,
            displayName,
            header,
            memberCount,
            navigator,
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
                {purpose.length > 0 &&
                    <View style={style.section}>
                        <TouchableHighlight
                            underlayColor={changeOpacity(theme.centerChannelColor, 0.1)}
                            onLongPress={() => this.handleLongPress(purpose, formatMessage({id: 'mobile.channel_info.copy_purpose', defaultMessage: 'Copy Purpose'}))}
                        >
                            <View style={style.sectionRow}>
                                <FormattedText
                                    style={style.header}
                                    id='channel_info.purpose'
                                    defaultMessage='Purpose'
                                />
                                <Markdown
                                    navigator={navigator}
                                    onPermalinkPress={onPermalinkPress}
                                    baseTextStyle={baseTextStyle}
                                    textStyles={textStyles}
                                    blockStyles={blockStyles}
                                    value={purpose}
                                />
                            </View>
                        </TouchableHighlight>
                    </View>
                }
                {header.length > 0 &&
                    <View style={style.section}>
                        <TouchableHighlight
                            underlayColor={changeOpacity(theme.centerChannelColor, 0.1)}
                            onLongPress={() => this.handleLongPress(header, formatMessage({id: 'mobile.channel_info.copy_header', defaultMessage: 'Copy Header'}))}
                        >
                            <View style={style.sectionRow}>
                                <FormattedText
                                    style={style.header}
                                    id='channel_info.header'
                                    defaultMessage='Header'
                                />
                                <Markdown
                                    navigator={navigator}
                                    onPermalinkPress={onPermalinkPress}
                                    baseTextStyle={baseTextStyle}
                                    textStyles={textStyles}
                                    blockStyles={blockStyles}
                                    value={header}
                                />
                            </View>
                        </TouchableHighlight>
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
            paddingVertical: 15,
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
            paddingHorizontal: 15,
        },
        createdBy: {
            flexDirection: 'row',
            fontSize: 12,
            marginTop: 5,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            backgroundColor: 'transparent',
            paddingHorizontal: 15,
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
        sectionRow: {
            paddingHorizontal: 15,
        },
    };
});
