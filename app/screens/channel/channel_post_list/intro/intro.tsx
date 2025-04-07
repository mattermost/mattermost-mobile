// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, DeviceEventEmitter, Platform, StyleSheet, View} from 'react-native';

import {Events, General} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import EphemeralStore from '@store/ephemeral_store';
import {isDefaultChannel} from '@utils/channel';

import DirectChannel from './direct_channel';
import PublicOrPrivateChannel from './public_or_private_channel';
import TownSquare from './townsquare';

import type ChannelModel from '@typings/database/models/servers/channel';
import type RoleModel from '@typings/database/models/servers/role';

type Props = {
    channel?: ChannelModel;
    roles: RoleModel[];
}

const PADDING_TOP = Platform.select({ios: 150, default: 100});

const styles = StyleSheet.create({
    container: {
        marginVertical: 12,
        paddingTop: PADDING_TOP,
        overflow: 'hidden',
    },
});

const Intro = ({channel, roles}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const [fetching, setFetching] = useState(EphemeralStore.isLoadingMessagesForChannel(serverUrl, channel?.id || ''));

    const element = useMemo(() => {
        if (!channel) {
            return null;
        }

        if (channel.type === General.OPEN_CHANNEL && isDefaultChannel(channel)) {
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
        const listener = DeviceEventEmitter.addListener(Events.LOADING_CHANNEL_POSTS, ({serverUrl: eventServerUrl, channelId: eventChannelId, value}) => {
            if (eventServerUrl === serverUrl && eventChannelId === channel?.id) {
                setFetching(value);
            }
        });

        return () => listener.remove();
    }, [serverUrl, channel?.id]);

    useDidUpdate(() => {
        setFetching(EphemeralStore.isLoadingMessagesForChannel(serverUrl, channel?.id || ''));
    }, [serverUrl, channel?.id]);

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
