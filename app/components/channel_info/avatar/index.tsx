// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {buildAbsoluteUrl} from '@actions/remote/file';
import {buildProfileImageUrlFromUser} from '@actions/remote/user';
import {useServerUrl} from '@app/context/server';
import CompassIcon from '@components/compass_icon';
import {changeOpacity} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    author: UserModel;
}

const styles = StyleSheet.create({
    avatarContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        margin: 2,
        width: 20,
        height: 20,
    },
    avatar: {
        height: 20,
        width: 20,
    },
    avatarRadius: {
        borderRadius: 18,
    },
});

const Avatar = ({
    author,
}: Props) => {
    const serverUrl = useServerUrl();

    let uri = '';
    if (!uri && author) {
        uri = buildProfileImageUrlFromUser(serverUrl, author);
    }

    let picture;
    if (uri) {
        picture = (
            <Image
                source={{uri: buildAbsoluteUrl(serverUrl, uri)}}
                style={[styles.avatar, styles.avatarRadius]}
            />
        );
    } else {
        picture = (
            <CompassIcon
                name='account-outline'
                size={20}
                color={changeOpacity('#fff', 0.48)}
            />
        );
    }

    return (
        <View style={[styles.avatarContainer, styles.avatarRadius]}>
            {picture}
        </View>
    );
};

export default Avatar;

