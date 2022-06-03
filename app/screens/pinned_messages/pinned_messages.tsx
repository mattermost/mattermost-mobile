// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {BackHandler, DeviceEventEmitter, FlatList, StyleSheet, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {fetchPinnedPosts} from '@actions/remote/post';
import Loading from '@components/loading';
import DateSeparator from '@components/post_list/date_separator';
import Post from '@components/post_list/post';
import {Events, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {popTopScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {isDateLine, getDateForDateLine, selectOrderedPosts} from '@utils/post_list';

import EmptyState from './empty';

import type {ViewableItemsChanged} from '@typings/components/post_list';
import type PostModel from '@typings/database/models/servers/post';

type Props = {
    channelId: string;
    componentId?: string;
    currentTimezone: string | null;
    isCRTEnabled: boolean;
    isTimezoneEnabled: boolean;
    posts: PostModel[];
}

const edges: Edge[] = ['bottom', 'left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    empty: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    list: {
        paddingVertical: 8,
    },
    loading: {
        height: 40,
        width: 40,
        justifyContent: 'center' as const,
    },
});

function SavedMessages({
    channelId,
    componentId,
    currentTimezone,
    isCRTEnabled,
    isTimezoneEnabled,
    posts,
}: Props) {
    const [loading, setLoading] = useState(!posts.length);
    const [refreshing, setRefreshing] = useState(false);
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const data = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);

    const close = () => {
        if (componentId) {
            popTopScreen(componentId);
        }
    };

    useEffect(() => {
        fetchPinnedPosts(serverUrl, channelId).finally(() => {
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        const listener = BackHandler.addEventListener('hardwareBackPress', () => {
            if (EphemeralStore.getNavigationTopComponentId() === componentId) {
                close();
                return true;
            }

            return false;
        });

        return () => listener.remove();
    }, [componentId]);

    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc: Record<string, boolean>, {item, isViewable}) => {
            if (isViewable) {
                acc[`${Screens.PINNED_MESSAGES}-${item.id}`] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, viewableItemsMap);
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchPinnedPosts(serverUrl, channelId);
        setRefreshing(false);
    }, [serverUrl, channelId]);

    const emptyList = useMemo(() => (
        <View style={styles.empty}>
            {loading ? (
                <Loading
                    color={theme.buttonBg}
                    size='large'
                />
            ) : (
                <EmptyState/>
            )}
        </View>
    ), [loading, theme.buttonBg]);

    const renderItem = useCallback(({item}) => {
        if (typeof item === 'string') {
            if (isDateLine(item)) {
                return (
                    <DateSeparator
                        date={getDateForDateLine(item)}
                        theme={theme}
                        timezone={isTimezoneEnabled ? currentTimezone : null}
                    />
                );
            }
            return null;
        }

        return (
            <Post
                highlightPinnedOrSaved={false}
                isCRTEnabled={isCRTEnabled}
                location={Screens.PINNED_MESSAGES}
                nextPost={undefined}
                post={item}
                previousPost={undefined}
                showAddReaction={false}
                shouldRenderReplyButton={false}
                skipSavedHeader={true}
                skipPinnedHeader={true}
            />
        );
    }, [currentTimezone, isTimezoneEnabled, theme]);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.flex}
        >
            <FlatList
                contentContainerStyle={data.length ? styles.list : [styles.empty]}
                ListEmptyComponent={emptyList}
                data={data}
                onRefresh={handleRefresh}
                refreshing={refreshing}
                renderItem={renderItem}
                scrollToOverflowEnabled={true}
                onViewableItemsChanged={onViewableItemsChanged}
            />
        </SafeAreaView>
    );
}

export default SavedMessages;
