// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {FlatList, ListRenderItemInfo, NativeScrollEvent, NativeSyntheticEvent, Text, View} from 'react-native';
import Animated from 'react-native-reanimated';

import NoResultsWithTerm from '@components/no_results_with_term';
import DateSeparator from '@components/post_list/date_separator';
import PostWithChannelInfo from '@components/post_with_channel_info';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {PostModel} from '@database/models/server';
import {getDateForDateLine, isDateLine, selectOrderedPosts} from '@utils/post_list';

import FileCard from './fileCard';
import Loader from './loader';

const notImplementedComponent = (
    <View
        style={{
            height: 800,
            flexGrow: 1,
            alignItems: 'center',
        }}
    >
        <Text style={{fontSize: 28, color: '#000'}}>{'Not Implemented'}</Text>
    </View>
);

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

type Props = {
    searchValue: string;
    selectedTab: 'messages' | 'files';
    currentTimezone: string;
    isTimezoneEnabled: boolean;
    posts: PostModel[];
    fileInfos: FileInfo[];
    scrollRef: React.RefObject<FlatList>;
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    scrollPaddingTop: number;
    loading: boolean;
}

const emptyList: FileInfo[] | Array<string | PostModel> = [];

const SearchResults = ({
    currentTimezone,
    fileInfos,
    isTimezoneEnabled,
    posts,
    searchValue,
    selectedTab,
    scrollRef,
    onScroll,
    scrollPaddingTop,
    loading,
}: Props) => {
    const theme = useTheme();
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop, flexGrow: 1}), [scrollPaddingTop]);

    const orderedPosts = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);

    const renderItem = useCallback(({item}: ListRenderItemInfo<string|FileInfo | Post>) => {
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

        if ('message' in item) {
            return (
                <PostWithChannelInfo
                    location={Screens.SEARCH}
                    post={item}
                    testID='search_results.post_list'
                />
            );
        }

        return (
            <FileCard
                fileInfo={item}
                key={item.id}
            />
        );
    }, [theme]);

    const noResults = useMemo(() => {
        if (searchValue) {
            if (loading) {
                return (<Loader/>);
            }
            return (
                <NoResultsWithTerm
                    term={searchValue}
                    type={selectedTab}
                />
            );
        }

        return notImplementedComponent;
    }, [searchValue, loading, selectedTab]);

    let data;
    if (loading || !searchValue) {
        data = emptyList;
    } else if (selectedTab === 'messages') {
        data = orderedPosts;
    } else {
        data = fileInfos;
    }

    return (
        <AnimatedFlatList
            ListEmptyComponent={noResults}
            data={data}
            scrollToOverflowEnabled={true}
            showsVerticalScrollIndicator={true}
            scrollEventThrottle={16}
            indicatorStyle='black'
            refreshing={false}
            renderItem={renderItem}
            contentContainerStyle={paddingTop}
            nestedScrollEnabled={true}
            onScroll={onScroll}
            removeClippedSubviews={true}
            ref={scrollRef}
            testID='search_results.post_list.flat_list'
        />
    );
};

export default SearchResults;
