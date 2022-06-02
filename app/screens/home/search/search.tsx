// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useNavigation} from '@react-navigation/native';
import {debounce} from 'lodash';
import React, {useCallback, useState, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {searchPosts, searchFiles} from '@actions/remote/search';
import FreezeScreen from '@components/freeze_screen';
import NavigationHeader from '@components/navigation_header';
import {useServerUrl} from '@context/server';
import {useCollapsibleHeader} from '@hooks/header';

// import RecentSearches from './recent_searches/recent_searches';
// import SearchModifiers from './search_modifiers/search_modifiers';
// import Filter from './results/filter';
import Results from './results';
import {SelectTab} from './results/header';
import Loader from './results/loader';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const EDGES: Edge[] = ['bottom', 'left', 'right'];

const TOP_MARGIN = 12;

const emptyFileResults: FileInfo[] = [];

type Props = {
    teamId: string;
}

const SearchScreen = ({teamId}: Props) => {
    const nav = useNavigation();
    const isFocused = useIsFocused();
    const intl = useIntl();
    const searchScreenIndex = 1;
    const stateIndex = nav.getState().index;
    const serverUrl = useServerUrl();
    const {searchTerm} = nav.getState().routes[stateIndex].params;

    const [searchValue, setSearchValue] = useState<string>(searchTerm);
    const [selectedTab, setSelectedTab] = useState<string>('messages');
    const [loading, setLoading] = useState<boolean>(false);

    const [postIds, setPostIds] = useState<string[]>([]);
    const [fileInfos, setFileInfos] = useState<FileInfo[]>([]);
    const [files, setFileResults] = useState<FileInfo[]>(emptyFileResults);

    useEffect(() => {
        setSearchValue(searchTerm);
    }, [searchTerm]);

    const handleSearch = useCallback((debounce(async () => {
        // execute the search for the text in the navigation text box
        // handle recent searches
        // - add recent if doesn't exist
        // - updated recent createdAt if exists??

        setLoading(true);

        const searchParams: PostSearchParams | FileSearchParams = {
            terms: searchValue,
            is_or_search: true,
        };

        const [postResults, fileResults] = await Promise.all([
            searchPosts(serverUrl, searchParams),
            searchFiles(serverUrl, teamId, searchParams),
        ]);

        if (postResults?.order && Object.keys(postResults.order)) {
            setPostIds(postResults.order);
        } else {
            setPostIds([]);
        }

        if (fileResults?.file_infos && Object.keys(fileResults.file_infos)) {
            setFileInfos(fileResults.file_infos);
        } else {
            setFileInfos([]);
        }

        setLoading(false);
    })), [searchValue, files, setFileResults, setPostIds]);

    const isLargeTitle = true;
    const hasSearch = true;

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll, hideHeader} = useCollapsibleHeader<ScrollView>(isLargeTitle, false, hasSearch);

    const onHeaderTabSelect = useCallback((tab: SelectTab) => {
        setSelectedTab(tab);
    }, [setSelectedTab]);

    const animated = useAnimatedStyle(() => {
        if (isFocused) {
            return {
                opacity: withTiming(1, {duration: 150}),
                flex: 1,
                transform: [
                    {translateX: withTiming(0, {duration: 150})},
                ],
            };
        }

        return {
            opacity: withTiming(0, {duration: 150}),
            transform: [{translateX: withTiming(stateIndex < searchScreenIndex ? 25 : -25, {duration: 150})}],

        };
    }, [isFocused, stateIndex, scrollPaddingTop]);

    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop + TOP_MARGIN, flexGrow: 1}), [scrollPaddingTop]);

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
                hideHeader={hideHeader}
                onChangeText={setSearchValue}
                onSubmitEditing={handleSearch}
                blurOnSubmit={true}
                placeholder={intl.formatMessage({id: 'screen.search.placeholder', defaultMessage: 'Search messages & files'})}
                defaultValue={searchValue}
            />
            <SafeAreaView
                style={{flex: 1}}
                edges={EDGES}
            >
                <Animated.View style={animated}>
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
                        {loading && <Loader/>}
                        {!loading &&
                        <Results
                            scrollRef={scrollRef}
                            selectedTab={selectedTab}
                            searchValue={searchValue}
                            onHeaderTabSelect={onHeaderTabSelect}
                            postIds={postIds}
                            fileInfos={fileInfos}
                        />
                        }
                        {/* <SearchModifiers */}
                        {/*     setSearchValue={setSearchValue} */}
                        {/*     searchValue={searchValue} */}
                        {/* /> */}
                        {/* <RecentSearches */}
                        {/*     setSearchValue={setSearchValue} */}
                        {/* /> */}
                        {/* <Filter/> */}
                    </AnimatedScrollView>
                </Animated.View>
            </SafeAreaView>
        </FreezeScreen>
    );
};

export default SearchScreen;

