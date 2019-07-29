// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {intlShape} from 'react-intl';
import {
    Text,
    TouchableOpacity,
    StyleSheet,
    View,
} from 'react-native';

import {displayUsername} from 'mattermost-redux/utils/user_utils';

import ProfilePicture from 'app/components/profile_picture';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity} from 'app/utils/theme';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

import Emoji from 'app/components/emoji';

export default class ReactionRow extends React.PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            goToScreen: PropTypes.func.isRequired,
        }).isRequired,
        emojiName: PropTypes.string.isRequired,
        teammateNameDisplay: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        user: PropTypes.object.isRequired,
        isLandscape: PropTypes.bool.isRequired,
    };

    static defaultProps = {
        user: {},
    };

    static contextTypes = {
        intl: intlShape,
    };

    goToUserProfile = () => {
        const {actions, user} = this.props;
        const {formatMessage} = this.context.intl;
        const screen = 'UserProfile';
        const title = formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const passProps = {
            userId: user.id,
        };

        actions.goToScreen(screen, title, passProps);
    };

    render() {
        const {
            emojiName,
            teammateNameDisplay,
            user,
            isLandscape,
        } = this.props;

        if (!user.id) {
            return null;
        }

        const {id, username} = user;
        const usernameDisplay = '@' + username;

        return (
            <View style={style.container}>
                <View style={[style.profileContainer, padding(isLandscape)]}>
                    <TouchableOpacity
                        key={user.id}
                        onPress={preventDoubleTap(this.goToUserProfile)}
                    >
                        <View style={style.profile}>
                            <ProfilePicture
                                userId={id}
                                showStatus={false}
                                size={24}
                            />
                        </View>
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
                        size={24}
                    />
                </View>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        height: 44,
        width: '100%',
        alignItems: 'center',
    },
    profileContainer: {
        alignItems: 'center',
        width: '13%',
    },
    profile: {
        paddingTop: 3,
    },
    textContainer: {
        width: '74%',
        flexDirection: 'row',
    },
    username: {
        fontSize: 14,
        paddingRight: 5,
    },
    displayName: {
        fontSize: 14,
        color: changeOpacity('#000', 0.5),
    },
    emoji: {
        alignItems: 'center',
        width: '13%',
        justifyContent: 'center',
    },
});
