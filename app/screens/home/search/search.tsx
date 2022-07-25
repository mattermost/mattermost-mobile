// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
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
import DatabaseManager from '@database/manager';
import {useCollapsibleHeader} from '@hooks/header';
import {queryTeamSearchHistoryByTeamId} from '@queries/servers/team';
import {FileFilter, FileFilters, filterFileExtensions} from '@utils/file';
import {TabTypes, TabType} from '@utils/search';

import Modifiers from './modifiers';
import RecentSearches from './recent_searches';
import Results from './results';
import Header from './results/header';

import type TeamSearchHistoryModel from '@typings/database/models/servers/team_search_history';

const EDGES: Edge[] = ['bottom', 'left', 'right'];
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const emptyFileResults: FileInfo[] = [];
const emptyPostResults: string[] = [];
const emptyChannelIds: string[] = [];

const dummyData = [1];

type Props = {
    teamId: string;
    recentSearches: TeamSearchHistoryModel[];
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

const getRecentSearches = async (serverUrl: string, teamId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return [];
    }
    return queryTeamSearchHistoryByTeamId(database, teamId).fetch();
};

const getSearchParams = (terms: string, filterValue?: FileFilter) => {
    const fileExtensions = filterFileExtensions(filterValue);
    const extensionTerms = fileExtensions ? ' ' + fileExtensions : '';
    return {
        terms: terms + extensionTerms,
        is_or_search: true,
    };
};

const searchScreenIndex = 1;

const SearchScreen = ({teamId, recentSearches}: Props) => {
    const nav = useNavigation();
    const isFocused = useIsFocused();
    const intl = useIntl();
    const theme = useTheme();

    const stateIndex = nav.getState().index;
    const serverUrl = useServerUrl();
    const searchTerm = (nav.getState().routes[stateIndex].params as any)?.searchTerm;

    const [searchValue, setSearchValue] = useState<string>(searchTerm);
    const [searchTeamId, setSearchTeamId] = useState<string>(teamId);
    const [selectedTab, setSelectedTab] = useState<TabType>(TabTypes.MESSAGES);
    const [filter, setFilter] = useState<FileFilter>(FileFilters.ALL);
    const [recents, setRecents] = useState<TeamSearchHistoryModel[]>(recentSearches);
    const [showResults, setShowResults] = useState(false);

    const [loading, setLoading] = useState(false);
    const [lastSearchedValue, setLastSearchedValue] = useState('');

    const [postIds, setPostIds] = useState<string[]>(emptyPostResults);
    const [fileInfos, setFileInfos] = useState<FileInfo[]>(emptyFileResults);
    const [fileChannelIds, setFileChannelIds] = useState<string[]>([]);

    const onSnap = (offset: number) => {
        scrollRef.current?.scrollToOffset({offset, animated: true});
    };

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll, headerHeight, hideHeader} = useCollapsibleHeader<FlatList>(true, onSnap);

    const handleClearSearch = useCallback(() => {
        setSearchValue('');
        setLastSearchedValue('');
        setFilter(FileFilters.ALL);
    }, []);

    const updateRecents = useCallback(async () => {
        const newRecents = await getRecentSearches(serverUrl, searchTeamId);
        setRecents(newRecents);
    }, [searchTeamId, serverUrl]);

    useEffect(() => {
        const getTeamRecents = async () => {
            updateRecents();
        };
        getTeamRecents();
    }, [searchTeamId]);

    const handleCancelSearch = useCallback(() => {
        handleClearSearch();
        setShowResults(false);
    }, [handleClearSearch]);

    const handleSearch = useCallback(async (newSearchTeamId: string, term: string) => {
        const searchParams = getSearchParams(term);
        if (!searchParams.terms) {
            handleClearSearch();
            return;
        }
        setLoading(true);
        setFilter(FileFilters.ALL);
        setLastSearchedValue(term);
        addSearchToTeamSearchHistory(serverUrl, newSearchTeamId, term);
        const [postResults, {files, channels}] = await Promise.all([
            searchPosts(serverUrl, newSearchTeamId, searchParams),
            searchFiles(serverUrl, newSearchTeamId, searchParams),
        ]);

        setFileInfos(files?.length ? files : emptyFileResults);
        setPostIds(postResults?.order?.length ? postResults.order : emptyPostResults);
        setFileChannelIds(channels?.length ? channels : emptyChannelIds);

        updateRecents();
        setShowResults(true);
        setLoading(false);
    }, [handleClearSearch, setRecents]);

    const onSubmit = useCallback(() => {
        handleSearch(searchTeamId, searchValue);
    }, [handleSearch, searchTeamId, searchValue]);

    const handleRecentSearch = useCallback((text: string) => {
        setSearchValue(text);
        handleSearch(searchTeamId, text);
    }, [handleSearch, searchTeamId]);

    const handleFilterChange = useCallback(async (filterValue: FileFilter) => {
        setLoading(true);
        setFilter(filterValue);
        const searchParams = getSearchParams(lastSearchedValue, filterValue);
        const {files, channels} = await searchFiles(serverUrl, searchTeamId, searchParams);
        setFileInfos(files?.length ? files : emptyFileResults);
        setFileChannelIds(channels?.length ? channels : emptyChannelIds);

        setLoading(false);
    }, [lastSearchedValue, searchTeamId]);

    const handleResultsTeamChange = useCallback((newTeamId: string) => {
        setSearchTeamId(newTeamId);
        handleSearch(newTeamId, lastSearchedValue);
    }, [lastSearchedValue]);

    const loadingComponent = useMemo(() => (
        <Loading
            containerStyle={[styles.loading, {paddingTop: scrollPaddingTop}]}
            color={theme.buttonBg}
            size='large'
        />
    ), [theme, scrollPaddingTop]);

    const searchComponent = useMemo(() => (
        <>
            <Modifiers
                setSearchValue={setSearchValue}
                searchValue={searchValue}
                teamId={searchTeamId}
                setTeamId={setSearchTeamId}
            />
            {Boolean(recents?.length) &&
                <RecentSearches
                    onRemoveSearch={updateRecents}
                    recentSearches={recents}
                    setRecentValue={handleRecentSearch}
                    teamId={searchTeamId}
                />
            }
        </>
    ), [searchValue, searchTeamId, handleRecentSearch, recents]);

    const resultsComponent = useMemo(() => (
        <Results
            selectedTab={selectedTab}
            searchValue={lastSearchedValue}
            postIds={postIds}
            fileInfos={fileInfos}
            scrollPaddingTop={scrollPaddingTop}
            fileChannelIds={fileChannelIds}
        />
    ), [selectedTab, lastSearchedValue, postIds, fileInfos, scrollPaddingTop, fileChannelIds]);

    const renderItem = useCallback(() => {
        if (loading) {
            return loadingComponent;
        }
        if (!showResults) {
            return searchComponent;
        }
        return resultsComponent;
    }, [
        loading && loadingComponent,
        !loading && !showResults && searchComponent,
        !loading && showResults && resultsComponent,
    ]);

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
