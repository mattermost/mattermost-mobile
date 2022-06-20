// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useNavigation} from '@react-navigation/native';
import {debounce} from 'lodash';
import React, {useCallback, useState, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, StyleSheet} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {searchPosts, searchFiles} from '@actions/remote/search';
import FreezeScreen from '@components/freeze_screen';
import NavigationHeader from '@components/navigation_header';
import RoundedHeaderContext from '@components/rounded_header_context';
import {useServerUrl} from '@context/server';
import {useCollapsibleHeader} from '@hooks/header';
import {FileFilter, filterFiles} from '@utils/file';

import Results from './results';
import Header, {SelectTab} from './results/header';

const EDGES: Edge[] = ['bottom', 'left', 'right'];

const emptyFileResults: FileInfo[] = [];
const emptyPostResults: string[] = [];

type Props = {
    teamId: string;
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const SearchScreen = ({teamId}: Props) => {
    const nav = useNavigation();
    const isFocused = useIsFocused();
    const intl = useIntl();
    const searchScreenIndex = 1;
    const stateIndex = nav.getState().index;
    const serverUrl = useServerUrl();
    const {searchTerm} = nav.getState().routes[stateIndex].params;

    const [searchValue, setSearchValue] = useState<string>(searchTerm);
    const [selectedTab, setSelectedTab] = useState<SelectTab>('messages');
    const [filter, setFilter] = useState<FileFilter>('all');

    const [loading, setLoading] = useState(false);
    const [lastSearchedValue, setLastSearchedValue] = useState('');

    const [postIds, setPostIds] = useState<string[]>(emptyPostResults);
    const [fileInfos, setFileInfos] = useState<FileInfo[]>(emptyFileResults);
    const [filteredFileInfos, setFilteredFileInfos] = useState<FileInfo[]>(emptyFileResults);

    const handleSearch = useCallback((debounce(async () => {
        // execute the search for the text in the navigation text box
        // handle recent searches
        // - add recent if doesn't exist
        // - updated recent createdAt if exists??

        setLoading(true);
        setLastSearchedValue(searchValue);

        const searchParams: PostSearchParams | FileSearchParams = {
            terms: searchValue,
            is_or_search: true,
        };

        const [postResults, fileResults] = await Promise.all([
            searchPosts(serverUrl, searchParams),
            searchFiles(serverUrl, teamId, searchParams),
        ]);

        const fileInfosResult = fileResults?.file_infos && Object.values(fileResults?.file_infos);
        setFileInfos(fileInfosResult?.length ? fileInfosResult : emptyFileResults);
        setPostIds(postResults?.order?.length ? postResults.order : emptyPostResults);

        setLoading(false);
    })), [searchValue]);

    const onSnap = (offset: number) => {
        scrollRef.current?.scrollToOffset({offset, animated: true});
    };

    useEffect(() => {
        setSearchValue(searchTerm);
    }, [searchTerm]);

    useEffect(() => {
        setFilteredFileInfos(filterFiles(fileInfos, filter));
    }, [filter, fileInfos]);

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll, headerHeight, hideHeader} = useCollapsibleHeader<FlatList>(true, onSnap);

    const animated = useAnimatedStyle(() => {
        if (isFocused) {
            return {
                opacity: withTiming(1, {duration: 150}),
                flex: 1,
                transform: [{translateX: withTiming(0, {duration: 150})}],
            };
        }

        return {
            opacity: withTiming(0, {duration: 150}),
            transform: [{translateX: withTiming(stateIndex < searchScreenIndex ? 25 : -25, {duration: 150})}],

        };
    }, [isFocused, stateIndex]);

    const top = useAnimatedStyle(() => {
        return {
            top: headerHeight.value,
            zIndex: lastSearchedValue ? 10 : 0,
        };
    }, [headerHeight, lastSearchedValue]);

    let header = null;
    if (lastSearchedValue) {
        header = (
            <Header
                onTabSelect={setSelectedTab}
                onFilterChanged={setFilter}
                numberMessages={postIds.length}
                selectedTab={selectedTab}
                numberFiles={Object.keys(filteredFileInfos).length}
                selectedFilter={filter}
            />
        );
    }

    return (
        <FreezeScreen freeze={!isFocused}>
            <NavigationHeader
                isLargeTitle={true}
                onBackPress={() => {
                    // eslint-disable-next-line no-console
                    console.log('BACK');
                }}
                showBackButton={false}
                title={intl.formatMessage({id: 'screen.search.title', defaultMessage: 'Search'})}
                hasSearch={true}
                scrollValue={scrollValue}
                hideHeader={hideHeader}
                onChangeText={setSearchValue}
                onSubmitEditing={handleSearch}
                blurOnSubmit={true}
                placeholder={intl.formatMessage({id: 'screen.search.placeholder', defaultMessage: 'Search messages & files'})}
                defaultValue={searchValue}
            />
            <SafeAreaView
                style={styles.flex}
                edges={EDGES}
            >
                <Animated.View style={animated}>
                    <Animated.View style={top}>
                        <RoundedHeaderContext/>
                        {header}
                    </Animated.View>
                    <Results
                        selectedTab={selectedTab}
                        searchValue={lastSearchedValue}
                        postIds={postIds}
                        fileInfos={filteredFileInfos}
                        scrollRef={scrollRef}
                        onScroll={onScroll}
                        scrollPaddingTop={scrollPaddingTop}
                        loading={loading}
                    />
                </Animated.View>
            </SafeAreaView>
        </FreezeScreen>
    );
};

export default SearchScreen;
