// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, DeviceEventEmitter, Platform, StyleSheet, View} from 'react-native';

import {Events, General} from '@constants';
import {useTheme} from '@context/theme';

import DirectChannel from './direct_channel';
import PublicOrPrivateChannel from './public_or_private_channel';
import TownSquare from './townsquare';

import type ChannelModel from '@typings/database/models/servers/channel';
import type RoleModel from '@typings/database/models/servers/role';

type Props = {
    channel?: ChannelModel;
    hasPosts: boolean;
    roles: RoleModel[];
}

const PADDING_TOP = Platform.select({ios: 150, default: 100});

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
        paddingTop: PADDING_TOP,
        overflow: 'hidden',
        ...Platform.select({
            android: {
                scaleY: -1,
            },
        }),
    },
});

const Intro = ({channel, hasPosts, roles}: Props) => {
    const [fetching, setFetching] = useState(!hasPosts);
    const theme = useTheme();
    const element = useMemo(() => {
        if (!channel) {
            return null;
        }

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

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.LOADING_CHANNEL_POSTS, (value: boolean) => {
            setFetching(value);
        });

        return () => listener.remove();
    }, []);

    // We add a timeout to remove the loading indicator
    // Even if the channel does not have any posts
    useEffect(() => {
        const time = setTimeout(() => {
            if (!hasPosts && fetching) {
                setFetching(false);
            }
        }, 1000);

        return () => {
            if (time) {
                clearTimeout(time);
            }
        };
    }, [hasPosts, fetching]);

    if (fetching) {
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
