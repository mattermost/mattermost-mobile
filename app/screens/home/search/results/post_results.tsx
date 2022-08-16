// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {FlatList, ListRenderItemInfo} from 'react-native';
import Animated from 'react-native-reanimated';

import NoResultsWithTerm from '@components/no_results_with_term';
import DateSeparator from '@components/post_list/date_separator';
import PostWithChannelInfo from '@components/post_with_channel_info';
import {Screens} from '@constants';
import {getDateForDateLine, isDateLine, selectOrderedPosts} from '@utils/post_list';
import {TabTypes} from '@utils/search';

import type PostModel from '@typings/database/models/servers/post';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

type Props = {
    currentTimezone: string;
    isTimezoneEnabled: boolean;
    posts: PostModel[];
    scrollPaddingTop: number;
    searchValue: string;
}

const PostResults = ({
    currentTimezone,
    isTimezoneEnabled,
    posts,
    scrollPaddingTop,
    searchValue,
}: Props) => {
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop, flexGrow: 1}), [scrollPaddingTop]);
    const orderedPosts = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);

    const containerStyle = useMemo(() => {
        return {top: posts.length ? 4 : 8};
    }, [posts]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<string|FileInfo | Post>) => {
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

        if ('message' in item) {
            return (
                <PostWithChannelInfo
                    location={Screens.SEARCH}
                    post={item}
                    testID='search_results.post_list'
                />
            );
        }
        return null;
    }, []);

    const noResults = useMemo(() => {
        return (
            <NoResultsWithTerm
                term={searchValue}
                type={TabTypes.MESSAGES}
            />
        );
    }, [searchValue]);

    return (
        <AnimatedFlatList
            ListEmptyComponent={noResults}
            contentContainerStyle={paddingTop}
            data={orderedPosts}
            indicatorStyle='black'
            nestedScrollEnabled={true}
            refreshing={false}
            removeClippedSubviews={true}
            renderItem={renderItem}
            scrollEventThrottle={16}
            scrollToOverflowEnabled={true}
            showsVerticalScrollIndicator={true}
            style={containerStyle}
            testID='search_results.post_list.flat_list'
        />
    );
};

export default PostResults;
