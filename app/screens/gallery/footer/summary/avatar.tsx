// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';
import FastImage from 'react-native-fast-image';

import type {AvatarProps} from 'types/screens/gallery';

const styles = StyleSheet.create({
    avatarContainer: {
        borderWidth: 1,
        borderColor: 'rgba(61, 60, 64, 0.08)',
    },
    avatar: {
        height: 32,
        width: 32,
    },
    avatarRadius: {
        borderRadius: 16,
    },
});

const Avatar = ({avatarUri}: AvatarProps) => {
    const source = avatarUri ? {uri: avatarUri} : require('@assets/images/profile.jpg');

    return (
        <View style={[styles.avatarContainer, styles.avatarRadius]}>
            <FastImage
                source={source}
                style={[styles.avatar, styles.avatarRadius]}
            />
        </View>
    );
};

export default Avatar;
