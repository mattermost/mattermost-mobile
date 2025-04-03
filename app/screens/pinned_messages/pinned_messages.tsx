// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {DeviceEventEmitter, FlatList, type ListRenderItemInfo, StyleSheet, View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {fetchPinnedPosts} from '@actions/remote/post';
import Loading from '@components/loading';
import DateSeparator from '@components/post_list/date_separator';
import Post from '@components/post_list/post';
import {Events, Screens} from '@constants';
import {ExtraKeyboardProvider} from '@context/extra_keyboard';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import SecurityManager from '@managers/security_manager';
import {popTopScreen} from '@screens/navigation';
import {getDateForDateLine, selectOrderedPosts} from '@utils/post_list';

import EmptyState from './empty';

import type {PostListItem, PostListOtherItem, ViewableItemsChanged} from '@typings/components/post_list';
import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    appsEnabled: boolean;
    channelId: string;
    componentId: AvailableScreens;
    currentTimezone: string | null;
    customEmojiNames: string[];
    isCRTEnabled: boolean;
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
});

function SavedMessages({
    appsEnabled,
    channelId,
    componentId,
    currentTimezone,
    customEmojiNames,
    isCRTEnabled,
    posts,
}: Props) {
    const [loading, setLoading] = useState(!posts.length);
    const [refreshing, setRefreshing] = useState(false);
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const data = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, currentTimezone, false).reverse(), [posts]);

    const close = useCallback(() => {
        if (componentId) {
            popTopScreen(componentId);
        }
    }, [componentId]);

    useEffect(() => {
        fetchPinnedPosts(serverUrl, channelId).finally(() => {
            setLoading(false);
        });
    }, []);

    useAndroidHardwareBackHandler(componentId, close);

    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc: Record<string, boolean>, {item, isViewable}) => {
            if (isViewable && item.type === 'post') {
                acc[`${Screens.PINNED_MESSAGES}-${item.value.currentPost.id}`] = true;
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

    const renderItem = useCallback(({item}: ListRenderItemInfo<PostListItem | PostListOtherItem>) => {
        switch (item.type) {
            case 'date':
                return (
                    <DateSeparator
                        key={item.value}
                        date={getDateForDateLine(item.value)}
                        timezone={currentTimezone}
                    />
                );
            case 'post':
                return (
                    <Post
                        appsEnabled={appsEnabled}
                        customEmojiNames={customEmojiNames}
                        highlightPinnedOrSaved={false}
                        isCRTEnabled={isCRTEnabled}
                        location={Screens.PINNED_MESSAGES}
                        key={item.value.currentPost.id}
                        nextPost={undefined}
                        post={item.value.currentPost}
                        previousPost={undefined}
                        showAddReaction={false}
                        shouldRenderReplyButton={false}
                        skipSavedHeader={true}
                        skipPinnedHeader={true}
                        testID='pinned_messages.post_list.post'
                    />
                );
            default:
                return null;
        }
    }, [appsEnabled, currentTimezone, customEmojiNames, theme]);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.flex}
            testID='pinned_messages.screen'
            nativeID={SecurityManager.getShieldScreenId(componentId)}
        >
            <ExtraKeyboardProvider>
                <FlatList
                    contentContainerStyle={data.length ? styles.list : [styles.empty]}
                    ListEmptyComponent={emptyList}
                    data={data}
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                    renderItem={renderItem}
                    scrollToOverflowEnabled={true}
                    onViewableItemsChanged={onViewableItemsChanged}
                    testID='pinned_messages.post_list.flat_list'
                />
            </ExtraKeyboardProvider>
        </SafeAreaView>
    );
}

export default SavedMessages;
