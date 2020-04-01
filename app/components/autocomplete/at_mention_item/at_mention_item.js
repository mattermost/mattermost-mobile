// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Text,
    View,
} from 'react-native';

import ProfilePicture from 'app/components/profile_picture';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';
import {BotTag, GuestTag} from 'app/components/tag';
import TouchableWithFeedback from 'app/components/touchable_with_feedback';
import {makeStyleSheetFromTheme} from 'app/utils/theme';
import FormattedText from 'app/components/formatted_text';

export default class AtMentionItem extends PureComponent {
    static propTypes = {
        firstName: PropTypes.string,
        lastName: PropTypes.string,
        nickname: PropTypes.string,
        onPress: PropTypes.func.isRequired,
        userId: PropTypes.string.isRequired,
        username: PropTypes.string,
        isGuest: PropTypes.bool,
        isBot: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
        isCurrentUser: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        firstName: '',
        lastName: '',
    };

    completeMention = () => {
        const {onPress, username} = this.props;
        onPress(username);
    };

    render() {
        const {
            firstName,
            lastName,
            nickname,
            userId,
            username,
            theme,
            isBot,
            isLandscape,
            isGuest,
            isCurrentUser,
        } = this.props;

        const style = getStyleFromTheme(theme);
        const hasFullName = firstName.length > 0 && lastName.length > 0;
        const hasNickname = nickname.length > 0;

        return (
            <TouchableWithFeedback
                key={userId}
                onPress={this.completeMention}
                style={[style.row, padding(isLandscape)]}
                type={'opacity'}
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
                <BotTag
                    show={isBot}
                    theme={theme}
                />
                <GuestTag
                    show={isGuest}
                    theme={theme}
                />
                {hasFullName && <Text style={style.rowUsername}>{' - '}</Text>}
                <Text
                    style={style.rowFullname}
                    numberOfLines={1}
                >
                    {hasFullName && <Text>{`${firstName} ${lastName}`}</Text>}
                    {hasNickname && <Text>{` (${nickname})`}</Text>}
                    {isCurrentUser &&
                        <FormattedText
                            style={style.rowFullname}
                            id='suggestion.mention.you'
                            defaultMessage='(you)'
                        />}
                </Text>
            </TouchableWithFeedback>
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
            flex: 1,
        },
    };
});
