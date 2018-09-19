// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import {displayUsername} from 'mattermost-redux/utils/user_utils';

import ProfilePicture from 'app/components/profile_picture';
import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

import Emoji from 'app/components/emoji';

export default class ReactionRow extends React.PureComponent {
    static propTypes = {
        emojiName: PropTypes.string.isRequired,
        navigator: PropTypes.object,
        teammateNameDisplay: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        user: PropTypes.object.isRequired,
    };

    static defaultProps = {
        user: {},
    }

    static contextTypes = {
        intl: intlShape,
    };

    goToUserProfile = (userId) => {
        const {navigator, theme} = this.props;
        const {formatMessage} = this.context.intl;

        const options = {
            screen: 'UserProfile',
            title: formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'}),
            animated: true,
            backButtonTitle: '',
            passProps: {
                userId,
            },
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
        };

        navigator.push(options);
    };

    render() {
        const {
            emojiName,
            teammateNameDisplay,
            theme,
            user,
        } = this.props;

        if (!user.id) {
            return null;
        }

        const {id, username} = user;
        const style = getStyleFromTheme(theme);
        const usernameDisplay = '@' + username;

        return (
            <View style={style.container}>
                <View style={style.profile}>
                    <TouchableOpacity
                        key={user.id}
                        onPress={preventDoubleTap(() => this.goToUserProfile(user.id))}
                    >
                        <ProfilePicture
                            userId={id}
                            showStatus={false}
                            size={24}
                        />
                    </TouchableOpacity>
                </View>
                <Text
                    style={style.textContainer}
                    ellipsizeMode='tail'
                    numberOfLines={1}
                >
                    <Text style={style.username}>
                        {usernameDisplay}
                    </Text>
                    <Text>{'  '}</Text>
                    <Text style={style.displayName}>
                        {displayUsername(user, teammateNameDisplay)}
                    </Text>
                </Text>
                <View style={style.emoji}>
                    <Emoji
                        emojiName={emojiName}
                        size={26}
                    />
                </View>
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            backgroundColor: theme.centerChannelBg,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            height: 44,
            width: '100%',
            alignItems: 'center',
        },
        profile: {
            alignItems: 'center',
            width: '15%',
        },
        textContainer: {
            width: '70%',
            flexDirection: 'row',
            marginLeft: 5,
        },
        username: {
            fontSize: 14,
            color: theme.centerChannelColor,
            paddingRight: 5,
        },
        displayName: {
            marginLeft: 5,
            fontSize: 14,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        emoji: {
            alignItems: 'center',
            width: '15%',
            justifyContent: 'center',
        },
    };
});
