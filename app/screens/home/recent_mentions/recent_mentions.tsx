// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useRoute} from '@react-navigation/native';
import React, {useCallback, useState, useEffect, useMemo} from 'react';
import {Freeze} from 'react-freeze';
import {useIntl} from 'react-intl';
import {ActivityIndicator, DeviceEventEmitter, type ListRenderItemInfo, View} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {fetchRecentMentions} from '@actions/remote/search';
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
import {makeStyleSheetFromTheme} from '@utils/theme';

import EmptyState from './components/empty';

import type {PostListItem, PostListOtherItem, ViewableItemsChanged} from '@typings/components/post_list';
import type PostModel from '@typings/database/models/servers/post';

type Props = {
    appsEnabled: boolean;
    customEmojiNames: string[];
    currentTimezone: string | null;
    mentions: PostModel[];
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {
        flex: 1,
    },
    background: {
        backgroundColor: theme.centerChannelBg,
    },
    empty: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
}));

const RecentMentionsScreen = ({appsEnabled, customEmojiNames, mentions, currentTimezone}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const route = useRoute();
    const isFocused = useIsFocused();
    const {formatMessage} = useIntl();
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const serverUrl = useServerUrl();

    const params = route.params as {direction: string};
    const toLeft = params.direction === 'left';
    const translateSide = toLeft ? -25 : 25;
    const opacity = useSharedValue(isFocused ? 1 : 0);
    const translateX = useSharedValue(isFocused ? 0 : translateSide);

    const title = formatMessage({id: 'screen.mentions.title', defaultMessage: 'Recent Mentions'});
    const subtitle = formatMessage({id: 'screen.mentions.subtitle', defaultMessage: 'Messages you\'ve been mentioned in'});

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
            fetchRecentMentions(serverUrl).finally(() => {
                setLoading(false);
            });
        }
    }, [serverUrl, isFocused]);

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll, headerHeight} = useCollapsibleHeader<Animated.FlatList<string>>(true, onSnap);
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop, flexGrow: 1}), [scrollPaddingTop]);
    const posts = useMemo(() => selectOrderedPosts(mentions, 0, false, '', '', false, currentTimezone, false).reverse(), [mentions]);

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

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchRecentMentions(serverUrl);
        setRefreshing(false);
    }, [serverUrl]);

    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        if (!viewableItems.length) {
            return;
        }

        const viewableItemsMap = viewableItems.reduce((acc: Record<string, boolean>, {item, isViewable}) => {
            if (isViewable && item.type === 'post') {
                acc[`${Screens.MENTIONS}-${item.value.currentPost.id}`] = true;
            }
            return acc;
        }, {});

        DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, viewableItemsMap);
    }, []);

    const renderEmptyList = useCallback(() => (
        <View style={styles.empty}>
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
                        location={Screens.MENTIONS}
                        post={item.value.currentPost}
                        testID='recent_mentions.post_list'
                    />
                );
            default:
                return null;
        }
    }, [appsEnabled, customEmojiNames]);

    return (
        <Freeze freeze={!isFocused}>
            <ExtraKeyboardProvider>
                <View
                    style={[styles.flex, styles.background]}
                    testID='recent_mentions.screen'
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
                            removeClippedSubviews={true}
                            onViewableItemsChanged={onViewableItemsChanged}
                            testID='recent_mentions.post_list.flat_list'
                        />
                    </Animated.View>
                </View>
            </ExtraKeyboardProvider>
        </Freeze>
    );
};

export default RecentMentionsScreen;
