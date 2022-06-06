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

import FileCard from './fileCard';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

type Props = {
    scrollRef: any;
    searchValue: string;
    selectedTab: 'messages' | 'files';
    currentTimezone: string;
    isTimezoneEnabled: boolean;
    posts: PostModel[];
    fileInfos: {[id: string]: FileInfo};
}

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

const SearchResults = ({
    currentTimezone,
    fileInfos,
    isTimezoneEnabled,
    posts,
    scrollRef,
    searchValue,
    selectedTab,
}: Props) => {
    const theme = useTheme();

    const orderedPosts = useMemo(() => selectOrderedPosts(posts, 0, false, '', '', false, isTimezoneEnabled, currentTimezone, false).reverse(), [posts]);

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
                ListEmptyComponent={renderNoResults()}
                data={orderedPosts}
                scrollToOverflowEnabled={true}
                showsVerticalScrollIndicator={true}
                scrollEventThrottle={16}
                indicatorStyle='black'
                refreshing={false}
                renderItem={renderPostItem}
            />
        );
    }, [renderPostItem]);

    const renderFiles = useCallback(() => {
        const infos = [];
        for (const infoID of Object.keys(fileInfos)) {
            infos.push(
                <FileCard
                    fileInfo={fileInfos[infoID]}
                    key={infoID}
                />,
            );
        }
        return infos;
    }, [fileInfos]);

    let content;
    if (!searchValue) {
        content = notImplementedComponent;
    } else if (selectedTab === 'messages') {
        content = renderMessages();
    } else if (selectedTab === 'files') {
        content = renderFiles();
    }

    return (<>
        {content}
    </>);
};

export default SearchResults;
