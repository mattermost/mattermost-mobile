// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {FlatList, Text, View} from 'react-native';
import Animated from 'react-native-reanimated';

import {PostModel} from '@app/database/models/server';
import NoResultsWithTerm from '@components/no_results_with_term';
import DateSeparator from '@components/post_list/date_separator';
import PostWithChannelInfo from '@components/post_with_channel_info';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {getDateForDateLine, isDateLine, selectOrderedPosts} from '@utils/post_list';

import Header from './header';

import type {ViewableItemsChanged} from '@typings/components/post_list';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

type Props = {
    postIds: string[];
    scrollRef: any;
    fileResults: FileInfo[];
    searchValue: string;
    selectedTab: string;
    onHeaderTabSelect: (tab: string) => void;
    currentTimezone: string;
    isTimezoneEnabled: boolean;
    posts: PostModel[];
}

const notImplementedComponent = (type: string) => {
    return (
        <View
            style={{
                height: 400,
                flexGrow: 1,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Text>{`${type} Not Implemented`}</Text>
        </View>
    );
};

const Results = ({
    postIds,
    posts,
    scrollRef,
    fileResults,
    searchValue,
    selectedTab,
    onHeaderTabSelect,
    currentTimezone,
    isTimezoneEnabled,
}: Props) => {
    const theme = useTheme();

    const orderedPosts = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);

    const renderHeader = useCallback(() => {
        return (
            <Header
                onTabSelect={onHeaderTabSelect}
                numberFiles={fileResults.length}
                numberMessages={postIds.length}
            />
        );
    }, [fileResults, onHeaderTabSelect, postIds]);

    const renderPostItem = useCallback(({item}) => {
        if (typeof item === 'string') {
            if (isDateLine(item)) {
                return (
                    <DateSeparator
                        date={getDateForDateLine(item)}
                        theme={theme}

                        //timezone={isTimezoneEnabled ? currentTimezone : null}
                        timezone={null}
                    />
                );
            }
            return null;
        }

        return (
            <PostWithChannelInfo
                location={Screens.SEARCH}
                post={item}
            />
        );
    }, [theme]);

    const onViewableItemsChanged = useCallback(({viewableItems}: ViewableItemsChanged) => {
        console.log('viewableItems', viewableItems);
    }, []);

    const handleRefresh = () => {
        console.log('refreshing');
    };
    const onScroll = () => {
        console.log('scrolling');
    };

    let content;
    if (!searchValue) {
        content = notImplementedComponent;
    } else if (
        (selectedTab === 'messages' && postIds.length === 0) ||
        (selectedTab === 'files' && fileResults.length === 0)
    ) {
        content = (<>
            <NoResultsWithTerm
                term={searchValue}
                type={selectedTab}
            />
        </>
        );
    } else if (selectedTab === 'messages' && postIds.length) {
        content = (<>
            <AnimatedFlatList
                ref={scrollRef}

                // contentContainerStyle={paddingTop}
                ListEmptyComponent={notImplementedComponent('message')}
                data={orderedPosts}
                scrollToOverflowEnabled={true}
                showsVerticalScrollIndicator={false}

                // progressViewOffset={scrollPaddingTop}
                scrollEventThrottle={16}
                indicatorStyle='black'

                onScroll={onScroll}
                onRefresh={handleRefresh}

                refreshing={false}
                renderItem={renderPostItem}
                onViewableItemsChanged={onViewableItemsChanged}
            />
        </>
        );
    } else if (selectedTab === 'files' && fileResults.length) {
        content = (<>
            {notImplementedComponent('files')}
        </>
        );
    }

    return (<>
        {renderHeader()}
        {content}
    </>);
};

export default Results;
