// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {type StyleProp, StyleSheet, type ViewStyle} from 'react-native';

import ProfilePicture from '@components/profile_picture';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {openUserProfileModal} from '@screens/navigation';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channelId: string;
    containerStyle?: StyleProp<ViewStyle>;
    size?: number;
    showStatus?: boolean;
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

const Member = ({channelId, containerStyle, size = 72, showStatus = true, theme, user}: Props) => {
    const intl = useIntl();
    const onPress = useCallback(() => {
        openUserProfileModal(intl, theme, {
            userId: user.id,
            channelId,
            location: Screens.CHANNEL,
        });
    }, [intl, user.id, channelId, theme]);

    return (
        <TouchableWithFeedback
            onPress={onPress}
            style={[styles.profile, containerStyle]}
            type='opacity'
        >
            <ProfilePicture
                author={user}
                size={size}
                iconSize={48}
                showStatus={showStatus}
                statusSize={24}
                testID={`channel_intro.${user.id}.profile_picture`}
            />
        </TouchableWithFeedback>
    );
};

export default Member;
