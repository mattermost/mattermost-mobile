// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useHardwareKeyboardEvents} from '@mattermost/hardware-keyboard';
import {HeaderHeightContext} from '@react-navigation/elements';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {defineMessage, useIntl} from 'react-intl';
import {FlatList, Keyboard, KeyboardAvoidingView, type LayoutChangeEvent, Platform, View, type ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, useDerivedValue, withTiming, type AnimatedStyle} from 'react-native-reanimated';
import {type Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {getPosts} from '@actions/local/post';
import {addSearchToTeamSearchHistory} from '@actions/local/team';
import {searchPosts, searchFiles} from '@actions/remote/search';
import Autocomplete from '@components/autocomplete';
import SheetTabBarScrim, {useSheetTabBarScrimPadding} from '@components/chrome/sheet_tab_bar_scrim';
import Loading from '@components/loading';
import NavigationHeader from '@components/navigation_header';
import RoundedHeaderContext from '@components/rounded_header_context';
import {Screens} from '@constants';
import {isPlatformUiIos} from '@constants/platform_ui';
import {SCREENS_AS_BOTTOM_SHEET} from '@constants/screens';
import {ALL_TEAMS_ID} from '@constants/team';
import {BOTTOM_TAB_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHomeTabBackHandler from '@hooks/android_home_tab_back_handler';
import {useKeyboardHeight} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {useCollapsibleHeader} from '@hooks/header';
import {useHomeTabSearchBar} from '@hooks/home_tab_search_bar';
import {useSheetStyle} from '@hooks/sheet_style';
import useTabs from '@hooks/use_tabs';
import {useCurrentScreen} from '@store/navigation_store';
import {type FileFilter, FileFilters, filterFileExtensions} from '@utils/file';
import {TabTypes} from '@utils/search';
import {makeStyleSheetFromTheme} from '@utils/theme';

import Initial from './initial';
import Results from './results';
import Header from './results/header';

import type {SearchRef} from '@components/search';
import type PostModel from '@typings/database/models/servers/post';
import type TeamModel from '@typings/database/models/servers/team';
import type {SearchBarCommands} from 'react-native-screens';

const EDGES: Edge[] = ['left', 'right'];

const emptyFileResults: FileInfo[] = [];
const emptyPosts: PostModel[] = [];
const emptyChannelIds: string[] = [];

const dummyData = [1];

const AutocompletePaddingTop = 4;
type Props = {
    teamId: string;
    teams: TeamModel[];
    crossTeamSearchEnabled: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme(() => ({
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
}));

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

const CHANNEL_AND_USER_FILTERS_REGEX = /(?:from|channel|in):\s?[^\s\n]+/gi;

const tabs = [{
    name: defineMessage({
        id: 'screen.search.header.messages',
        defaultMessage: 'Messages',
    }),
    id: TabTypes.MESSAGES,
},
{
    name: defineMessage({
        id: 'screen.search.header.files',
        defaultMessage: 'Files',
    }),
    id: TabTypes.FILES,
}];

const SearchScreen = ({teamId, teams, crossTeamSearchEnabled}: Props) => {
    const nav = useNavigation();
    const isFocused = useIsFocused();
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const insets = useSafeAreaInsets();
    const keyboardHeight = useKeyboardHeight();
    const currentScreen = useCurrentScreen();
    const isBottomSheetOpen = currentScreen && SCREENS_AS_BOTTOM_SHEET.has(currentScreen);

    const isPemalinkScreen = currentScreen === Screens.PERMALINK;
    const isGalleryScreen = currentScreen === Screens.GALLERY;
    const platformUi = isPlatformUiIos();
    const scrimPadding = useSheetTabBarScrimPadding();

    // The search bar keeps the native header translucent, so the sheet has to clear it itself.
    // iOS 26 can hoist the search field into the tab bar, so measure rather than assume its height.
    const nativeChromeOffset = useContext(HeaderHeightContext) ?? 0;
    const nativeSheetStyle = useSheetStyle(nativeChromeOffset);

    useAndroidHomeTabBackHandler(Screens.SEARCH);

    const stateIndex = nav.getState()?.index;
    const serverUrl = useServerUrl();
    const searchTerm: string = stateIndex === undefined ? '' : (nav.getState()?.routes[stateIndex]?.params as any)?.searchTerm || '';

    const clearRef = useRef<boolean>(false);
    const cancelRef = useRef<boolean>(false);
    const searchRef = useRef<SearchRef>(null);
    const nativeSearchRef = useRef<SearchBarCommands>(null);
    const processedSearchTermRef = useRef<string>('');
    const nativeSearchAdapter = useMemo<SearchRef>(() => ({
        blur: () => nativeSearchRef.current?.blur(),
        cancel: () => nativeSearchRef.current?.cancelSearch(),
        clear: () => nativeSearchRef.current?.clearText(),
        focus: () => nativeSearchRef.current?.focus(),
        setCaretPosition: () => {
            // Native search bar does not expose caret placement.
        },
    }), []);
    const modifiersSearchRef = useMemo(() => (
        platformUi ? {current: nativeSearchAdapter} : searchRef
    ), [nativeSearchAdapter, platformUi]);

    const [cursorPosition, setCursorPosition] = useState(searchTerm?.length || 0);
    const [searchValue, setSearchValue] = useState<string>(searchTerm || '');
    const [searchTeamId, setSearchTeamId] = useState<string>(teamId);
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

    const [selectedTab, tabsProps] = useTabs(TabTypes.MESSAGES, tabs, undefined, 'search.tabs');

    useEffect(() => {
        setSearchTeamId(teamId);
    }, [teamId]);

    const onSnap = useCallback((offset: number, animated = true) => {
        scrollRef.current?.scrollToOffset({offset, animated});

    // scrollRef is a ref object, so its reference should not change between renders
    // Also, adding it to the dependency creates a use before define error, circular
    // with the useCollapsibleHeader hook call later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onSnapWithTimeout = useCallback((offset: number, animated = true) => {
        // wait until the keyboard is completely dismissed before scrolling to where the header should be
        setTimeout(() => onSnap(offset, animated), 100);
    }, [onSnap]);

    const {
        headerHeight,
        hideHeader,
        lockValue,
        onScroll,
        scrollEnabled,
        scrollPaddingTop,
        scrollRef,
        scrollValue,
        setAutoScroll,
        unlock,
    } = useCollapsibleHeader<FlatList>(!platformUi, platformUi ? undefined : onSnap);

    const resetToInitial = useCallback(() => {
        setShowResults(false);
        setSearchValue('');
        setLastSearchedValue('');
        setFilter(FileFilters.ALL);
    }, []);

    const clearInputs = useCallback(() => {
        setSearchValue('');
        setLastSearchedValue('');
        setFilter(FileFilters.ALL);
    }, []);

    const handleClearSearch = useCallback(() => {
        clearRef.current = true;
        Keyboard.dismiss();
        if (platformUi) {
            nativeSearchRef.current?.clearText();
            nativeSearchRef.current?.cancelSearch();
        }
        resetToInitial();
    }, [platformUi, resetToInitial]);

    const handleCancelSearch = useCallback(() => {
        cancelRef.current = true;
        resetToInitial();
    }, [resetToInitial]);

    const handleTextChange = useCallback((newValue: string) => {
        setSearchValue(newValue);
        setCursorPosition(newValue.length);
    }, []);

    const handleAutocompleteValue = useCallback((newValue: string) => {
        handleTextChange(newValue);
        if (platformUi) {
            nativeSearchRef.current?.setText(newValue);
        }
    }, [handleTextChange, platformUi]);

    const handleModifierTextChange = useCallback((newValue: string) => {
        setSearchIsFocused(true);
        requestAnimationFrame(() => {
            if (platformUi) {
                nativeSearchRef.current?.setText(newValue);
                nativeSearchRef.current?.focus();
            } else {
                searchRef.current?.focus?.();
            }
            handleTextChange(newValue);
        });
    }, [handleTextChange, platformUi]);

    const handleLoading = useCallback((show: boolean) => {
        (showResults ? setResultsLoading : setLoading)(show);
    }, [showResults]);

    const handleSearch = useCallback(async (newSearchTeamId: string, term: string) => {
        const searchParams = getSearchParams(term, filter);
        if (!searchParams.terms) {
            handleClearSearch();
            return;
        }
        if (!platformUi) {
            hideHeader(true);
        }
        handleLoading(true);
        setLastSearchedValue(term);

        const persistHistory = newSearchTeamId === ALL_TEAMS_ID? undefined: addSearchToTeamSearchHistory(serverUrl, newSearchTeamId, term);
        const [postResults, {files, channels}] = await Promise.all([
            searchPosts(serverUrl, newSearchTeamId, searchParams),
            searchFiles(serverUrl, newSearchTeamId, searchParams),
            persistHistory,
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
    }, [filter, handleClearSearch, handleLoading, hideHeader, platformUi, serverUrl]);

    const onBlur = useCallback(() => {
        setSearchIsFocused(false);
        if (!cancelRef.current && !clearRef.current) {
            onSnapWithTimeout(0);
        }
    }, [onSnapWithTimeout]);

    const onFocus = useCallback(() => {
        setSearchIsFocused(true);
    }, []);

    const onSubmit = useCallback(() => {
        handleSearch(searchTeamId, searchValue);
    }, [handleSearch, searchTeamId, searchValue]);

    const handleRecentSearch = useCallback((text: string) => {
        handleTextChange(text);
        if (platformUi) {
            nativeSearchRef.current?.setText(text);
        }
        handleSearch(searchTeamId, text);
    }, [handleSearch, handleTextChange, platformUi, searchTeamId]);

    const handleFilterChange = useCallback(async (filterValue: FileFilter) => {
        setResultsLoading(true);
        setFilter(filterValue);
        const searchParams = getSearchParams(lastSearchedValue, filterValue);
        const {files, channels} = await searchFiles(serverUrl, searchTeamId, searchParams);
        setFileInfos(files?.length ? files : emptyFileResults);
        setFileChannelIds(channels?.length ? channels : emptyChannelIds);
        setResultsLoading(false);
    }, [lastSearchedValue, searchTeamId, serverUrl]);

    const removeChannelAndUserFiltersFromString = (str: string) => {
        return str.replace(CHANNEL_AND_USER_FILTERS_REGEX, '').trim();
    };

    const updateSearchTeamId = useCallback((newTeamId: string) => {
        setSearchTeamId(newTeamId);
        setSearchValue(removeChannelAndUserFiltersFromString(searchValue));
    }, [searchValue]);

    const handleResultsTeamChange = useCallback((newTeamId: string) => {
        setSearchTeamId(newTeamId);
        const cleanedSearchValue = removeChannelAndUserFiltersFromString(lastSearchedValue);
        setSearchValue(cleanedSearchValue);
        handleSearch(newTeamId, cleanedSearchValue);
    }, [lastSearchedValue, handleSearch]);

    const initialContainerStyle: AnimatedStyle<ViewStyle> = useMemo(() => {
        return {
            paddingTop: platformUi ? 0 : scrollPaddingTop,
            paddingBottom: scrimPadding,
            flexGrow: 1,
            justifyContent: (resultsLoading || loading) ? 'center' : 'flex-start',
            paddingHorizontal: 18,
        };
    }, [loading, platformUi, resultsLoading, scrollPaddingTop, scrimPadding]);

    const renderInitialOrLoadingItem = useCallback(() => {
        return loading ? (
            <Loading
                containerStyle={[styles.loading, {paddingTop: platformUi ? 0 : scrollPaddingTop}]}
                color={theme.buttonBg}
                size='large'
            />
        ) : (
            <Initial
                scrollEnabled={scrollEnabled}
                searchValue={searchValue}
                setRecentValue={handleRecentSearch}
                searchRef={modifiersSearchRef}
                setSearchValue={handleModifierTextChange}
                setTeamId={updateSearchTeamId}
                teamId={searchTeamId}
                teams={teams}
            />
        );
    }, [
        handleModifierTextChange,
        handleRecentSearch,
        loading,
        modifiersSearchRef,
        scrollEnabled,
        scrollPaddingTop,
        searchTeamId,
        searchValue,
        styles.loading,
        teams,
        theme.buttonBg,
        updateSearchTeamId,
        platformUi,
    ]);

    const animated = useAnimatedStyle(() => {
        if (platformUi || isBottomSheetOpen || isPemalinkScreen || isGalleryScreen) {
            return {flex: 1};
        }

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
    }, [isFocused, isBottomSheetOpen, isPemalinkScreen, isGalleryScreen, platformUi, stateIndex]);

    const headerTopStyle = useAnimatedStyle(() => ({
        top: lockValue || headerHeight.value,
        zIndex: lastSearchedValue ? 10 : 0,
    }), [headerHeight, lastSearchedValue, lockValue]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const autocompleteMaxHeight = useDerivedValue(() => {
        const iosAdjust = keyboardHeight ? keyboardHeight - BOTTOM_TAB_HEIGHT : insets.bottom;
        const headerOffset = platformUi ? nativeChromeOffset : headerHeight.value;
        const autocompleteRemoveFromHeight = headerOffset + (Platform.OS === 'ios' ? iosAdjust : 0);
        return containerHeight - autocompleteRemoveFromHeight;
    }, [keyboardHeight, insets.bottom, containerHeight, nativeChromeOffset, platformUi]);

    const autocompletePosition = useDerivedValue(() => {
        if (platformUi) {
            return nativeChromeOffset - AutocompletePaddingTop;
        }
        return headerHeight.value - AutocompletePaddingTop;
    }, [headerHeight, nativeChromeOffset, platformUi]);

    // when clearing the input from the search results, scroll the initial view
    // back to the top so the header is in the collapsed state
    const onFlatLayout = useCallback(() => {
        if (clearRef.current || cancelRef.current) {
            unlock();
            onSnapWithTimeout(0);
        }

        if (clearRef.current) {
            clearRef.current = false;
        } else if (cancelRef.current) {
            cancelRef.current = false;
        }
    }, [unlock, onSnapWithTimeout]);

    useEffect(() => {
        if (!searchTerm || searchTerm === processedSearchTermRef.current) {
            return undefined;
        }

        processedSearchTermRef.current = searchTerm;
        clearInputs();
        setSearchValue(searchTerm);
        if (platformUi) {
            nativeSearchRef.current?.setText(searchTerm);
        }

        const raf = requestAnimationFrame(() => {
            handleSearch(searchTeamId, searchTerm);
        });

        return () => cancelAnimationFrame(raf);
    }, [handleSearch, clearInputs, platformUi, searchTeamId, searchTerm]);

    useDidUpdate(() => {
        if (isFocused) {
            setTimeout(() => {
                setAutoScroll(true);
            }, 300);
        } else {
            setAutoScroll(false);
            processedSearchTermRef.current = '';
        }
    }, [isFocused]);

    useDidUpdate(() => {
        if (searchTerm && searchTerm !== lastSearchedValue) {
            // searchTerm changed (case for hashtag tap) — useEffect handles it; skip to avoid double search
            return;
        }

        if (isFocused && lastSearchedValue && showResults) {
            // requestAnimationFrame for smooth UI updates
            requestAnimationFrame(() => {
                handleSearch(searchTeamId, lastSearchedValue);
            });
        }

        // Only watch isFocused to re-run search when screen comes back into focus
        // Removed lastSearchedValue, showResults, handleSearch, searchTeamId from dependencies
        // to prevent duplicate search calls (these values are updated by handleSearch itself)
    }, [isFocused]);

    const handleEnterPressed = useCallback(() => {
        if (isFocused && searchValue.trim().length > 0) {
            if (platformUi) {
                nativeSearchRef.current?.blur();
            } else {
                searchRef.current?.blur();
            }
            onSubmit();
        }
    }, [isFocused, onSubmit, platformUi, searchValue]);

    const events = useMemo(() => ({onEnterPressed: handleEnterPressed}), [handleEnterPressed]);
    useHardwareKeyboardEvents(events);

    const searchPlaceholder = intl.formatMessage({id: 'screen.search.placeholder', defaultMessage: 'Search messages & files'});
    const onNativeSearchSubmit = useCallback((text: string) => {
        handleSearch(searchTeamId, text);
    }, [handleSearch, searchTeamId]);

    useHomeTabSearchBar({
        enabled: platformUi,
        nativeSearchRef,
        onBlur,
        onCancel: handleCancelSearch,
        onChangeText: handleTextChange,
        onFocus,
        onSubmit: onNativeSearchSubmit,
        placeholder: searchPlaceholder,
        tintColor: theme.centerChannelColor,
    });

    const resultsHeader = lastSearchedValue && !loading ? (
        <Header
            teamId={searchTeamId}
            setTeamId={handleResultsTeamChange}
            onFilterChanged={handleFilterChange}
            selectedTab={selectedTab}
            selectedFilter={filter}
            teams={teams}
            crossTeamSearchEnabled={crossTeamSearchEnabled}
            tabsProps={tabsProps}
        />
    ) : null;

    const listContent = (
        <>
            {!showResults &&
            <Animated.FlatList
                onLayout={onFlatLayout}
                data={dummyData}
                contentContainerStyle={initialContainerStyle}
                contentInsetAdjustmentBehavior='never'
                keyboardShouldPersistTaps='handled'
                keyboardDismissMode={'interactive'}
                nestedScrollEnabled={true}
                indicatorStyle='black'
                onScroll={platformUi ? undefined : onScroll}
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
                scrollPaddingTop={platformUi ? 0 : lockValue}
                fileChannelIds={fileChannelIds}
            />
            }
        </>
    );

    return (
        <>
            <SafeAreaView
                style={styles.flex}
                edges={EDGES}
                onLayout={onLayout}
                testID='search_messages.screen'
            >
                {!platformUi && (
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
                        placeholder={searchPlaceholder}
                        onBlur={onBlur}
                        onClear={handleClearSearch}
                        onCancel={handleCancelSearch}
                        onFocus={onFocus}
                        defaultValue={searchValue}
                        ref={searchRef}
                    />
                )}
                <KeyboardAvoidingView
                    style={styles.flex}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <Animated.View style={animated}>
                        {platformUi ? (
                            <View style={nativeSheetStyle}>
                                {resultsHeader}
                                {listContent}
                                <SheetTabBarScrim/>
                            </View>
                        ) : (
                            <>
                                <Animated.View style={headerTopStyle}>
                                    <RoundedHeaderContext/>
                                    {resultsHeader}
                                </Animated.View>
                                {listContent}
                            </>
                        )}
                    </Animated.View>
                </KeyboardAvoidingView>
            </SafeAreaView>
            {searchIsFocused &&
            <Autocomplete
                updateValue={handleAutocompleteValue}
                cursorPosition={cursorPosition}
                value={searchValue}
                isSearch={true}
                shouldDirectlyReact={false}
                availableSpace={autocompleteMaxHeight}
                position={autocompletePosition}
                growDown={true}
                containerStyle={styles.autocompleteContainer}
                teamId={searchTeamId}
            />
            }
        </>
    );
};

export default SearchScreen;
