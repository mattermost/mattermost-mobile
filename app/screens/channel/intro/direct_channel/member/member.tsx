// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {showModal} from '@screens/navigation';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    theme: Theme;
    user: UserModel;
}

const styles = StyleSheet.create({
    profile: {
        height: 67,
        marginBottom: 12,
        marginRight: 12,
    },
});

const Member = ({theme, user}: Props) => {
    const intl = useIntl();
    const onPress = useCallback(() => {
        const screen = 'UserProfile';
        const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const passProps = {
            userId: user.id,
        };

        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);

        const options = {
            topBar: {
                leftButtons: [{
                    id: 'close-user-profile',
                    icon: closeButton,
                    testID: 'close.settings.button',
                }],
            },
        };

        showModal(screen, title, passProps, options);
    }, [theme]);

    return (
        <TouchableWithFeedback
            onPress={onPress}
            style={styles.profile}
            type='opacity'
        >
            <ProfilePicture
                author={user}
                size={64}
                iconSize={48}
                statusSize={25}
                testID='channel_intro.profile_picture'
            />
        </TouchableWithFeedback>
    );
};

export default Member;
