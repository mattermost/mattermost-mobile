// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';
import FastImage from 'react-native-fast-image';

import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import NetworkManager from '@managers/network_manager';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {Client} from '@client/rest';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    users: UserModel[];
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        flexDirection: 'row',
        marginBottom: 8,
    },
    profile: {
        borderColor: theme.centerChannelBg,
        borderRadius: 24,
        borderWidth: 2,
        height: 48,
        width: 48,
    },
}));

const GroupAvatars = ({users}: Props) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    let client: Client | undefined;

    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        return null;
    }

    const group = users.map((u, i) => {
        const pictureUrl = client!.getProfilePictureUrl(u.id, u.lastPictureUpdate);
        return (
            <FastImage
                key={pictureUrl + i.toString()}
                style={[styles.profile, {transform: [{translateX: -(i * 12)}]}]}
                source={{uri: `${serverUrl}${pictureUrl}`}}
            />
        );
    });

    return (
        <View style={[styles.container]}>
            {group}
        </View>
    );
};

export default GroupAvatars;
