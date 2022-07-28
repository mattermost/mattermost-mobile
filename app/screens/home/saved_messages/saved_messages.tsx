// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useRoute} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, FlatList, Platform, StyleSheet, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {fetchSavedPosts} from '@actions/remote/post';
import FreezeScreen from '@components/freeze_screen';
import Loading from '@components/loading';
import NavigationHeader from '@components/navigation_header';
import DateSeparator from '@components/post_list/date_separator';
import PostWithChannelInfo from '@components/post_with_channel_info';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Events, Screens} from '@constants';
import {BOTTOM_TAB_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useCollapsibleHeader} from '@hooks/header';
import {isDateLine, getDateForDateLine, selectOrderedPosts} from '@utils/post_list';

import EmptyState from './components/empty';

import type {ViewableItemsChanged} from '@typings/components/post_list';
import type PostModel from '@typings/database/models/servers/post';

type Props = {
    currentTimezone: string | null;
    isTimezoneEnabled: boolean;
    posts: PostModel[];
}

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);
const edges: Edge[] = ['bottom', 'left', 'right'];

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
        marginBottom: Platform.select({ios: BOTTOM_TAB_HEIGHT}),
    },
    empty: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
});

function SavedMessages({posts, currentTimezone, isTimezoneEnabled}: Props) {
    const intl = useIntl();
    const [loading, setLoading] = useState(!posts.length);
    const [refreshing, setRefreshing] = useState(false);
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const route = useRoute();
    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();

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

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll, headerHeight} = useCollapsibleHeader<FlatList<string>>(true, onSnap);
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop - insets.top, flexGrow: 1}), [scrollPaddingTop, insets.top]);
    const scrollViewStyle = useMemo(() => ({top: insets.top}), [insets.top]);
    const data = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);

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
            if (isViewable) {
                acc[`${Screens.SAVED_MESSAGES}-${item.id}`] = true;
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

    const renderItem = useCallback(({item}) => {
        if (typeof item === 'string') {
            if (isDateLine(item)) {
                return (
                    <DateSeparator
                        date={getDateForDateLine(item)}
                        timezone={isTimezoneEnabled ? currentTimezone : null}
                    />
                );
            }
            return null;
        }

        return (
            <PostWithChannelInfo
                location={Screens.SAVED_MESSAGES}
                post={item}
                testID='saved_messages.post_list'
            />
        );
    }, [currentTimezone, isTimezoneEnabled, theme]);

    return (
        <FreezeScreen freeze={!isFocused}>
            <NavigationHeader
                isLargeTitle={true}
                showBackButton={false}
                subtitle={subtitle}
                title={title}
                hasSearch={false}
                scrollValue={scrollValue}
            />
            <SafeAreaView
                edges={edges}
                style={styles.flex}
                testID='saved_messages.screen'
            >
                <Animated.View style={[styles.container, animated]}>
                    <Animated.View style={top}>
                        <RoundedHeaderContext/>
                    </Animated.View>
                    <AnimatedFlatList
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
                        style={scrollViewStyle}
                        testID='saved_messages.post_list.flat_list'
                    />
                </Animated.View>
            </SafeAreaView>
        </FreezeScreen>
    );
}

export default SavedMessages;
