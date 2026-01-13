// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {FlashList, type ListRenderItem, type ViewToken} from '@shopify/flash-list';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter, View, type LayoutChangeEvent} from 'react-native';

import {fetchDirectChannelsInfo, switchToChannelById} from '@actions/remote/channel';
import ChannelItem from '@components/channel_item';
import {ROW_HEIGHT as CHANNEL_ROW_HEIGHT} from '@components/channel_item/channel_item';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {Events} from '@constants';
import {CHANNEL, DRAFT, THREAD} from '@constants/screens';
import {HOME_PADDING} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useTeamSwitch} from '@hooks/team_switch';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {isDMorGM} from '@utils/channel';
import {logDebug} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Empty from './empty_unreads';
import LoadCategoriesError from './error';
import CategoryHeader from './header';
import {keyExtractor, getItemType, type FlattenedItem} from './helpers/flatten_categories';

import type ChannelModel from '@typings/database/models/servers/channel';

type Props = {
    flattenedItems: FlattenedItem[];
    unreadChannelIds: Set<string>;
    onlyUnreads: boolean;
    isTablet: boolean;
};

const HEADER_HEIGHT = 44;
const ESTIMATED_ITEM_SIZE = 42;
const VIEWABILITY_CONFIG = {
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300,
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    mainList: {
        flex: 1,
    },
    loadingView: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    unreadsHeading: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Heading', 75),
        textTransform: 'uppercase',
        paddingVertical: 8,
        marginTop: 12,
        ...HOME_PADDING,
    },
}));

