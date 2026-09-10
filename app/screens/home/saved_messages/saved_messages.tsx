// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {useHeaderHeight} from '@react-navigation/elements';
import {useIsFocused, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, type ListRenderItemInfo, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {fetchSavedPosts} from '@actions/remote/post';
import SheetTabBarScrim, {useSheetTabBarScrimPadding} from '@components/chrome/sheet_tab_bar_scrim';
import Loading from '@components/loading';
import NavigationHeader from '@components/navigation_header';
import DateSeparator from '@components/post_list/date_separator';
import PostWithChannelInfo from '@components/post_with_channel_info';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Events, Screens} from '@constants';
import {CHANNEL_SHEET_RADIUS, isPlatformUiIos} from '@constants/platform_ui';
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
import {makeStyleSheetFromTheme} from '@utils/theme';
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

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {
        flex: 1,
    },
    sheet: {
        backgroundColor: theme.centerChannelBg,
        borderTopLeftRadius: CHANNEL_SHEET_RADIUS,
        borderTopRightRadius: CHANNEL_SHEET_RADIUS,
        flex: 1,
        overflow: 'hidden',
    },
    empty: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
}));

function observeSavedPosts(database: Database) {
    return querySavedPostsPreferences(database, undefined, 'true').observeWithColumns(['name']).pipe(
        switchMap((rows) => {
            const ids = rows.map((preference) => preference.name);
            return ids.length ? observeSavedPostsByIds(database, ids) : of$(new Set<string>());
        }),
        switchMap((savedPostIds) => {
            const ids = [...savedPostIds];
            return ids.length ? queryPostsById(database, ids, Q.asc).observe() : of$([]);
        }),
    );
}

function SavedMessages({appsEnabled, currentUser, customEmojiNames, database}: Props) {
    const intl = useIntl();
    const [posts, setPosts] = useState<PostModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const nativeHeaderHeight = useHeaderHeight();
    const serverUrl = useServerUrl();
    const currentTimezone = useMemo(() => getTimezone(currentUser.timezone), [currentUser.timezone]);
    const route = useRoute();
    const isFocused = useIsFocused();
    const currentScreen = useCurrentScreen();
    const isBottomSheetOpen = currentScreen && SCREENS_AS_BOTTOM_SHEET.has(currentScreen);
    const isPemalinkScreen = currentScreen === Screens.PERMALINK;
    const isGalleryScreen = currentScreen === Screens.GALLERY;
    const platformUi = isPlatformUiIos();

    useAndroidHomeTabBackHandler(Screens.SAVED_MESSAGES);

    // NativeTabs does not pass direction; JS TabBar still does for slide animation.
    const params = route.params as {direction?: string} | undefined;
    const toLeft = params?.direction === 'left';
    const translateSide = toLeft ? -25 : 25;
    const opacity = useSharedValue(isFocused || platformUi ? 1 : 0);
    const translateX = useSharedValue(isFocused || platformUi ? 0 : translateSide);

    const title = intl.formatMessage({id: 'screen.saved_messages.title', defaultMessage: 'Saved Messages'});
    const subtitle = intl.formatMessage({id: 'screen.saved_messages.subtitle', defaultMessage: 'All messages you\'ve saved for follow up'});

    const onSnap = (offset: number) => {
        scrollRef.current?.scrollToOffset({offset, animated: true});
    };

    useEffect(() => {
        if (platformUi) {
            opacity.value = 1;
            translateX.value = 0;
            return;
        }

        opacity.value = isFocused ? 1 : 0;
        translateX.value = isFocused ? 0 : translateSide;
    }, [isFocused, opacity, platformUi, translateSide, translateX]);

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

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll, headerHeight} = useCollapsibleHeader<Animated.FlatList<string>>(!platformUi, platformUi ? undefined : onSnap);
    const scrimPadding = useSheetTabBarScrimPadding();
    const paddingTop = useMemo(() => ({
        paddingTop: platformUi ? 0 : scrollPaddingTop,
        paddingBottom: scrimPadding,
        flexGrow: 1,
    }), [platformUi, scrollPaddingTop, scrimPadding]);
    const data = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, currentTimezone, false).reverse(), [currentTimezone, posts]);

    const animated = useAnimatedStyle(() => {
        if (platformUi || isBottomSheetOpen || isPemalinkScreen || isGalleryScreen) {
            return {};
        }

        return {
            opacity: withTiming(opacity.value, {duration: 150}),
            transform: [{translateX: withTiming(translateX.value, {duration: 150})}],
        };
    }, [isBottomSheetOpen, isGalleryScreen, isPemalinkScreen, platformUi]);

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
    ), [loading, styles.empty, theme.buttonBg]);

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
            style={[styles.flex, platformUi && {backgroundColor: theme.sidebarBg}]}
            testID='saved_messages.screen'
        >
            {!platformUi && (
                <NavigationHeader
                    isLargeTitle={true}
                    showBackButton={false}
                    subtitle={subtitle}
                    title={title}
                    hasSearch={false}
                    scrollValue={scrollValue}
                />
            )}
            {platformUi ? (
                <View style={[styles.sheet, {marginTop: nativeHeaderHeight}]}>
                    <PostConfigProvider>
                        <Animated.FlatList
                            ref={scrollRef}
                            contentContainerStyle={paddingTop}
                            contentInsetAdjustmentBehavior='never'
                            ListEmptyComponent={emptyList}
                            data={data}
                            onRefresh={handleRefresh}
                            refreshing={refreshing}
                            renderItem={renderItem}
                            scrollToOverflowEnabled={true}
                            showsVerticalScrollIndicator={false}
                            progressViewOffset={0}
                            scrollEventThrottle={16}
                            indicatorStyle='black'
                            removeClippedSubviews={false}
                            onViewableItemsChanged={onViewableItemsChanged}
                            testID='saved_messages.post_list.flat_list'
                        />
                    </PostConfigProvider>
                    <SheetTabBarScrim/>
                </View>
            ) : (
                <Animated.View style={[styles.flex, animated]}>
                    <Animated.View style={top}>
                        <RoundedHeaderContext/>
                    </Animated.View>
                    <PostConfigProvider>
                        <Animated.FlatList
                            ref={scrollRef}
                            contentContainerStyle={paddingTop}
                            contentInsetAdjustmentBehavior='never'
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
            )}
        </SafeAreaView>
    );
}

export default SavedMessages;
