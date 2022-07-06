// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useNavigation} from '@react-navigation/native';
import React, {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, StyleSheet} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {addSearchToTeamSearchHistory} from '@actions/local/team';
import {searchPosts, searchFiles} from '@actions/remote/search';
import FreezeScreen from '@components/freeze_screen';
import Loading from '@components/loading';
import NavigationHeader from '@components/navigation_header';
import RoundedHeaderContext from '@components/rounded_header_context';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useCollapsibleHeader} from '@hooks/header';
import {FileFilter, FileFilters, filterFileExtensions} from '@utils/file';

import Modifiers from './modifiers';
import RecentSearches from './recent_searches';
import Results from './results';
import Header, {SelectTab} from './results/header';

const EDGES: Edge[] = ['bottom', 'left', 'right'];
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const emptyFileResults: FileInfo[] = [];
const emptyPostResults: string[] = [];
const dummyData = [1];

type Props = {
    teamId: string;
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const SearchScreen = ({teamId}: Props) => {
    const nav = useNavigation();
    const isFocused = useIsFocused();
    const intl = useIntl();
    const theme = useTheme();
    const searchScreenIndex = 1;
    const stateIndex = nav.getState().index;
    const serverUrl = useServerUrl();
    const {searchTerm} = nav.getState().routes[stateIndex].params;

    const [searchValue, setSearchValue] = useState<string>(searchTerm);
    const [searchTeamId, setSearchTeamId] = useState<string>(teamId);
    const [selectedTab, setSelectedTab] = useState<SelectTab>('messages');
    const [filter, setFilter] = useState<FileFilter>(FileFilters.ALL);
    const [showResults, setShowResults] = useState(false);

    const [loading, setLoading] = useState(false);
    const [lastSearchedValue, setLastSearchedValue] = useState('');

    const [postIds, setPostIds] = useState<string[]>(emptyPostResults);
    const [fileInfos, setFileInfos] = useState<FileInfo[]>(emptyFileResults);

    const getSearchParams = (terms: string, filterValue?: FileFilter) => {
        const fileExtensions = filterFileExtensions(filterValue || filter);
        const extensionTerms = fileExtensions ? ' ' + fileExtensions : '';
        return {
            terms: terms + extensionTerms,
            is_or_search: true,
        };
    };

    const onSnap = (offset: number) => {
        scrollRef.current?.scrollToOffset({offset, animated: true});
    };

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll, headerHeight, hideHeader} = useCollapsibleHeader<FlatList>(true, onSnap);

    const onSubmit = useCallback(() => {
        handleSearch(searchTeamId, searchValue);
    }, [searchValue]);

    const handleClearSearch = useCallback(() => {
        setSearchValue('');
        setLastSearchedValue('');
        setFilter(FileFilters.ALL);
    }, []);

    const handleCancelSearch = useCallback(() => {
        handleClearSearch();
        setShowResults(false);
    }, [handleClearSearch, showResults]);

    const handleSearch = async (newSearchTeamId: string, term: string) => {
        setLoading(true);
        setFilter(FileFilters.ALL);
        setLastSearchedValue(term);
        addSearchToTeamSearchHistory(serverUrl, newSearchTeamId, term);
        const searchParams = getSearchParams(term);
        const [postResults, fileResults] = await Promise.all([
            searchPosts(serverUrl, newSearchTeamId, searchParams),
            searchFiles(serverUrl, newSearchTeamId, searchParams),
        ]);

        const fileInfosResult = fileResults?.file_infos && Object.values(fileResults?.file_infos);
        setFileInfos(fileInfosResult?.length ? fileInfosResult : emptyFileResults);
        setPostIds(postResults?.order?.length ? postResults.order : emptyPostResults);

        setLoading(false);
        setShowResults(true);
        hideHeader();
    };

    const handleRecentSearch = useCallback((text: string) => {
        hideHeader();
        setSearchValue(text);
        handleSearch(searchTeamId, text);
    }, [handleSearch]);

    const handleFilterChange = useCallback(async (filterValue: FileFilter) => {
        setLoading(true);
        setFilter(filterValue);
        const searchParams = getSearchParams(lastSearchedValue, filterValue);
        const fileResults = await searchFiles(serverUrl, teamId, searchParams);
        const fileInfosResult = fileResults?.file_infos && Object.values(fileResults?.file_infos);
        setFileInfos(fileInfosResult?.length ? fileInfosResult : emptyFileResults);

        setLoading(false);
    }, [getSearchParams, lastSearchedValue, searchFiles]);

    const handleResultsTeamChange = useCallback((newTeamId: string) => {
        setSearchTeamId(newTeamId);
        handleSearch(newTeamId, lastSearchedValue);
    }, [setSearchTeamId, lastSearchedValue, searchValue]);

    const renderItem = useCallback(() => {
        if (loading) {
            return (
                <Loading
                    containerStyle={[styles.loading, {paddingTop: scrollPaddingTop}]}
                    color={theme.buttonBg}
                    size='large'
                />
            );
        } else if (!showResults && !loading) {
            return (
                <>
                    <Modifiers
                        setSearchValue={setSearchValue}
                        searchValue={searchValue}
                        teamId={searchTeamId}
                        setTeamId={setSearchTeamId}
                    />
                    <RecentSearches
                        setRecentValue={handleRecentSearch}
                        teamId={searchTeamId}
                    />
                </>
            );
        }

        return (
            <Results
                selectedTab={selectedTab}
                searchValue={lastSearchedValue}
                postIds={postIds}
                fileInfos={fileInfos}
                scrollPaddingTop={scrollPaddingTop}
                loading={loading}
            />
        );
    }, [loading, selectedTab, showResults, searchTeamId, setSearchTeamId]);

    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop, flexGrow: 1}), [scrollPaddingTop]);

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
    if (lastSearchedValue && !loading) {
        header = (
            <Header
                teamId={searchTeamId}
                setTeamId={handleResultsTeamChange}
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
                onSubmitEditing={onSubmit}
                blurOnSubmit={true}
                placeholder={intl.formatMessage({id: 'screen.search.placeholder', defaultMessage: 'Search messages & files'})}
                onClear={handleClearSearch}
                onCancel={handleCancelSearch}
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
                    <AnimatedFlatList
                        data={dummyData}
                        contentContainerStyle={paddingTop}
                        keyboardShouldPersistTaps='handled'
                        keyboardDismissMode={'interactive'}
                        nestedScrollEnabled={true}
                        indicatorStyle='black'
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        removeClippedSubviews={false}
                        scrollToOverflowEnabled={true}
                        overScrollMode='always'
                        ref={scrollRef}
                        renderItem={renderItem}
                    />
                </Animated.View>
            </SafeAreaView>
        </FreezeScreen>
    );
};

export default SearchScreen;
