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

type Props = {
    channel: ChannelModel;
    loading?: boolean;
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

const Intro = ({channel, loading = false}: Props) => {
    const theme = useTheme();
    const element = useMemo(() => {
        if (channel.type === General.OPEN_CHANNEL && channel.name === General.DEFAULT_CHANNEL) {
            return (
                <TownSquare
                    displayName={channel.displayName}
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
    }, [channel, theme]);

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
