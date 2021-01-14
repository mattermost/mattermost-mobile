// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {intlShape} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';
import {ImageSource} from 'react-native-vector-icons/Icon';

import {showModal} from '@actions/navigation';
import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';
import type {Theme} from '@mm-redux/types/preferences';
import {UserProfile} from '@mm-redux/types/users';
import {displayUsername} from '@mm-redux/utils/user_utils';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

interface ParticipantRowProps {
        teammateNameDisplay: string,
        theme: Theme,
        user: UserProfile,
    }

export default class ParticipantRow extends React.PureComponent<ParticipantRowProps> {
    static contextTypes = {
        intl: intlShape.isRequired,
    };
    closeButton: ImageSource

    goToUserProfile = async () => {
        const {user, theme} = this.props;
        const {formatMessage} = this.context.intl;
        const screen = 'UserProfile';
        const title = formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const passProps = {
            userId: user.id,
        };

        if (!this.closeButton) {
            this.closeButton = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);
        }

        const options = {
            topBar: {
                leftButtons: [{
                    id: 'close-settings',
                    icon: this.closeButton,
                }],
            },
        };

        showModal(screen, title, passProps, options);
    };

    render() {
        const {
            teammateNameDisplay,
            user,
            theme,
        } = this.props;

        if (!user.id) {
            return null;
        }

        const {id, username} = user;
        const usernameDisplay = '@' + username;

        const style = getStyleSheet(theme);

        return (
            <TouchableOpacity
                key={user.id}
                onPress={preventDoubleTap(this.goToUserProfile)}
            >
                <View style={style.container}>
                    <View style={style.profileContainer}>
                        <View style={style.profile}>
                            <ProfilePicture
                                userId={id}
                                showStatus={false}
                                size={24}
                            />
                        </View>
                    </View>
                    <Text
                        style={style.textContainer}
                        ellipsizeMode='tail'
                        numberOfLines={1}
                    >
                        <Text style={style.displayName}>
                            {displayUsername(user, teammateNameDisplay)}
                        </Text>
                        <Text>{'  '}</Text>
                        <Text style={style.username}>
                            {usernameDisplay}
                        </Text>
                    </Text>
                </View>
            </TouchableOpacity>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme:Theme) => {
    return {
        container: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            height: 40,
            width: '100%',
            alignItems: 'center',
        },
        profileContainer: {
            alignItems: 'center',
            width: '13%',
        },
        profile: {
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderRadius: 12.5,
            width: 25,
            height: 25,
            borderColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
        textContainer: {
            width: '74%',
            flexDirection: 'row',
        },
        displayName: {
            fontSize: 15,
            fontWeight: '400',
            color: theme.centerChannelColor,
        },
        username: {
            fontSize: 15,
            fontWeight: '400',
            color: changeOpacity(theme.centerChannelColor, 0.56),
        },
    };
});
