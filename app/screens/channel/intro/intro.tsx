// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {ActivityIndicator, Platform, StyleSheet, View} from 'react-native';

import {General} from '@constants';
import {useTheme} from '@context/theme';

import DirectChannel from './direct_channel';
import PublicOrPrivateChannel from './public_or_private_channel';
import TownSquare from './townsquare';

import type ChannelModel from '@typings/database/models/servers/channel';
import type RoleModel from '@typings/database/models/servers/role';

type Props = {
    channel: ChannelModel;
    loading?: boolean;
    roles: RoleModel[];
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
        overflow: 'hidden',
        ...Platform.select({
            android: {
                scaleY: -1,
            },
        }),
    },
});

const Intro = ({channel, loading = false, roles}: Props) => {
    const theme = useTheme();
    const element = useMemo(() => {
        if (channel.type === General.OPEN_CHANNEL && channel.name === General.DEFAULT_CHANNEL) {
            return (
                <TownSquare
                    channelId={channel.id}
                    displayName={channel.displayName}
                    roles={roles}
                    theme={theme}
                />
            );
        }

        switch (channel.type) {
            case General.OPEN_CHANNEL:
            case General.PRIVATE_CHANNEL:
                return (
                    <PublicOrPrivateChannel
                        channel={channel}
                        roles={roles}
                        theme={theme}
                    />
                );
            default:
                return (
                    <DirectChannel
                        channel={channel}
                        theme={theme}
                    />
                );
        }
    }, [channel, roles, theme]);

    if (loading) {
        return (
            <ActivityIndicator
                size='small'
                color={theme.centerChannelColor}
                style={styles.container}
            />
        );
    }

    return (
        <View style={styles.container}>
            {element}
        </View>
    );
};

export default Intro;
