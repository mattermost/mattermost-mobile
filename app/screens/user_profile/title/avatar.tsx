// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {StyleSheet, View} from 'react-native';
import FastImage from 'react-native-fast-image';
import Animated from 'react-native-reanimated';

import ProfilePicture from '@components/profile_picture';

import type UserModel from '@typings/database/models/servers/user';

// @ts-expect-error FastImage does work with Animated.createAnimatedComponent
const AnimatedFastImage = Animated.createAnimatedComponent(FastImage);

type Props = {
    enablePostIconOverride: boolean;
    forwardRef?: React.RefObject<any>;
    user: UserModel;
    userIconOverride?: string;
}

const styles = StyleSheet.create({
    avatar: {
        borderRadius: 48,
        height: 96,
        width: 96,
    },
});

const UserProfileAvatar = ({enablePostIconOverride, forwardRef, user, userIconOverride}: Props) => {
    if (enablePostIconOverride && userIconOverride) {
        return (
            <View style={styles.avatar}>
                <AnimatedFastImage
                    ref={forwardRef}
                    style={styles.avatar}
                    source={{uri: userIconOverride}}
                />
            </View>
        );
    }

    return (
        <ProfilePicture
            author={user}
            forwardRef={forwardRef}
            showStatus={true}
            size={96}
            statusSize={24}
            testID={`user_profile_avatar.${user.id}.profile_picture`}
        />
    );
};

export default UserProfileAvatar;
