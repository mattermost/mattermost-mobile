// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useNavigation} from '@react-navigation/native';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, LayoutChangeEvent, Platform, StyleSheet, ViewProps} from 'react-native';
import Animated, {useAnimatedStyle, useDerivedValue, withTiming} from 'react-native-reanimated';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {getPosts} from '@actions/local/post';
import {addSearchToTeamSearchHistory} from '@actions/local/team';
import {searchPosts, searchFiles} from '@actions/remote/search';
import Autocomplete from '@components/autocomplete';
import FreezeScreen from '@components/freeze_screen';
import Loading from '@components/loading';
import NavigationHeader from '@components/navigation_header';
import RoundedHeaderContext from '@components/rounded_header_context';
import {BOTTOM_TAB_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet, useKeyboardHeight} from '@hooks/device';
import {useCollapsibleHeader} from '@hooks/header';
import {FileFilter, FileFilters, filterFileExtensions} from '@utils/file';
import {TabTypes, TabType} from '@utils/search';

import Initial from './initial';
import Results from './results';
import Header from './results/header';

import type PostModel from '@typings/database/models/servers/post';

const EDGES: Edge[] = ['bottom', 'left', 'right'];
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const emptyFileResults: FileInfo[] = [];
const emptyPosts: PostModel[] = [];
const emptyChannelIds: string[] = [];

const dummyData = [1];

const AutocompletePaddingTop = 4;

type Props = {
    teamId: string;
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
    },
    autocompleteContainer: {
        zIndex: 11,
    },
});

const getSearchParams = (terms: string, filterValue?: FileFilter) => {
    const fileExtensions = filterFileExtensions(filterValue);
    const extensionTerms = fileExtensions ? ' ' + fileExtensions : '';
    return {
        terms: terms + extensionTerms,
        is_or_search: true,
    };
};

const searchScreenIndex = 1;

