// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import {chunk} from 'lodash';
import React from 'react';
import {View} from 'react-native';

import {buildAbsoluteUrl} from '@actions/remote/file';
import {buildProfileImageUrlFromUser} from '@actions/remote/user';
import {useServerUrl} from '@context/server';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    theme: Theme;
    users: UserModel[];
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        flexDirection: 'row',
        marginBottom: 12,
    },
    profile: {
        borderColor: theme.centerChannelBg,
        borderRadius: 36,
        borderWidth: 2,
        height: 72,
        width: 72,
    },
}));

const Group = ({theme, users}: Props) => {
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const rows = chunk(users, 5);
    const groups = rows.map((c, k) => {
        const group = c.map((u, i) => {
            const pictureUrl = buildProfileImageUrlFromUser(serverUrl, u);
            return (
                <Image
                    key={pictureUrl + i.toString()}
                    style={[styles.profile, {transform: [{translateX: -(i * 24)}]}]}
                    source={{uri: buildAbsoluteUrl(serverUrl, pictureUrl)}}
                />
            );
        });

        return (
            <View
                key={'group_avatar' + k.toString()}
                style={[styles.container, {left: (c.length - 1) * 12}]}
            >
                {group}
            </View>
        );
    });

    return (
        <>
            {groups}
        </>
    );
};

export default Group;
