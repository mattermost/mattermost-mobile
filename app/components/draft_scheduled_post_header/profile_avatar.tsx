// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';

import {buildAbsoluteUrl} from '@actions/remote/file';
import {buildProfileImageUrlFromUser} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {changeOpacity} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    author: UserModel;
}

const styles = StyleSheet.create({
    avatarContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
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

const ProfileAvatar = ({
    author,
}: Props) => {
    const serverUrl = useServerUrl();

    const uri = useMemo(() => buildProfileImageUrlFromUser(serverUrl, author), [serverUrl, author]);

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
                size={22}
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

export default ProfileAvatar;

