// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Platform,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import {displayUsername} from 'mattermost-redux/utils/user_utils';

import ProfilePicture from 'app/components/profile_picture';
import {preventDoubleTap} from 'app/utils/tap';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

import CustomListRow from 'app/components/custom_list/custom_list_row';
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

        if (Platform.OS === 'ios') {
            navigator.push(options);
        } else {
            navigator.showModal(options);
        }
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
                <CustomListRow
                    id={id}
                    theme={theme}
                    onPress={this.onPress}
                    enabled={true}
                    selectable={false}
                    selected={false}
                >
                    <View style={style.profile}>
                        <TouchableOpacity
                            key={user.id}
                            onPress={preventDoubleTap(() => this.goToUserProfile(user.id))}
                        >
                            <ProfilePicture
                                userId={id}
                                showStatus={false}
                                size={32}
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={style.textContainer}>
                        <View>
                            <Text style={style.username}>
                                {usernameDisplay}
                            </Text>
                        </View>
                        <View>
                            <Text
                                style={style.displayName}
                                ellipsizeMode='tail'
                                numberOfLines={1}
                            >
                                {displayUsername(user, teammateNameDisplay)}
                            </Text>
                        </View>
                    </View>
                    <View style={style.emoji}>
                        <Emoji
                            emojiName={emojiName}
                            size={32}
                        />
                    </View>
                </CustomListRow>
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
            height: 65,
            width: '100%',
            zIndex: 10,
        },
        profile: {
            alignItems: 'center',
            width: '10%',
        },
        textContainer: {
            width: '80%',
            flexDirection: 'row',
            marginLeft: 5,
        },
        username: {
            fontSize: 15,
            color: theme.centerChannelColor,
        },
        displayName: {
            marginLeft: 5,
            fontSize: 15,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        emoji: {
            alignItems: 'center',
            width: '10%',
        },
    };
});
