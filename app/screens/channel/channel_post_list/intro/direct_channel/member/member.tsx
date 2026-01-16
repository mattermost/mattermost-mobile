// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {type StyleProp, StyleSheet, type ViewStyle} from 'react-native';

import ProfilePicture from '@components/profile_picture';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {openUserProfile} from '@utils/navigation';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channelId: string;
    containerStyle?: StyleProp<ViewStyle>;
    size?: number;
    showStatus?: boolean;
    user: UserModel;
}

const styles = StyleSheet.create({
    profile: {
        height: 67,
        marginBottom: 12,
        marginRight: 12,
    },
});

const Member = ({channelId, containerStyle, size = 72, showStatus = true, user}: Props) => {
    const onPress = useCallback(() => {
        openUserProfile({
            userId: user.id,
            channelId,
            location: Screens.CHANNEL,
        });
    }, [user.id, channelId]);

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
