// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import ProfilePicture from '@components/profile_picture';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {displayUsername} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUserId: string;
    teammateNameDisplay: string;
    theme: Theme;
    user: UserModel;
}

const Row = ({currentUserId, teammateNameDisplay, theme, user}: Props) => {
    const goToUserProfile = useCallback(preventDoubleTap(async () => {
        // @todo
        // const {formatMessage} = intl;
        // const screen = 'UserProfile';
        // const title = formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        // const passProps = {
        //     userId: user.id,
        // };

        // const closeButton = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);

        // const options = {
        //     topBar: {
        //         leftButtons: [{
        //             id: 'close-settings',
        //             icon: closeButton,
        //         }],
        //     },
        // };

        // showModal(screen, title, passProps, options);
    }), []);

    if (!user.id) {
        return null;
    }

    const style = getStyleSheet(theme);

    const {id, username} = user;
    const usernameDisplay = '@' + username;
    const displayName = displayUsername(user, undefined, teammateNameDisplay);
    const isCurrentUser = currentUserId === id;
    return (
        <TouchableOpacity
            key={user.id}
            onPress={goToUserProfile}
        >
            <View style={style.container}>
                <View style={style.profile}>
                    <ProfilePicture
                        author={user}
                        showStatus={false}
                        size={24}
                    />
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
                                <>
                                    {' '}
                                    <FormattedText
                                        id='mobile.participants.you'
                                        defaultMessage='(you)'
                                    />
                                </>
                            )}
                            {`  ${usernameDisplay}`}
                        </Text>
                    }
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            height: 40,
            width: '100%',
            alignItems: 'center',
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
            flexDirection: 'row',
            marginLeft: 12,
            marginRight: 24,
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

export default Row;
