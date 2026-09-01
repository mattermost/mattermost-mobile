// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {useIsFocused, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, type ListRenderItemInfo, StyleSheet, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';
import {of as of$} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';

import {fetchSavedPosts} from '@actions/remote/post';
import Loading from '@components/loading';
import NavigationHeader from '@components/navigation_header';
import DateSeparator from '@components/post_list/date_separator';
import PostWithChannelInfo from '@components/post_with_channel_info';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Events, Screens} from '@constants';
import {SCREENS_AS_BOTTOM_SHEET} from '@constants/screens';
import {PostConfigProvider} from '@context/post_config';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHomeTabBackHandler from '@hooks/android_home_tab_back_handler';
import {useCollapsibleHeader} from '@hooks/header';
import {observeSavedPostsByIds, queryPostsById} from '@queries/servers/post';
import {querySavedPostsPreferences} from '@queries/servers/preference';
import {useCurrentScreen} from '@store/navigation_store';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';
import {getDateForDateLine, selectOrderedPosts} from '@utils/post_list';
import {getTimezone} from '@utils/user';

import EmptyState from './components/empty';

import type {PostListItem, PostListOtherItem, ViewableItemsChanged} from '@typings/components/post_list';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    appsEnabled?: boolean;
    currentUser: UserModel;
    customEmojiNames: string[];
    database: Database;
}

const edges: Edge[] = ['left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    empty: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
});

function sameIds(previous: string[], next: string[]) {
    return previous.length === next.length && previous.every((id, index) => id === next[index]);
}

// observeSavedPostsByIds emits a fresh Set on every emission of either of its two sources,
// so without the distinctUntilChanged guards the switchMaps tear down and rebuild the posts
// query on changes that leave the saved-post ids identical. That churn made the list flicker.
function observeSavedPosts(database: Database) {
    return querySavedPostsPreferences(database, undefined, 'true').observeWithColumns(['name']).pipe(
        map((rows) => rows.map((preference) => preference.name)),
        distinctUntilChanged(sameIds),
        switchMap((ids) => {
            if (!ids.length) {
                return of$(new Set<string>());
            }
            return observeSavedPostsByIds(database, ids);
        }),

        // Sorted so the comparison is order-insensitive; queryPostsById applies the
        // real ordering.
        map((savedPostIds) => [...savedPostIds].sort()),
        distinctUntilChanged(sameIds),
        switchMap((ids) => {
            if (!ids.length) {
                return of$([]);
            }
            return queryPostsById(database, ids, Q.asc).observe();
        }),
    );
}

function SavedMessages({appsEnabled, currentUser, customEmojiNames, database}: Props) {
    const intl = useIntl();
    const [posts, setPosts] = useState<PostModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const currentTimezone = useMemo(() => getTimezone(currentUser.timezone), [currentUser.timezone]);
    const route = useRoute();
    const isFocused = useIsFocused();
    const currentScreen = useCurrentScreen();
    const isBottomSheetOpen = currentScreen && SCREENS_AS_BOTTOM_SHEET.has(currentScreen);
    const isPemalinkScreen = currentScreen === Screens.PERMALINK;
    const isGalleryScreen = currentScreen === Screens.GALLERY;

    useAndroidHomeTabBackHandler(Screens.SAVED_MESSAGES);

    const params = route.params as {direction: string};
    const toLeft = params.direction === 'left';
    const translateSide = toLeft ? -25 : 25;
    const opacity = useSharedValue(isFocused ? 1 : 0);
    const translateX = useSharedValue(isFocused ? 0 : translateSide);

    const title = intl.formatMessage({id: 'screen.saved_messages.title', defaultMessage: 'Saved Messages'});
    const subtitle = intl.formatMessage({id: 'screen.saved_messages.subtitle', defaultMessage: 'All messages you\'ve saved for follow up'});

    const onSnap = (offset: number) => {
        scrollRef.current?.scrollToOffset({offset, animated: true});
    };

    useEffect(() => {
        opacity.value = isFocused ? 1 : 0;
        translateX.value = isFocused ? 0 : translateSide;
    }, [isFocused, opacity, translateSide, translateX]);

    // Re-subscribe on focus: this tab mounts once, and a pre-existing preference-table
    // observe() is not reliably notified of a CREATE, so the list stayed empty after a save.
    useEffect(() => {
        if (!isFocused) {
            return undefined;
        }

        const subscription = observeSavedPosts(database).subscribe({
            next: setPosts,
            error: (error) => logError('error on SavedMessages posts subscription', getFullErrorMessage(error)),
        });
        return () => subscription.unsubscribe();
    }, [database, isFocused]);

    useEffect(() => {
        if (isFocused) {
            setLoading(true);
            fetchSavedPosts(serverUrl).finally(() => {
                setLoading(false);
            });
        }
    }, [serverUrl, isFocused]);

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll, headerHeight} = useCollapsibleHeader<Animated.FlatList<string>>(true, onSnap);
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop, flexGrow: 1}), [scrollPaddingTop]);
    const data = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, currentTimezone, false).reverse(), [currentTimezone, posts]);

    const animated = useAnimatedStyle(() => {
        if (isBottomSheetOpen || isPemalinkScreen || isGalleryScreen) {
            return {};
        }

        return {
            opacity: withTiming(opacity.value, {duration: 150}),
            transform: [{translateX: withTiming(translateX.value, {duration: 150})}],
        };
    }, [isBottomSheetOpen, isPemalinkScreen, isGalleryScreen]);

    const top = useAnimatedStyle(() => {
        return {
            top: headerHeight.value,
        };
    });

    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc: Record<string, boolean>, {item, isViewable}) => {
            if (isViewable && item.type === 'post') {
                acc[`${Screens.SAVED_MESSAGES}-${item.value.currentPost.id}`] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, viewableItemsMap);
    }, []);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchSavedPosts(serverUrl);
        setRefreshing(false);
    }, [serverUrl]);

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
                    <PostWithChannelInfo
                        appsEnabled={appsEnabled ?? false}
                        currentUser={currentUser}
                        customEmojiNames={customEmojiNames}
                        key={item.value.currentPost.id}
                        location={Screens.SAVED_MESSAGES}
                        post={item.value.currentPost}
                        testID='saved_messages.post_list'
                        skipSavedPostsHighlight={true}
                    />
                );
            default:
                return null;
        }
    }, [appsEnabled, currentUser, currentTimezone, customEmojiNames]);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.flex}
            testID='saved_messages.screen'
        >
            <NavigationHeader
                isLargeTitle={true}
                showBackButton={false}
                subtitle={subtitle}
                title={title}
                hasSearch={false}
                scrollValue={scrollValue}
            />
            <Animated.View style={[styles.flex, animated]}>
                <Animated.View style={top}>
                    <RoundedHeaderContext/>
                </Animated.View>
                <PostConfigProvider>
                    <Animated.FlatList
                        ref={scrollRef}
                        contentContainerStyle={paddingTop}
                        ListEmptyComponent={emptyList}
                        data={data}
                        onRefresh={handleRefresh}
                        refreshing={refreshing}
                        renderItem={renderItem}
                        scrollToOverflowEnabled={true}
                        showsVerticalScrollIndicator={false}
                        progressViewOffset={scrollPaddingTop}
                        scrollEventThrottle={16}
                        indicatorStyle='black'
                        onScroll={onScroll}
                        removeClippedSubviews={true}
                        onViewableItemsChanged={onViewableItemsChanged}
                        testID='saved_messages.post_list.flat_list'
                    />
                </PostConfigProvider>
            </Animated.View>
        </SafeAreaView>
    );
}

export default SavedMessages;
