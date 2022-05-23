// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useNavigation} from '@react-navigation/native';
import {debounce} from 'lodash';
import React, {useCallback, useMemo, useState, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import FreezeScreen from '@components/freeze_screen';
import NavigationHeader from '@components/navigation_header';
import {useServerUrl} from '@context/server';
import {useCollapsibleHeader} from '@hooks/header';
import NetworkManager from '@managers/network_manager';

// import RecentSearches from './recent_searches/recent_searches';
// import SearchModifiers from './search_modifiers/search_modifiers';
// import Filter from './results/filter';
import Header, {MessageTab, SelectTab} from './results/header';
import Results from './results/results';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const emptyPostResults: Post[] = [];
const emptyFilesResults: FileInfo[] = [];

type Props = {
    currentTeamId: string;
}

const SearchScreen = ({currentTeamId}: Props) => {
    const nav = useNavigation();
    const isFocused = useIsFocused();
    const intl = useIntl();
    const insets = useSafeAreaInsets();
    const searchScreenIndex = 1;
    const stateIndex = nav.getState().index;
    const {searchTerm} = nav.getState().routes[stateIndex].params;
    const serverUrl = useServerUrl();

    const [searchValue, setSearchValue] = useState<string>(searchTerm);
    const [selectedTab, setSelectedTab] = useState<SelectTab>(MessageTab);
    const [postResults, setPostResults] = useState<Post[]>(emptyPostResults);
    const [fileResults, setFilesResults] = useState<FileInfo[]>(emptyFilesResults);

    useEffect(() => {
        setSearchValue(searchTerm);
    }, [searchTerm]);

    const handleSearch = () => {
        runSearch();
    };

    const runSearch = useCallback(debounce(async () => {
        console.log('searchValue', searchValue);
        try {
            const client = NetworkManager.getClient(serverUrl);
            console.log('currentTeamId', currentTeamId);
            const [pResults, fResults] = await Promise.all([
                client.searchPosts(currentTeamId, 'abc', true),
                client.searchFiles(currentTeamId, searchValue),
            ]);
            setPostResults(pResults);
            setFilesResults(fResults);
        } catch {
            // do nothing
        }

        console.log('postResults', postResults);
        console.log('fileResults', fileResults);

        //
        // if (pResults?.posts && Object.keys(pResults.posts)) {
        //     setPostResults(Object.values(postResults.posts));
        // } else {
        //     setPostResults(emptyPostResults);
        // }

    //     setLoading(false);
    }, 200), []);

    // const handleSearch = () => {
    // execute the search for the text in the navigation text box
    // handle recent searches
    // - add recent if doesn't exist
    // - updated recent createdAt if exists??

    // console.log('execute the search for : ', searchValue);
    // };

    const isLargeTitle = true;
    const hasSearch = true;

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll} = useCollapsibleHeader<ScrollView>(isLargeTitle, false, hasSearch);
    const animated = useAnimatedStyle(() => {
        if (isFocused) {
            return {
                opacity: withTiming(1, {duration: 150}),
                marginTop: scrollPaddingTop,
                flex: 1,
                transform: [
                    {translateX: withTiming(0, {duration: 150})},
                    {translateY: -Math.min(scrollValue.value, insets.top)},
                ],
            };
        }

        return {
            opacity: withTiming(0, {duration: 150}),
            transform: [{translateX: withTiming(stateIndex < searchScreenIndex ? 25 : -25, {duration: 150})}],
        };
    }, [isFocused, stateIndex, insets.top]);
    const paddingTop = useMemo(() => ({flexGrow: 1}), [scrollPaddingTop]);

    const onHeaderSelect = useCallback((value: SelectTab) => {
        setSelectedTab(value);
    }, [setSelectedTab]);

    return (
        <FreezeScreen freeze={!isFocused}>
            <NavigationHeader
                isLargeTitle={isLargeTitle}
                onBackPress={() => {
                    // eslint-disable-next-line no-console
                    console.log('BACK');
                }}
                showBackButton={false}
                title={intl.formatMessage({id: 'screen.search.title', defaultMessage: 'Search'})}
                hasSearch={hasSearch}
                scrollValue={scrollValue}
                forwardedRef={scrollRef}
                onChangeText={setSearchValue}
                onSubmitEditing={runSearch}
                blurOnSubmit={true}
                placeholder={intl.formatMessage({id: 'screen.search.placeholder', defaultMessage: 'Search messages & files'})}
                defaultValue={searchValue}
            />
            <SafeAreaView
                style={{flex: 1}}
                edges={['bottom', 'left', 'right']}
            >
                <Animated.View style={animated}>
                    <Header
                        onHeaderSelect={onHeaderSelect}
                        numberFiles={0}
                        numberMessages={0}
                    />
                    <AnimatedScrollView
                        contentContainerStyle={paddingTop}
                        nestedScrollEnabled={true}
                        scrollToOverflowEnabled={true}
                        showsVerticalScrollIndicator={false}
                        indicatorStyle='black'
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        ref={scrollRef}
                    >
                        {/* <SearchModifiers */}
                        {/*     setSearchValue={setSearchValue} */}
                        {/*     searchValue={searchValue} */}
                        {/* /> */}
                        {/* <RecentSearches */}
                        {/*     setSearchValue={setSearchValue} */}
                        {/* /> */}
                        <Results
                            selectedTab={selectedTab}
                            searchValue={searchValue}
                            fileResults={fileResults}
                            postResults={postResults}
                        />
                        {/* <Filter/> */}
                    </AnimatedScrollView>
                </Animated.View>
            </SafeAreaView>
        </FreezeScreen>
    );
};

export default SearchScreen;

