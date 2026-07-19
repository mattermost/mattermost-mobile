// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {DeviceEventEmitter, FlatList, type ListRenderItem, type ViewToken, View, type LayoutChangeEvent, Platform} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import ChannelItem from '@components/channel_item';
import {ROW_HEIGHT} from '@components/channel_item/channel_item';
import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {Events, Screens} from '@constants';
import {MANAGED_LOCAL_CATEGORY_PREFIX} from '@constants/categories';
import {HOME_PADDING} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useTeamSwitch} from '@hooks/team_switch';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {logDebug} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CategoryRow from './category';
import Empty from './empty_unreads';
import LoadCategoriesError from './error';
import CategoryHeader from './header';
import {keyExtractor, type FlattenedItem} from './helpers/flattened_item';

import type ChannelModel from '@typings/database/models/servers/channel';

export type Props = {
    flattenedItems: FlattenedItem[];
    unreadChannelIds: Set<string>;
    onlyUnreads: boolean;
    currentUserId: string;
    locale: string;
    isTablet: boolean;
    headerButtons: Array<React.JSX.Element | null>;
};

const VIEWABILITY_CONFIG = {
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300,
};

const EMPTY_SET = new Set<string>();

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
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

const Categories = ({
    flattenedItems,
    unreadChannelIds,
    onlyUnreads,
    currentUserId,
    locale,
    isTablet,
    headerButtons,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const listRef = useRef<FlatList<FlattenedItem> | null>(null);
    const serverUrl = useServerUrl();
    const switchingTeam = useTeamSwitch();

    // Android is slower to process the initial list, so always show the spinner on first mount there.
    const [initialLoad, setInitialLoad] = useState(() => Platform.select({default: flattenedItems.length === 0, android: true}));
    const [isChannelScreenActive, setChannelScreenActive] = useState(true);
    const [hasUnreadsAbove, setHasUnreadsAbove] = useState(false);
    const [hasUnreadsBelow, setHasUnreadsBelow] = useState(false);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.ACTIVE_SCREEN, (screen: string) => {
            setChannelScreenActive(screen !== Screens.GLOBAL_DRAFTS && screen !== Screens.THREAD && screen !== Screens.PARTICIPANT_PLAYBOOKS);
        });
        return () => listener.remove();
    }, []);

    const unreadIds = unreadChannelIds ?? EMPTY_SET;

    const managedChannelIds = useMemo(() => {
        const managed = new Set<string>();
        for (const item of flattenedItems) {
            if (item.type === 'category' && item.category.id.startsWith(MANAGED_LOCAL_CATEGORY_PREFIX)) {
                for (const id of item.membership.channelIds) {
                    managed.add(id);
                }
            }
        }
        return managed;
    }, [flattenedItems]);

    const onChannelSwitch = useCallback((c: Channel | ChannelModel) => {
        DeviceEventEmitter.emit(Events.ACTIVE_SCREEN, Screens.CHANNEL);
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

        if (item.type === 'channel') {
            return (
                <ChannelItem
                    channel={item.channel}
                    onPress={onChannelSwitch}
                    testID={`channel_list.category.${item.categoryType}.channel_item`}
                    shouldHighlightActive={isChannelScreenActive}
                    shouldHighlightState={true}
                    isOnHome={true}
                />
            );
        }

        return (
            <CategoryRow
                category={item.category}
                currentUserId={currentUserId}
                locale={locale}
                channelIds={item.membership.channelIds}
                sortOrderMap={item.membership.sortOrderMap}
                managedChannelIds={managedChannelIds}
                isChannelScreenActive={isChannelScreenActive}
            />
        );
    }, [styles, onChannelSwitch, isChannelScreenActive, currentUserId, locale, managedChannelIds]);

    const onViewableItemsChanged = useCallback(({viewableItems}: {viewableItems: Array<ViewToken<FlattenedItem>>}) => {
        if (!viewableItems.length || !unreadIds.size) {
            setHasUnreadsAbove(false);
            setHasUnreadsBelow(false);
            return;
        }

        const visibleIndices = viewableItems.
            filter((item) => item.isViewable && item.index !== null).
            map((item) => item.index as number);

        if (!visibleIndices.length) {
            return;
        }

        const firstVisible = Math.min(...visibleIndices);
        const lastVisible = Math.max(...visibleIndices);

        let hasUnreadsAboveViewport = false;
        let hasUnreadsBelowViewport = false;

        for (let i = 0; i < flattenedItems.length; i++) {
            const item = flattenedItems[i];
            if (item.type === 'channel' && unreadIds.has(item.channelId)) {
                if (i < firstVisible) {
                    hasUnreadsAboveViewport = true;
                } else if (i > lastVisible) {
                    hasUnreadsBelowViewport = true;
                }
                if (hasUnreadsAboveViewport && hasUnreadsBelowViewport) {
                    break;
                }
            }
        }

        setHasUnreadsAbove(hasUnreadsAboveViewport);
        setHasUnreadsBelow(hasUnreadsBelowViewport);
    }, [flattenedItems, unreadIds]);

    useEffect(() => {
        logDebug('Unreads above viewport:', hasUnreadsAbove, ', below viewport:', hasUnreadsBelow);
    }, [hasUnreadsAbove, hasUnreadsBelow]);

    useEffect(() => {
        const t = setTimeout(() => setInitialLoad(false), 0);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (switchingTeam) {
            return;
        }
        PerformanceMetricsManager.endMetric('mobile_team_switch', serverUrl);
    }, [switchingTeam, serverUrl]);

    const showEmptyState = onlyUnreads && flattenedItems.length === 0 && !isTablet;

    const [listHeaderHeight, setListHeaderHeight] = useState(0);
    const ListEmptyComponent = useMemo(() => {
        if (showEmptyState) {
            return (
                <View style={{flex: 1, marginTop: listHeaderHeight + ROW_HEIGHT}}>
                    <Empty/>
                </View>
            );
        }
        return undefined;
    }, [listHeaderHeight, showEmptyState]);

    const onListHeaderLayout = useCallback((e: LayoutChangeEvent) => {
        setListHeaderHeight(e.nativeEvent.layout.height);
    }, []);

    const listHeader = (
        <View onLayout={onListHeaderLayout}>
            {headerButtons}
        </View>
    );

    if (flattenedItems.length === 0 && !switchingTeam && !initialLoad && !onlyUnreads) {
        return <LoadCategoriesError/>;
    }

    return (
        <>
            {!switchingTeam && !initialLoad && (
                <FlatList
                    key={onlyUnreads ? 'unreads' : 'all'}
                    ref={listRef}
                    testID='channel_list.flat_list'
                    data={flattenedItems}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    showsHorizontalScrollIndicator={false}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={ListEmptyComponent}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={VIEWABILITY_CONFIG}
                    ListHeaderComponent={listHeader}
                    nestedScrollEnabled={true}
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
