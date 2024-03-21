// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useNavigation} from '@react-navigation/native';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, type LayoutChangeEvent, Platform, StyleSheet, type ViewStyle, KeyboardAvoidingView, Keyboard} from 'react-native';
import HWKeyboardEvent from 'react-native-hw-keyboard-event';
import Animated, {useAnimatedStyle, useDerivedValue, withTiming, type AnimatedStyle} from 'react-native-reanimated';
import {type Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {getPosts} from '@actions/local/post';
import {addSearchToTeamSearchHistory} from '@actions/local/team';
import {searchPosts, searchFiles} from '@actions/remote/search';
import Autocomplete from '@components/autocomplete';
import FreezeScreen from '@components/freeze_screen';
import Loading from '@components/loading';
import NavigationHeader from '@components/navigation_header';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Screens} from '@constants';
import {BOTTOM_TAB_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useKeyboardHeight} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {useCollapsibleHeader} from '@hooks/header';
import NavigationStore from '@store/navigation_store';
import {type FileFilter, FileFilters, filterFileExtensions} from '@utils/file';
import {TabTypes, type TabType} from '@utils/search';

import Initial from './initial';
import Results from './results';
import Header from './results/header';

import type {SearchRef} from '@components/search';
import type PostModel from '@typings/database/models/servers/post';
import type TeamModel from '@typings/database/models/servers/team';

const EDGES: Edge[] = ['bottom', 'left', 'right'];
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const emptyFileResults: FileInfo[] = [];
const emptyPosts: PostModel[] = [];
const emptyChannelIds: string[] = [];

const dummyData = [1];

const AutocompletePaddingTop = 4;

type Props = {
    teamId: string;
    teams: TeamModel[];
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
        terms: terms.replace(/[\u201C\u201D]/g, '"') + extensionTerms,
        is_or_search: false,
        include_deleted_channels: true,
    };
};

const searchScreenIndex = 1;

