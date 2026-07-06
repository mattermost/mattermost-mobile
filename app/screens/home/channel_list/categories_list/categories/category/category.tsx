// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {DeviceEventEmitter, FlatList, View} from 'react-native';

import {fetchDirectChannelsInfo, switchToChannelById} from '@actions/remote/channel';
import ChannelItem from '@components/channel_item';
import {Events, Preferences, Screens} from '@constants';
import {DMS_CATEGORY} from '@constants/categories';
import {useServerUrl} from '@context/server';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {
    filterArchivedChannels,
    filterAutoclosedDMs,
    filterManuallyClosedDms,
    getUnreadIds,
    sortChannels,
    type ChannelWithMyChannel,
} from '@utils/categories';
import {isDMorGM} from '@utils/channel';

import CategoryHeader from '../header';
import {useSharedData} from '../shared_data_context';

import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type UserModel from '@typings/database/models/servers/user';

export type SharedData = {
    notifyProps: Record<string, Partial<ChannelNotifyProps>>;
    manuallyClosedPrefs: PreferenceModel[];
    autoclosePrefs: PreferenceModel[];
    deactivatedUsers: Map<string, UserModel> | undefined;
    dmsLimit: number;
    currentChannelId: string;
    lastUnreadId: string | undefined;
    unreadsOnTop: boolean;
};

type CategoryState = {collapsed: boolean; sorting: string};

export type Props = {
    category: CategoryModel;
    currentUserId: string;
    locale: string;
    sortOrderMap: Map<string, number>;
    managedChannelIds: Set<string>;
    isChannelScreenActive: boolean;
    myChannels?: MyChannelModel[];
    channels?: ChannelModel[];
    categoryState?: CategoryState;
};

const Category = ({
    category,
    currentUserId,
    locale,
    sortOrderMap,
    managedChannelIds,
    isChannelScreenActive,
    myChannels,
    channels,
    categoryState,
}: Props) => {
    const serverUrl = useServerUrl();
    const s = useSharedData();

    // sortedChannels is derived from observable props that change as a unit,
    // so useMemo avoids recomputing when unrelated state (e.g. isChannelScreenActive) changes.
    const {sortedChannels, unreadIds} = useMemo(() => {
        if (!myChannels || !channels || !s) {
            return {sortedChannels: [], unreadIds: new Set<string>()};
        }

        const sorting = categoryState?.sorting ?? category.sorting;
        const maxDms = category.type === DMS_CATEGORY ? s.dmsLimit : Preferences.CHANNEL_SIDEBAR_LIMIT_DMS_DEFAULT;
        const channelMap = new Map<string, ChannelModel>(channels.map((c) => [c.id, c]));

        let cwms: ChannelWithMyChannel[] = myChannels.reduce<ChannelWithMyChannel[]>((acc, mc) => {
            const channel = channelMap.get(mc.id);
            if (channel) {
                acc.push({channel, myChannel: mc, sortOrder: sortOrderMap.get(mc.id) ?? 0});
            }
            return acc;
        }, []);

        cwms = filterArchivedChannels(cwms, s.currentChannelId);
        cwms = filterManuallyClosedDms(cwms, s.notifyProps, s.manuallyClosedPrefs, currentUserId, s.lastUnreadId);
        cwms = filterAutoclosedDMs(
            category.type as CategoryType, maxDms, currentUserId, s.currentChannelId,
            cwms, s.autoclosePrefs, s.notifyProps, s.deactivatedUsers, s.lastUnreadId,
        );

        const sorted = sortChannels(sorting as CategorySorting, cwms, s.notifyProps, locale).
            filter((c) => !managedChannelIds.has(c.id));
        const unreads = getUnreadIds(cwms, s.notifyProps, s.lastUnreadId);

        return {sortedChannels: sorted, unreadIds: unreads};
    }, [myChannels, channels, s, category, categoryState, currentUserId, locale, sortOrderMap, managedChannelIds]);

    const onChannelSwitch = useCallback((c: Channel | ChannelModel) => {
        DeviceEventEmitter.emit(Events.ACTIVE_SCREEN, Screens.CHANNEL);
        PerformanceMetricsManager.startMetric('mobile_channel_switch');
        switchToChannelById(serverUrl, c.id);
    }, [serverUrl]);

    useEffect(() => {
        const dmsWithoutName = sortedChannels.filter((c) => isDMorGM(c) && !c.displayName);
        if (dmsWithoutName.length) {
            fetchDirectChannelsInfo(serverUrl, dmsWithoutName);
        }
    }, [sortedChannels, serverUrl]);

    const collapsed = categoryState?.collapsed ?? category.collapsed;
    let toShow: ChannelModel[] = [];
    if (myChannels && channels && s) {
        toShow = (collapsed ? sortedChannels.filter((c) => unreadIds.has(c.id)) : sortedChannels);
    }

    const renderItem = ({item}: {item: ChannelModel}) => (
        <ChannelItem
            key={item.id}
            channel={item}
            onPress={onChannelSwitch}
            testID={`channel_list.category.${category.type}.channel_item`}
            shouldHighlightActive={isChannelScreenActive}
            shouldHighlightState={true}
            isOnHome={true}
        />
    );

    return (
        <View key={category.id}>
            <CategoryHeader category={category}/>
            <FlatList
                data={toShow}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
            />
        </View>
    );
};

export default Category;