const SearchScreen = ({teamId}: Props) => {
    const nav = useNavigation();
    const isFocused = useIsFocused();
    const intl = useIntl();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardHeight();

    const stateIndex = nav.getState().index;
    const serverUrl = useServerUrl();
    const searchTerm = (nav.getState().routes[stateIndex].params as any)?.searchTerm;

    const clearRef = useRef<boolean>(false);
    const isTablet = useIsTablet();
    const [cursorPosition, setCursorPosition] = useState(searchTerm?.length);
    const [searchValue, setSearchValue] = useState<string>(searchTerm);
    const [searchTeamId, setSearchTeamId] = useState<string>(teamId);
    const [selectedTab, setSelectedTab] = useState<TabType>(TabTypes.MESSAGES);
    const [filter, setFilter] = useState<FileFilter>(FileFilters.ALL);
    const [showResults, setShowResults] = useState(false);
    const [containerHeight, setContainerHeight] = useState(0);

    const [loading, setLoading] = useState(false);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [lastSearchedValue, setLastSearchedValue] = useState('');
    const [posts, setPosts] = useState<PostModel[]>(emptyPosts);
    const [fileInfos, setFileInfos] = useState<FileInfo[]>(emptyFileResults);
    const [fileChannelIds, setFileChannelIds] = useState<string[]>([]);

    const onSnap = (offset: number) => {
        scrollRef.current?.scrollToOffset({offset, animated: true});
    };

    const {
        headerHeight,
        headerOffset,
        hideHeader,
        lockValue,
        onScroll,
        scrollPaddingTop,
        scrollRef,
        scrollValue,
        unlock,
    } = useCollapsibleHeader<FlatList>(true, onSnap, true);

    const resetToInitial = useCallback(() => {
        unlock();
        setShowResults(false);
        setSearchValue('');
        setLastSearchedValue('');
        setFilter(FileFilters.ALL);
    }, []);

    const handleClearSearch = useCallback(() => {
        resetToInitial();
        clearRef.current = true;
    }, [resetToInitial]);

    const handleCancelSearch = useCallback(() => {
        resetToInitial();
        scrollRef.current?.scrollToOffset({
            offset: 0,
            animated: true,
        });
    }, [resetToInitial]);

    const handleTextChange = useCallback((newValue: string) => {
        setSearchValue(newValue);
        setCursorPosition(newValue.length);
    }, []);

    const handleLoading = useCallback((show: boolean) => {
        (showResults ? setResultsLoading : setLoading)(show);
    }, [showResults]);

    const handleSearch = useCallback(async (newSearchTeamId: string, term: string) => {
        const searchParams = getSearchParams(term);
        if (!searchParams.terms) {
            handleClearSearch();
            return;
        }
        hideHeader(true);
        handleLoading(true);
        setFilter(FileFilters.ALL);
        setLastSearchedValue(term);
        addSearchToTeamSearchHistory(serverUrl, newSearchTeamId, term);
        const [postResults, {files, channels}] = await Promise.all([
            searchPosts(serverUrl, newSearchTeamId, searchParams),
            searchFiles(serverUrl, newSearchTeamId, searchParams),
        ]);

        setFileInfos(files?.length ? files : emptyFileResults);
        if (postResults.order) {
            const postModels = await getPosts(serverUrl, postResults.order);
            setPosts(postModels.length ? postModels : emptyPosts);
        }
        setFileChannelIds(channels?.length ? channels : emptyChannelIds);
        handleLoading(false);
        setShowResults(true);
    }, [handleClearSearch, handleLoading]);

    const onSubmit = useCallback(() => {
        handleSearch(searchTeamId, searchValue);
    }, [handleSearch, searchTeamId, searchValue]);

    const handleRecentSearch = useCallback((text: string) => {
        handleTextChange(text);
        handleSearch(searchTeamId, text);
    }, [handleSearch, handleTextChange, searchTeamId]);

    const handleFilterChange = useCallback(async (filterValue: FileFilter) => {
        setResultsLoading(true);
        setFilter(filterValue);
        const searchParams = getSearchParams(lastSearchedValue, filterValue);
        const {files, channels} = await searchFiles(serverUrl, searchTeamId, searchParams);
        setFileInfos(files?.length ? files : emptyFileResults);
        setFileChannelIds(channels?.length ? channels : emptyChannelIds);
        setResultsLoading(false);
    }, [lastSearchedValue, searchTeamId]);

    const handleResultsTeamChange = useCallback((newTeamId: string) => {
        setSearchTeamId(newTeamId);
        handleSearch(newTeamId, lastSearchedValue);
    }, [lastSearchedValue, handleSearch]);

    const initialContainerStyle = useMemo(() => {
        return {
            paddingTop: scrollPaddingTop,
            flexGrow: 1,
            justifyContent: (resultsLoading || loading) ? 'center' : 'flex-start',
        } as ViewProps;
    }, [loading, resultsLoading, scrollPaddingTop]);

    const renderInitialOrLoadingItem = useCallback(() => {
        return loading ? (
            <Loading
                containerStyle={[styles.loading, {paddingTop: scrollPaddingTop}]}
                color={theme.buttonBg}
                size='large'
            />
        ) : (
            <Initial
                searchValue={searchValue}
                setRecentValue={handleRecentSearch}
                setSearchValue={handleTextChange}
                setTeamId={setSearchTeamId}
                teamId={searchTeamId}
            />
        );
    }, [handleRecentSearch, handleTextChange, loading,
        scrollPaddingTop, searchTeamId, searchValue, theme]);

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

    const headerTopStyle = useAnimatedStyle(() => ({
        top: lockValue.value ? lockValue.value : headerHeight.value,
        zIndex: lastSearchedValue ? 10 : 0,
    }), [headerHeight.value, isTablet, lastSearchedValue, lockValue]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const autocompleteMaxHeight = useDerivedValue(() => {
        const iosAdjust = keyboardHeight ? keyboardHeight - BOTTOM_TAB_HEIGHT : insets.bottom;
        const autocompleteRemoveFromHeight = headerHeight.value + (Platform.OS === 'ios' ? iosAdjust : 0);
        return containerHeight - autocompleteRemoveFromHeight;
    }, [keyboardHeight, insets.bottom, containerHeight]);

    const autocompletePosition = useDerivedValue(() => {
        return headerHeight.value - AutocompletePaddingTop;
    }, [headerHeight.value]);

    const autocomplete = useMemo(() => (
        <Autocomplete
            updateValue={handleTextChange}
            cursorPosition={cursorPosition}
            value={searchValue}
            isSearch={true}
            hasFilesAttached={false}
            availableSpace={autocompleteMaxHeight}
            position={autocompletePosition}
            growDown={true}
            containerStyle={styles.autocompleteContainer}
        />
    ), [cursorPosition, handleTextChange, searchValue, autocompleteMaxHeight, autocompletePosition]);

    const onFlatLayout = useCallback(() => {
        if (clearRef.current) {
            scrollRef.current?.scrollToOffset({
                offset: headerOffset,
                animated: false,
            });
            clearRef.current = false;
        }
    }, [headerOffset, scrollRef]);

    return (
        <FreezeScreen freeze={!isFocused}>
            <NavigationHeader
                isLargeTitle={true}
                showBackButton={false}
                title={intl.formatMessage({id: 'screen.search.title', defaultMessage: 'Search'})}
                hasSearch={true}
                scrollValue={scrollValue}
                lockValue={lockValue}
                hideHeader={hideHeader}
                onChangeText={handleTextChange}
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
                onLayout={onLayout}
            >
                <Animated.View style={animated}>
                    <Animated.View style={headerTopStyle}>
                        <RoundedHeaderContext/>
                        {lastSearchedValue && !loading &&
                            <Header
                                teamId={searchTeamId}
                                setTeamId={handleResultsTeamChange}
                                onTabSelect={setSelectedTab}
                                onFilterChanged={handleFilterChange}
                                numberMessages={posts.length}
                                selectedTab={selectedTab}
                                numberFiles={fileInfos.length}
                                selectedFilter={filter}
                            />
                        }
                    </Animated.View>
                    {!showResults &&
                        <AnimatedFlatList
                            onLayout={onFlatLayout}
                            data={dummyData}
                            contentContainerStyle={initialContainerStyle}
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
                            renderItem={renderInitialOrLoadingItem}
                        />
                    }
                    {showResults && !loading &&
                        <Results
                            loading={resultsLoading}
                            selectedTab={selectedTab}
                            searchValue={lastSearchedValue}
                            posts={posts}
                            fileInfos={fileInfos}
                            scrollPaddingTop={lockValue.value}
                            fileChannelIds={fileChannelIds}
                        />
                    }
                </Animated.View>
            </SafeAreaView>
            {autocomplete}
        </FreezeScreen>
    );
};

export default SearchScreen;
