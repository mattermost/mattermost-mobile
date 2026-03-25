// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';

import {buildAbsoluteUrl} from '@actions/remote/file';
import {buildProfileImageUrlFromUser} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import ExpoImage from '@components/expo_image';
import {useServerUrl} from '@context/server';
import {urlSafeBase64Encode} from '@utils/security';
import {changeOpacity} from '@utils/theme';
import {getLastPictureUpdate} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    author?: UserModel;
    overrideIconUrl?: string;
}

const styles = StyleSheet.create({
    avatarContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        margin: 2,
        width: 32,
        height: 32,
    },
    avatar: {
        height: 32,
        width: 32,
    },
    avatarRadius: {
        borderRadius: 18,
    },
});

const Avatar = ({
    author,
    overrideIconUrl,
}: Props) => {
    const serverUrl = useServerUrl();

    let uri = overrideIconUrl;
    let id = 'avatar-override';
    if (uri) {
        id = `avatar-override-${urlSafeBase64Encode(uri)}`;
    } else if (author) {
        uri = buildProfileImageUrlFromUser(serverUrl, author);
        id = `user-${author.id}-${getLastPictureUpdate(author)}`;
    }

    let picture;
    if (uri) {
        picture = (
            <ExpoImage
                id={id}
                source={{uri: buildAbsoluteUrl(serverUrl, uri)}}
                style={[styles.avatar, styles.avatarRadius]}
            />
        );
    } else {
        picture = (
            <CompassIcon
                name='account-outline'
                size={32}
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

