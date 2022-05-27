// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {FlatList, Text, View} from 'react-native';
import Animated from 'react-native-reanimated';

import {FileModel, PostModel} from '@app/database/models/server';
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
    fileIds: string[];
    scrollRef: any;
    searchValue: string;
    selectedTab: string;
    onHeaderTabSelect: (tab: string) => void;
    currentTimezone: string;
    isTimezoneEnabled: boolean;
    posts: PostModel[];
    files: FileModel[];
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
    currentTimezone,
    files,
    fileIds,
    isTimezoneEnabled,
    onHeaderTabSelect,
    posts,
    postIds,
    scrollRef,
    searchValue,
    selectedTab,
}: Props) => {
    const theme = useTheme();

    const orderedPosts = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);

    const [filteredFiles, setFilterFiles] = useState(files);

    const renderHeader = useCallback(() => {
        return (
            <Header
                files={files}
                onTabSelect={onHeaderTabSelect}
                setFilterFiles={setFilterFiles}
                numberFiles={fileIds.length}
                numberMessages={postIds.length}
            />
        );
    }, [fileIds, onHeaderTabSelect, postIds]);

    const renderPostItem = useCallback(({item}) => {
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

    const renderNoResults = useCallback(() => {
        return (
            <NoResultsWithTerm
                term={searchValue}
                type={selectedTab}
            />
        );
    }, [selectedTab, searchValue]);

    const renderMessages = useCallback(() => {
        return (
            <AnimatedFlatList
                ref={scrollRef}

                // contentContainerStyle={paddingTop}
                ListEmptyComponent={renderNoResults()}
                data={orderedPosts}
                scrollToOverflowEnabled={true}
                showsVerticalScrollIndicator={true}

                // progressViewOffset={scrollPaddingTop}
                scrollEventThrottle={16}
                indicatorStyle='black'

                onScroll={onScroll}
                onRefresh={handleRefresh}

                refreshing={false}
                renderItem={renderPostItem}
                onViewableItemsChanged={onViewableItemsChanged}
            />
        );
    }, [renderPostItem]);

    const renderFiles = useCallback(() => {
        if (filteredFiles.length === 0) {
            return renderNoResults();
        }
        return (
            <Text>{filteredFiles.map((fInfo) => `${fInfo.id}  ${fInfo.mimeType}\n`)}</Text>
        );
    }, [files, filteredFiles]);

    let content;
    if (!searchValue) {
        content = notImplementedComponent;
    } else if (selectedTab === 'messages') {
        content = renderMessages();
    } else if (selectedTab === 'files') {
        content = renderFiles();
    }

    return (<>
        {renderHeader()}
        {content}
    </>);
};

export default Results;
