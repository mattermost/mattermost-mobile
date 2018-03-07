// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    View,
} from 'react-native';

import ChanneIcon from 'app/components/channel_icon';
import FormattedDate from 'app/components/formatted_date';
import FormattedText from 'app/components/formatted_text';
import Markdown from 'app/components/markdown';
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
    };

    render() {
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
        } = this.props;

        const style = getStyleSheet(theme);
        const textStyles = getMarkdownTextStyles(theme);
        const blockStyles = getMarkdownBlockStyles(theme);

        return (
            <View style={style.container}>
                <View style={style.channelNameContainer}>
                    <ChanneIcon
                        isInfo={true}
                        membersCount={memberCount - 1}
                        size={16}
                        status={status}
                        theme={theme}
                        type={type}
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
                        <FormattedText
                            style={style.header}
                            id='channel_info.purpose'
                            defaultMessage='Purpose'
                        />
                        <Markdown
                            navigator={navigator}
                            onPermalinkPress={onPermalinkPress}
                            baseTextStyle={style.detail}
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
                            navigator={navigator}
                            onPermalinkPress={onPermalinkPress}
                            baseTextStyle={style.detail}
                            textStyles={textStyles}
                            blockStyles={blockStyles}
                            value={header}
                        />
                    </View>
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
