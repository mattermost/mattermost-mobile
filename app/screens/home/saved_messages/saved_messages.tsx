// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Freeze} from 'react-freeze';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, type ListRenderItemInfo, StyleSheet, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import {fetchSavedPosts} from '@actions/remote/post';
import Loading from '@components/loading';
import NavigationHeader from '@components/navigation_header';
import DateSeparator from '@components/post_list/date_separator';
import PostWithChannelInfo from '@components/post_with_channel_info';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Events, Screens} from '@constants';
import {ExtraKeyboardProvider} from '@context/extra_keyboard';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useCollapsibleHeader} from '@hooks/header';
import {getDateForDateLine, selectOrderedPosts} from '@utils/post_list';

import EmptyState from './components/empty';

import type {PostListItem, PostListOtherItem, ViewableItemsChanged} from '@typings/components/post_list';
import type PostModel from '@typings/database/models/servers/post';

type Props = {
    appsEnabled: boolean;
    currentTimezone: string | null;
    customEmojiNames: string[];
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
});

function SavedMessages({appsEnabled, posts, currentTimezone, customEmojiNames}: Props) {
    const intl = useIntl();
    const [loading, setLoading] = useState(!posts.length);
    const [refreshing, setRefreshing] = useState(false);
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const route = useRoute();
    const isFocused = useIsFocused();

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
    }, [isFocused]);

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
    const data = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, currentTimezone, false).reverse(), [posts]);

    const animated = useAnimatedStyle(() => {
        return {
            opacity: withTiming(opacity.value, {duration: 150}),
            transform: [{translateX: withTiming(translateX.value, {duration: 150})}],
        };
    }, []);

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
                        appsEnabled={appsEnabled}
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
    }, [appsEnabled, currentTimezone, customEmojiNames, theme]);

    return (
        <Freeze freeze={!isFocused}>
            <ExtraKeyboardProvider>
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
                    </Animated.View>
                </SafeAreaView>
            </ExtraKeyboardProvider>
        </Freeze>
    );
}

export default SavedMessages;
