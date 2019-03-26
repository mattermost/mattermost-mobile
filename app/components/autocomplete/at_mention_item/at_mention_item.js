// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import ProfilePicture from 'app/components/profile_picture';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

export default class AtMentionItem extends PureComponent {
    static propTypes = {
        firstName: PropTypes.string,
        lastName: PropTypes.string,
        onPress: PropTypes.func.isRequired,
        userId: PropTypes.string.isRequired,
        username: PropTypes.string,
        isBot: PropTypes.bool,
        theme: PropTypes.object.isRequired,
    };

    completeMention = () => {
        const {onPress, username} = this.props;
        onPress(username);
    };

    render() {
        const {
            firstName,
            lastName,
            userId,
            username,
            theme,
            isBot,
        } = this.props;

        const style = getStyleFromTheme(theme);
        const hasFullName = firstName.length > 0 && lastName.length > 0;

        let tag = null;
        if (isBot) {
            tag = (
                <FormattedText
                    id='post_info.bot'
                    defaultMessage='BOT'
                    style={style.bot}
                />
            );
        }

        return (
            <TouchableOpacity
                key={userId}
                onPress={this.completeMention}
                style={style.row}
            >
                <View style={style.rowPicture}>
                    <ProfilePicture
                        userId={userId}
                        theme={theme}
                        size={20}
                        status={null}
                    />
                </View>
                <Text style={style.rowUsername}>{`@${username}`}</Text>
                {tag}
                {hasFullName && <Text style={style.rowUsername}>{' - '}</Text>}
                {hasFullName && <Text style={style.rowFullname}>{`${firstName} ${lastName}`}</Text>}
            </TouchableOpacity>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        row: {
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        rowPicture: {
            marginHorizontal: 8,
            width: 20,
            alignItems: 'center',
            justifyContent: 'center',
        },
        rowUsername: {
            fontSize: 13,
            color: theme.centerChannelColor,
        },
        rowFullname: {
            color: theme.centerChannelColor,
            opacity: 0.6,
        },
        bot: {
            alignSelf: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.15),
            borderRadius: 2,
            color: theme.centerChannelColor,
            fontSize: 10,
            fontWeight: '600',
            marginRight: 5,
            marginLeft: 5,
            paddingVertical: 2,
            paddingHorizontal: 4,
        },
    };
});