const SearchScreen = ({teamId, teams}: Props) => {
    const nav = useNavigation();
    const isFocused = useIsFocused();
    const intl = useIntl();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardHeight();

    const stateIndex = nav.getState()?.index;
    const serverUrl = useServerUrl();
    const searchTerm: string = stateIndex === undefined ? '' : (nav.getState()?.routes[stateIndex]?.params as any)?.searchTerm || '';

    const clearRef = useRef<boolean>(false);
    const cancelRef = useRef<boolean>(false);
    const searchRef = useRef<SearchRef>(null);

    const [cursorPosition, setCursorPosition] = useState(searchTerm?.length || 0);
    const [searchValue, setSearchValue] = useState<string>(searchTerm || '');
    const [searchTeamId, setSearchTeamId] = useState<string>(teamId);
    const [selectedTab, setSelectedTab] = useState<TabType>(TabTypes.MESSAGES);
    const [filter, setFilter] = useState<FileFilter>(FileFilters.ALL);
    const [showResults, setShowResults] = useState(false);
    const [containerHeight, setContainerHeight] = useState(0);
    const [searchIsFocused, setSearchIsFocused] = useState(false);

    const [loading, setLoading] = useState(false);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [lastSearchedValue, setLastSearchedValue] = useState('');
    const [posts, setPosts] = useState<PostModel[]>(emptyPosts);
    const [matches, setMatches] = useState<SearchMatches|undefined>();
    const [fileInfos, setFileInfos] = useState<FileInfo[]>(emptyFileResults);
    const [fileChannelIds, setFileChannelIds] = useState<string[]>([]);

    useEffect(() => {
        setSearchTeamId(teamId);
    }, [teamId]);

    useEffect(() => {
        if (searchTerm) {
            resetToInitial();
            setSearchValue(searchTerm);
            handleSearch(searchTeamId, searchTerm);
        }
    }, [searchTerm]);

    const onSnap = (offset: number, animated = true) => {
        scrollRef.current?.scrollToOffset({offset, animated});
    };

    const {
        headerHeight,
        headerOffset,
        hideHeader,
        lockValue,
        onScroll,
        scrollEnabled,
        scrollPaddingTop,
        scrollRef,
        scrollValue,
        setAutoScroll,
        unlock,
    } = useCollapsibleHeader<FlatList>(true, onSnap);

    const resetToInitial = useCallback(() => {
        setShowResults(false);
        setSearchValue('');
        setLastSearchedValue('');
        setFilter(FileFilters.ALL);
    }, []);

    const handleClearSearch = useCallback(() => {
        clearRef.current = true;
        Keyboard.dismiss();
        resetToInitial();
    }, [resetToInitial]);

    const handleCancelSearch = useCallback(() => {
        cancelRef.current = true;
        resetToInitial();
        onSnap(0);
    }, [resetToInitial]);

    const handleTextChange = useCallback((newValue: string) => {
        setSearchValue(newValue);
        setCursorPosition(newValue.length);
    }, []);

    const handleModifierTextChange = useCallback((newValue: string) => {
        setSearchIsFocused(true);
        requestAnimationFrame(() => {
            searchRef.current?.focus?.();
            handleTextChange(newValue);
        });
    }, [handleTextChange]);

    const handleLoading = useCallback((show: boolean) => {
        (showResults ? setResultsLoading : setLoading)(show);
    }, [showResults]);

    const handleSearch = useCallback(async (newSearchTeamId: string, term: string) => {
        const searchParams = getSearchParams(term, filter);
        if (!searchParams.terms) {
            handleClearSearch();
            return;
        }
        hideHeader(true);
        handleLoading(true);
        setLastSearchedValue(term);
        addSearchToTeamSearchHistory(serverUrl, newSearchTeamId, term);
        const [postResults, {files, channels}] = await Promise.all([
            searchPosts(serverUrl, newSearchTeamId, searchParams),
            searchFiles(serverUrl, newSearchTeamId, searchParams),
        ]);

        setFileInfos(files?.length ? files : emptyFileResults);
        if (postResults.order) {
            const postModels = await getPosts(serverUrl, postResults.order, 'asc');
            setPosts(postModels.length ? postModels : emptyPosts);
            setMatches(postResults.matches);
        }
        setFileChannelIds(channels?.length ? channels : emptyChannelIds);
        handleLoading(false);
        setShowResults(true);
    }, [filter, handleClearSearch, handleLoading]);

    const onBlur = useCallback(() => {
        setSearchIsFocused(false);
    }, []);

    const onFocus = useCallback(() => {
        setSearchIsFocused(true);
    }, []);

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

    const initialContainerStyle: AnimatedStyle<ViewStyle> = useMemo(() => {
        return {
            paddingTop: scrollPaddingTop,
            flexGrow: 1,
            justifyContent: (resultsLoading || loading) ? 'center' : 'flex-start',
        };
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
                scrollEnabled={scrollEnabled}
                searchValue={searchValue}
                setRecentValue={handleRecentSearch}
                searchRef={searchRef}
                setSearchValue={handleModifierTextChange}
                setTeamId={setSearchTeamId}
                teamId={searchTeamId}
                teams={teams}
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
            flex: 1,
            transform: [{translateX: withTiming((stateIndex || 0) < searchScreenIndex ? 25 : -25, {duration: 150})}],
        };
    }, [isFocused, stateIndex]);

    const headerTopStyle = useAnimatedStyle(() => ({
        top: lockValue.value ? lockValue.value : headerHeight.value,
        zIndex: lastSearchedValue ? 10 : 0,
    }), [headerHeight, lastSearchedValue, lockValue]);

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
    }, [headerHeight]);

    // when clearing the input from the search results, scroll the initial view
    // back to the top so the header is in the collapsed state
    const onFlatLayout = useCallback(() => {
        if (clearRef.current || cancelRef.current) {
            unlock();
        }
        if (clearRef.current) {
            onSnap(headerOffset, false);
            clearRef.current = false;
        } else if (cancelRef.current) {
            onSnap(0);
            cancelRef.current = false;
        }
    }, [headerOffset, scrollRef]);

    useDidUpdate(() => {
        if (isFocused) {
            setTimeout(() => {
                setAutoScroll(true);
            }, 300);
        } else {
            setAutoScroll(false);
        }
    }, [isFocused]);

    useEffect(() => {
        const listener = HWKeyboardEvent.onHWKeyPressed((keyEvent: {pressedKey: string}) => {
            const topScreen = NavigationStore.getVisibleScreen();
            if (topScreen === Screens.HOME && isFocused && keyEvent.pressedKey === 'enter') {
                searchRef.current?.blur();
                onSubmit();
            }
        });
        return () => {
            listener.remove();
        };
    }, [onSubmit]);

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
                onBlur={onBlur}
                onClear={handleClearSearch}
                onCancel={handleCancelSearch}
                onFocus={onFocus}
                defaultValue={searchValue}
                ref={searchRef}
            />
            <SafeAreaView
                style={styles.flex}
                edges={EDGES}
                onLayout={onLayout}
                testID='search_messages.screen'
            >
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                                selectedTab={selectedTab}
                                selectedFilter={filter}
                                teams={teams}
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
                            searchValue={lastSearchedValue.replace(/[\u201C\u201D]/g, '"')}
                            posts={posts}
                            matches={matches}
                            fileInfos={fileInfos}
                            scrollPaddingTop={lockValue.value}
                            fileChannelIds={fileChannelIds}
                        />
                        }
                    </Animated.View>
                </KeyboardAvoidingView>
            </SafeAreaView>
            {searchIsFocused &&
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
                teamId={searchTeamId}
            />
            }
        </FreezeScreen>
    );
};

export default SearchScreen;
