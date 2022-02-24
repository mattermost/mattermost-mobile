// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleSheet, View} from 'react-native';
import FastImage from 'react-native-fast-image';

import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import NetworkManager from '@init/network_manager';
import {changeOpacity} from '@utils/theme';

type Props = {
    authorId?: string;
    overrideIconUrl?: string;
}

const styles = StyleSheet.create({
    avatarContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        padding: 2,
        width: 34,
        height: 34,
    },
    avatar: {
        height: 32,
        width: 32,
    },
    avatarRadius: {
        borderRadius: 18,
    },
});

const Avatar = ({authorId, overrideIconUrl}: Props) => {
    const serverUrl = useServerUrl();
    const avatarUri = useMemo(() => {
        try {
            const client = NetworkManager.getClient(serverUrl);

            if (overrideIconUrl) {
                return client.getAbsoluteUrl(overrideIconUrl);
            } else if (authorId) {
                const pictureUrl = client.getProfilePictureUrl(authorId, 0);
                return `${serverUrl}${pictureUrl}`;
            }

            return undefined;
        } catch {
            return undefined;
        }
    }, [serverUrl, authorId, overrideIconUrl]);

    let picture;
    if (avatarUri) {
        picture = (
            <FastImage
                source={{uri: avatarUri}}
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