const Categories = ({flattenedItems, unreadChannelIds, onlyUnreads, isTablet}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const listRef = useRef<FlashList<FlattenedItem>>(null);
    const serverUrl = useServerUrl();
    const switchingTeam = useTeamSwitch();
    const [initialLoad, setInitialLoad] = useState(flattenedItems.length === 0);
    const [isChannelScreenActive, setChannelScreenActive] = useState(true);
    const [listHeight, setListHeight] = useState(0);
    const [hasUnreadsAbove, setHasUnreadsAbove] = useState(false);
    const [hasUnreadsBelow, setHasUnreadsBelow] = useState(false);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.ACTIVE_SCREEN, (screen: string) => {
            setChannelScreenActive(screen !== DRAFT && screen !== THREAD);
        });

        return () => {
            listener.remove();
        };
    }, []);

    const directChannels = useMemo(() => {
        const channels = flattenedItems.filter((item) => item.type === 'channel' && isDMorGM(item.channel));
        const channelModels = channels.map((item) => (item.type === 'channel' ? item.channel : null));
        return channelModels.filter((c): c is ChannelModel => c !== null);
    }, [flattenedItems]);

    useEffect(() => {
        const channelsWithoutDisplayName = directChannels.filter((c) => !c.displayName);
        if (channelsWithoutDisplayName.length) {
            fetchDirectChannelsInfo(serverUrl, channelsWithoutDisplayName);
        }
    }, [directChannels, serverUrl]);

    const onChannelSwitch = useCallback(async (c: Channel | ChannelModel) => {
        DeviceEventEmitter.emit(Events.ACTIVE_SCREEN, CHANNEL);
        PerformanceMetricsManager.startMetric('mobile_channel_switch');
        switchToChannelById(serverUrl, c.id);
    }, [serverUrl]);

    const renderItem: ListRenderItem<FlattenedItem> = useCallback(({item}) => {
        if (item.type === 'unreads_header') {
            return (
                <FormattedText
                    id='mobile.channel_list.unreads'
                    defaultMessage='Unreads'
                    style={styles.unreadsHeading}
                />
            );
        }

        if (item.type === 'header') {
            return <CategoryHeader category={item.category}/>;
        }

        // item.type === 'channel'
        const testIdSuffix = item.categoryType;
        return (
            <ChannelItem
                channel={item.channel}
                onPress={onChannelSwitch}
                testID={`channel_list.category.${testIdSuffix}.channel_item`}
                shouldHighlightActive={isChannelScreenActive}
                shouldHighlightState={true}
                isOnHome={true}
            />
        );
    }, [styles, onChannelSwitch, isChannelScreenActive]);

    const overrideItemLayout = useCallback((
        layout: {span?: number; size?: number},
        item: FlattenedItem,
    ) => {
        if (item.type === 'unreads_header' || item.type === 'header') {
            layout.size = HEADER_HEIGHT;
        } else {
            layout.size = CHANNEL_ROW_HEIGHT;
        }
        layout.span = 1;
    }, []);

    const onListLayout = useCallback((event: LayoutChangeEvent) => {
        const {height} = event.nativeEvent.layout;
        setListHeight(height);
    }, []);

    const onViewableItemsChanged = useCallback(({viewableItems}: {viewableItems: ViewToken[]}) => {
        if (!viewableItems.length || !unreadChannelIds.size) {
            setHasUnreadsAbove(false);
            setHasUnreadsBelow(false);
            return;
        }

        // Get indices of viewable items
        const visibleIndices = viewableItems.
            filter((item) => item.isViewable && item.index !== null).
            map((item) => item.index as number);

        if (!visibleIndices.length) {
            return;
        }

        const firstVisible = Math.min(...visibleIndices);
        const lastVisible = Math.max(...visibleIndices);

        // Single pass: check channels above and below viewport
        let hasUnreadsAboveViewport = false;
        let hasUnreadsBelowViewport = false;

        for (let i = 0; i < flattenedItems.length; i++) {
            const item = flattenedItems[i];

            if (item.type === 'channel' && unreadChannelIds.has(item.channelId)) {
                if (i < firstVisible) {
                    hasUnreadsAboveViewport = true;
                } else if (i > lastVisible) {
                    hasUnreadsBelowViewport = true;
                }

                // Early exit if we found both
                if (hasUnreadsAboveViewport && hasUnreadsBelowViewport) {
                    break;
                }
            }
        }

        setHasUnreadsAbove(hasUnreadsAboveViewport);
        setHasUnreadsBelow(hasUnreadsBelowViewport);
    }, [flattenedItems, unreadChannelIds]);

    useEffect(() => {
        // Once we add the components to show unreads above/below, this useEffect can be removed
        logDebug('Unreads above viewport:', hasUnreadsAbove, ', below viewport:', hasUnreadsBelow);
    }, [hasUnreadsAbove, hasUnreadsBelow]);

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

    useEffect(() => {
        if (listRef.current) {
            listRef.current.recomputeViewableItems();
        }
    }, []);

    const showEmptyState = onlyUnreads && flattenedItems.length === 0 && !isTablet;

    const ListEmptyComponent = useMemo(() => {
        if (showEmptyState) {
            return (
                <View style={{height: listHeight}}>
                    <Empty/>
                </View>
            );
        }
        return undefined;
    }, [showEmptyState, listHeight]);

    if (flattenedItems.length === 0 && !switchingTeam && !initialLoad && !onlyUnreads) {
        return <LoadCategoriesError/>;
    }

    return (
        <>
            {!switchingTeam && !initialLoad && (
                <FlashList<FlattenedItem>
                    ref={listRef}
                    data={flattenedItems}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    getItemType={getItemType}
                    estimatedItemSize={ESTIMATED_ITEM_SIZE}
                    overrideItemLayout={overrideItemLayout}
                    drawDistance={ESTIMATED_ITEM_SIZE * 20}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={ListEmptyComponent}
                    onLayout={onListLayout}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={VIEWABILITY_CONFIG}
                />
            )}
            {(switchingTeam || initialLoad) && (
                <View style={styles.loadingView}>
                    <Loading
                        size='large'
                        themeColor='sidebarText'
                        testID='categories.loading'
                    />
                </View>
            )}
        </>
    );
};

export default Categories;
