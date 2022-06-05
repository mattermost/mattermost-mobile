// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {StyleSheet, View} from 'react-native';
import FastImage from 'react-native-fast-image';

import ProfilePicture from '@app/components/profile_picture';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    enablePostIconOverride: boolean;
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

const UserProfileAvatar = ({enablePostIconOverride, user, userIconOverride}: Props) => {
    if (enablePostIconOverride && userIconOverride) {
        return (
            <View style={styles.avatar}>
                <FastImage
                    style={styles.avatar}
                    source={{uri: userIconOverride}}
                />
            </View>
        );
    }

    return (
        <ProfilePicture
            author={user}
            showStatus={true}
            size={96}
            statusSize={24}
        />
    );
};

export default UserProfileAvatar;
