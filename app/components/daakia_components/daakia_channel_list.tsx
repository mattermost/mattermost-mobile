// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {DeviceEventEmitter, FlatList, StyleSheet, View} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import Loading from '@components/loading';
import {Events} from '@constants';
import {CHANNEL} from '@constants/screens';
import {useServerUrl} from '@context/server';
import {useTeamSwitch} from '@hooks/team_switch';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';

import DaakiaChannelItem from '../daakia_components/daakia_channel_item';

import type ChannelModel from '@typings/database/models/servers/channel';
import type PostModel from '@typings/database/models/servers/post';

type Props = {
    allChannels: ChannelModel[];
    unreadIds: Set<string>;
    currentUserId: string;
    lastPosts?: Map<string, PostModel>;
    locale: string;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingView: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
});

const DaakiaChannelList = ({
    allChannels,
    unreadIds,
    currentUserId,
    lastPosts,
    locale,
}: Props) => {
    const serverUrl = useServerUrl();
    const switchingTeam = useTeamSwitch();
    const [initialLoad, setInitialLoad] = useState(!allChannels.length);

    const onChannelSwitch = useCallback(async (channel: ChannelModel) => {
        DeviceEventEmitter.emit(Events.ACTIVE_SCREEN, CHANNEL);
        PerformanceMetricsManager.startMetric('mobile_channel_switch');
        switchToChannelById(serverUrl, channel.id);
    }, [serverUrl]);

    // Sorting is now handled in the observable chain, just use allChannels directly
    const channelsToShow = allChannels;

    const renderChannelItem = useCallback(({item}: {item: ChannelModel}) => {
        return (
            <DaakiaChannelItem
                channel={item}
                isUnread={unreadIds.has(item.id)}
                onPress={onChannelSwitch}
                currentUserId={currentUserId}
                lastPost={lastPosts?.get(item.id)}
                locale={locale}
                serverUrl={serverUrl}
            />
        );
    }, [unreadIds, onChannelSwitch, currentUserId, lastPosts, locale, serverUrl]);

    useEffect(() => {
        const t = setTimeout(() => {
            setInitialLoad(false);
        }, 0);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (switchingTeam) {
            return;
        }
        PerformanceMetricsManager.endMetric('mobile_team_switch', serverUrl);
    }, [switchingTeam, serverUrl]);

    if (switchingTeam || initialLoad) {
        return (
            <View style={styles.loadingView}>
                <Loading
                    size='large'
                    themeColor='sidebarText'
                    testID='daakia_channel_list.loading'
                />
            </View>
        );
    }

    return (
        <FlatList
            data={channelsToShow}
            renderItem={renderChannelItem}
            keyExtractor={(item) => item.id}
            style={styles.container}
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}

            // @ts-expect-error strictMode not included in the types
            strictMode={true}
        />
    );
};

export default DaakiaChannelList;
