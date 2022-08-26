// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {FlatList, ListRenderItemInfo, StyleProp, ViewStyle} from 'react-native';

import NoResultsWithTerm from '@components/no_results_with_term';
import DateSeparator from '@components/post_list/date_separator';
import PostWithChannelInfo from '@components/post_with_channel_info';
import {Screens} from '@constants';
import {getDateForDateLine, isDateLine, selectOrderedPosts} from '@utils/post_list';
import {TabTypes} from '@utils/search';

import type PostModel from '@typings/database/models/servers/post';

type Props = {
    currentTimezone: string;
    isTimezoneEnabled: boolean;
    posts: PostModel[];
    paddingTop: StyleProp<ViewStyle>;
    searchValue: string;
}

const PostResults = ({
    currentTimezone,
    isTimezoneEnabled,
    posts,
    paddingTop,
    searchValue,
}: Props) => {
    const orderedPosts = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);
    const containerStyle = useMemo(() => ({top: posts.length ? 4 : 8}), [posts]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<string|PostModel>) => {
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

    const noResults = useMemo(() => (
        <NoResultsWithTerm
            term={searchValue}
            type={TabTypes.MESSAGES}
        />
    ), [searchValue]);

    return (
        <FlatList
            ListEmptyComponent={noResults}
            contentContainerStyle={[paddingTop, containerStyle]}
            data={orderedPosts}
            indicatorStyle='black'
            initialNumToRender={5}
            listKey={'posts'}
            maxToRenderPerBatch={5}
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
