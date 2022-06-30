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
import {FileFilter, FileFilters, filterFileExtensions} from '@utils/file';

import Modifiers from './modifiers';
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
    const [filter, setFilter] = useState<FileFilter>(FileFilters.ALL);
    const [showResults, setShowResults] = useState(false);

    const [loading, setLoading] = useState(false);
    const [lastSearchedValue, setLastSearchedValue] = useState('');

    const [postIds, setPostIds] = useState<string[]>(emptyPostResults);
    const [fileInfos, setFileInfos] = useState<FileInfo[]>(emptyFileResults);

    const getSearchParams = useCallback((filterValue?: FileFilter) => {
        const terms = filterValue ? lastSearchedValue : searchValue;
        const fileExtensions = filterFileExtensions(filterValue || filter);
        const extensionTerms = fileExtensions ? ' ' + fileExtensions : '';
        return {
            terms: terms + extensionTerms,
            is_or_search: true,
        };
    }, [filter, lastSearchedValue, searchValue]);

    const handleSearch = useCallback((debounce(async () => {
        // execute the search for the text in the navigation text box
        // handle recent searches
        // - add recent if doesn't exist
        // - updated recent createdAt if exists??

        setLoading(true);
        setFilter(FileFilters.ALL);
        setLastSearchedValue(searchValue);
        const searchParams = getSearchParams();
        const [postResults, fileResults] = await Promise.all([
            searchPosts(serverUrl, searchParams),
            searchFiles(serverUrl, teamId, searchParams),
        ]);

        const fileInfosResult = fileResults?.file_infos && Object.values(fileResults?.file_infos);
        setFileInfos(fileInfosResult?.length ? fileInfosResult : emptyFileResults);
        setPostIds(postResults?.order?.length ? postResults.order : emptyPostResults);

        setLoading(false);
        setShowResults(true);
    })), [searchValue]);

    const onSnap = (offset: number) => {
        scrollRef.current?.scrollToOffset({offset, animated: true});
    };

    const handleFilterChange = useCallback(async (filterValue: FileFilter) => {
        setLoading(true);
        setFilter(filterValue);
        const searchParams = getSearchParams(filterValue);
        const fileResults = await searchFiles(serverUrl, teamId, searchParams);
        const fileInfosResult = fileResults?.file_infos && Object.values(fileResults?.file_infos);
        setFileInfos(fileInfosResult?.length ? fileInfosResult : emptyFileResults);

        setLoading(false);
    }, [lastSearchedValue]);

    useEffect(() => {
        setSearchValue(searchTerm);
    }, [searchTerm]);

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

    const handleClearSearch = useCallback(() => {
        setSearchValue('');
        setLastSearchedValue('');
        setFilter(FileFilters.ALL);
        setShowResults(false);
    }, []);

    let header = null;
    if (lastSearchedValue) {
        header = (
            <Header
                onTabSelect={setSelectedTab}
                onFilterChanged={handleFilterChange}
                numberMessages={postIds.length}
                selectedTab={selectedTab}
                numberFiles={fileInfos.length}
                selectedFilter={filter}
            />
        );
    }

    return (
        <FreezeScreen freeze={!isFocused}>
            <NavigationHeader
                isLargeTitle={true}
                showBackButton={false}
                title={intl.formatMessage({id: 'screen.search.title', defaultMessage: 'Search'})}
                hasSearch={true}
                scrollValue={scrollValue}
                hideHeader={hideHeader}
                onChangeText={setSearchValue}
                onSubmitEditing={handleSearch}
                blurOnSubmit={true}
                placeholder={intl.formatMessage({id: 'screen.search.placeholder', defaultMessage: 'Search messages & files'})}
                onClear={handleClearSearch}
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
                    {!showResults &&
                        <Modifiers
                            setSearchValue={setSearchValue}
                            searchValue={searchValue}
                            scrollPaddingTop={scrollPaddingTop}
                        />
                    }
                    {showResults &&
                        <Results
                            selectedTab={selectedTab}
                            searchValue={lastSearchedValue}
                            postIds={postIds}
                            fileInfos={fileInfos}
                            scrollRef={scrollRef}
                            onScroll={onScroll}
                            scrollPaddingTop={scrollPaddingTop}
                            loading={loading}
                        />
                    }
                </Animated.View>
            </SafeAreaView>
        </FreezeScreen>
    );
};

export default SearchScreen;
