// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useRoute} from '@react-navigation/native';
import React, {useCallback, useState, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View, ActivityIndicator, FlatList, DeviceEventEmitter} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {SafeAreaView, Edge} from 'react-native-safe-area-context';

import {fetchRecentMentions} from '@actions/remote/search';
import NavigationHeader from '@components/navigation_header';
import DateSeparator from '@components/post_list/date_separator';
import PostWithChannelInfo from '@components/post_with_channel_info';
import {Events, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useCollapsibleHeader} from '@hooks/header';
import {getDateForDateLine, isDateLine, selectOrderedPosts} from '@utils/post_list';

import EmptyState from './components/empty';

import type {ViewableItemsChanged} from '@typings/components/post_list';
import type PostModel from '@typings/database/models/servers/post';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const EDGES: Edge[] = ['bottom', 'left', 'right'];

type Props = {
    currentTimezone: string | null;
    isTimezoneEnabled: boolean;
    mentions: PostModel[];
}

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

const RecentMentionsScreen = ({mentions, currentTimezone, isTimezoneEnabled}: Props) => {
    const theme = useTheme();
    const route = useRoute();
    const isFocused = useIsFocused();
    const {formatMessage} = useIntl();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const serverUrl = useServerUrl();

    const params = route.params! as {direction: string};
    const toLeft = params.direction === 'left';
    const translateSide = toLeft ? -25 : 25;
    const opacity = useSharedValue(isFocused ? 1 : 0);
    const translateX = useSharedValue(isFocused ? 0 : translateSide);

    const title = formatMessage({id: 'screen.mentions.title', defaultMessage: 'Recent Mentions'});
    const subtitle = formatMessage({id: 'screen.mentions.subtitle', defaultMessage: 'Messages you\'ve been mentioned in'});
    const isLargeTitle = true;

    useEffect(() => {
        setLoading(true);
        fetchRecentMentions(serverUrl).finally(() => {
            setLoading(false);
        });
    }, [serverUrl]);

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll} = useCollapsibleHeader<FlatList<string>>(isLargeTitle, Boolean(subtitle), false);

    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop}), [scrollPaddingTop]);

    const posts = useMemo(() => selectOrderedPosts(mentions, 0, false, '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [mentions]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchRecentMentions(serverUrl);
        setRefreshing(false);
    }, [serverUrl]);

    useEffect(() => {
        opacity.value = isFocused ? 1 : 0;
        translateX.value = isFocused ? 0 : translateSide;
    }, [isFocused]);

    const animated = useAnimatedStyle(() => {
        return {
            opacity: withTiming(opacity.value, {duration: 150}),
            transform: [{translateX: withTiming(translateX.value, {duration: 150})}],
        };
    }, []);

    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc: Record<string, boolean>, {item, isViewable}) => {
            if (isViewable) {
                acc[`${Screens.MENTIONS}-${item.id}`] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, viewableItemsMap);
    }, []);

    const renderEmptyList = useCallback(() => (
        <View style={[styles.empty, paddingTop]}>
            {loading ? (
                <ActivityIndicator
                    color={theme.centerChannelColor}
                    size='large'
                />
            ) : (
                <EmptyState/>
            )}
        </View>
    ), [loading, theme, paddingTop]);

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
            <PostWithChannelInfo
                location={Screens.MENTIONS}
                post={item}
            />
        );
    }, []);

    return (
        <>
            <NavigationHeader
                isLargeTitle={isLargeTitle}
                showBackButton={false}
                subtitle={subtitle}
                title={title}
                hasSearch={false}
                scrollValue={scrollValue}
                forwardedRef={scrollRef}
            />
            <SafeAreaView
                style={styles.flex}
                edges={EDGES}
            >
                <Animated.View style={[styles.flex, animated]}>
                    <AnimatedFlatList
                        ref={scrollRef}
                        contentContainerStyle={paddingTop}
                        ListEmptyComponent={renderEmptyList()}
                        data={posts}
                        scrollToOverflowEnabled={true}
                        showsVerticalScrollIndicator={false}
                        progressViewOffset={scrollPaddingTop}
                        scrollEventThrottle={16}
                        indicatorStyle='black'
                        onScroll={onScroll}
                        onRefresh={handleRefresh}
                        refreshing={refreshing}
                        renderItem={renderItem}
                        onViewableItemsChanged={onViewableItemsChanged}
                    />
                </Animated.View>
            </SafeAreaView>
        </>
    );
};

export default RecentMentionsScreen;
