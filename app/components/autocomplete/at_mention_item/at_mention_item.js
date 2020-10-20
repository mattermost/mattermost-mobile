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
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';
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
        showFullName: PropTypes.string,
        testID: PropTypes.string,
    };

    static defaultProps = {
        firstName: '',
        lastName: '',
    };

    completeMention = () => {
        const {onPress, username} = this.props;
        onPress(username);
    };

    renderNameBlock = () => {
        let name = '';
        const {showFullName, firstName, lastName, nickname} = this.props;
        const hasNickname = nickname.length > 0;

        if (showFullName === 'true') {
            name += `${firstName} ${lastName} `;
        }

        if (hasNickname) {
            name += `(${nickname})`;
        }

        return name.trim();
    }

    render() {
        const {
            userId,
            username,
            theme,
            isBot,
            isLandscape,
            isGuest,
            isCurrentUser,
            testID,
        } = this.props;

        const style = getStyleFromTheme(theme);
        const name = this.renderNameBlock();

        return (
            <TouchableWithFeedback
                testID={testID}
                key={userId}
                onPress={this.completeMention}
                style={padding(isLandscape)}
                underlayColor={changeOpacity(theme.buttonBg, 0.08)}
                type={'native'}
            >
                <View style={style.row}>
                    <View style={style.rowPicture}>
                        <ProfilePicture
                            userId={userId}
                            theme={theme}
                            size={24}
                            status={null}
                            showStatus={false}
                        />
                    </View>
                    <BotTag
                        show={isBot}
                        theme={theme}
                    />
                    <GuestTag
                        show={isGuest}
                        theme={theme}
                    />
                    {Boolean(name.length) &&
                    <Text
                        style={style.rowFullname}
                        numberOfLines={1}
                    >
                        {name}
                        {isCurrentUser &&
                        <FormattedText
                            id='suggestion.mention.you'
                            defaultMessage='(you)'
                        />}
                    </Text>
                    }
                    <Text
                        style={style.rowUsername}
                        numberOfLines={1}
                    >
                        {` @${username}`}
                    </Text>
                </View>
            </TouchableWithFeedback>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        row: {
            height: 40,
            paddingVertical: 8,
            paddingTop: 4,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
        },
        rowPicture: {
            marginRight: 10,
            marginLeft: 2,
            width: 24,
            alignItems: 'center',
            justifyContent: 'center',
        },
        rowFullname: {
            fontSize: 15,
            color: theme.centerChannelColor,
            paddingLeft: 4,
        },
        rowUsername: {
            color: theme.centerChannelColor,
            fontSize: 15,
            opacity: 0.56,
            flex: 1,
        },
    };
});
