// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {injectIntl, intlShape} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import {showModal} from '@actions/navigation';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import ProfilePicture from '@components/profile_picture';
import {UserProfile} from '@mm-redux/types/users';
import {$ID} from '@mm-redux/types/utilities';
import {displayUsername} from '@mm-redux/utils/user_utils';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/theme';

type Props = {
    currentUserId: $ID<UserProfile>;
    teammateNameDisplay: string;
    theme: Theme;
    user: UserProfile;
    intl: typeof intlShape;
}

const ParticipantRow = ({currentUserId, teammateNameDisplay, theme, user, intl}: Props) => {
    const goToUserProfile = React.useCallback(preventDoubleTap(async () => {
        const {formatMessage} = intl;
        const screen = 'UserProfile';
        const title = formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const passProps = {
            userId: user.id,
        };

        const closeButton = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);

        const options = {
            topBar: {
                leftButtons: [{
                    id: 'close-settings',
                    icon: closeButton,
                }],
            },
        };

        showModal(screen, title, passProps, options);
    }), []);

    if (!user.id) {
        return null;
    }

    const {id, username} = user;
    const usernameDisplay = '@' + username;
    const displayName = displayUsername(user, teammateNameDisplay);

    const style = getStyleSheet(theme);

    const isCurrentUser = currentUserId === id;

    return (
        <TouchableOpacity
            key={user.id}
            onPress={goToUserProfile}
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
                        {`${displayName === username ? username : displayName}`}
                    </Text>
                    {displayName !== username &&
                        <Text style={style.username}>
                            {isCurrentUser && (
                                <FormattedText
                                    id='mobile.participants.you'
                                    defaultMessage='(you)'
                                />
                            )}
                            {`  ${usernameDisplay}`}
                        </Text>
                    }
                </Text>
            </View>
        </TouchableOpacity>
    );
};

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

export default injectIntl(ParticipantRow);
