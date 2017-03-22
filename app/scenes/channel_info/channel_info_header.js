// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {
    StyleSheet,
    Text,
    View
} from 'react-native';

import ChanneIcon from 'app/components/channel_icon';
import FormattedDate from 'app/components/formatted_date';
import FormattedText from 'app/components/formatted_text';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

function channelInfoHeader(props) {
    const {createAt, creator, displayName, header, memberCount, purpose, status, theme, type} = props;

    const style = getStyleSheet(theme);

    return (
        <View style={style.container}>
            <View style={style.channelNameContainer}>
                <ChanneIcon
                    isActive={true}
                    membersCount={memberCount - 1}
                    size={15}
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
                    <Text style={style.detail}>{purpose}</Text>
                </View>
            }
            {header.length > 0 &&
                <View style={style.section}>
                    <FormattedText
                        style={style.header}
                        id='channel_info.header'
                        defaultMessage='Header'
                    />
                    <Text style={style.detail}>{header}</Text>
                </View>
            }
            {creator &&
                <Text style={style.createdBy}>
                    <FormattedText
                        id='mobile.routes.channelInfo.createdBy'
                        defaultMessage='Created by {creator} on '
                        values={{
                            creator
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

channelInfoHeader.propTypes = {
    createAt: PropTypes.number.isRequired,
    creator: PropTypes.string,
    memberCount: PropTypes.number,
    displayName: PropTypes.string.isRequired,
    header: PropTypes.string,
    purpose: PropTypes.string,
    status: PropTypes.string,
    theme: PropTypes.object.isRequired,
    type: PropTypes.string.isRequired
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            backgroundColor: theme.centerChannelBg,
            marginBottom: 40,
            padding: 15,
            borderBottomWidth: 1,
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1)
        },
        channelName: {
            flex: 1,
            fontSize: 15,
            fontWeight: '600',
            color: theme.centerChannelColor
        },
        channelNameContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingBottom: 10
        },
        createdBy: {
            flexDirection: 'row',
            fontSize: 11,
            marginTop: 5,
            color: changeOpacity(theme.centerChannelColor, 0.5),
            backgroundColor: 'transparent'
        },
        detail: {
            fontSize: 13,
            color: theme.centerChannelColor
        },
        header: {
            fontSize: 12,
            marginBottom: 10,
            color: theme.centerChannelColor,
            backgroundColor: 'transparent'
        },
        section: {
            marginTop: 15
        }
    });
});

export default channelInfoHeader;
