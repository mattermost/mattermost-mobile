// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useNavigation} from '@react-navigation/native';
import {debounce} from 'lodash';
import React, {useCallback, useState, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView, Text, View} from 'react-native';
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
import Loader from './results/loader';

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

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const EDGES: Edge[] = ['bottom', 'left', 'right'];

const emptyFileResults: {[id: string]: FileInfo} = {};
const emptyPostResults: string[] = [];

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
    const [selectedTab, setSelectedTab] = useState<SelectTab>('messages');
    const [filter, setFilter] = useState<FileFilter>('All file types');

    const [loading, setLoading] = useState(false);
    const [lastSearchedValue, setLastSearchedValue] = useState('');

    const [postIds, setPostIds] = useState<string[]>(emptyPostResults);
    const [fileInfos, setFileInfos] = useState<{[id: string]: FileInfo}>(emptyFileResults);
    const [filteredFileInfos, setFilteredFileInfos] = useState<{[id: string]: FileInfo}>(emptyFileResults);

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

        if (postResults?.order && Object.keys(postResults.order)) {
            setPostIds(postResults.order);
        } else {
            setPostIds(emptyPostResults);
        }

        if (fileResults?.file_infos && Object.keys(fileResults.file_infos)) {
            setFileInfos(fileResults.file_infos);
        } else {
            setFileInfos(emptyFileResults);
        }

        setLoading(false);
    })), [searchValue, setPostIds]);

    const onSnap = (y: number) => {
        scrollRef.current?.scrollTo({y, animated: true});
    };

    useEffect(() => {
        setSearchValue(searchTerm);
    }, [searchTerm]);

    useEffect(() => {
        setFilteredFileInfos(filterFiles(fileInfos, filter));
    }, [filter, fileInfos]);

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll, headerHeight, hideHeader} = useCollapsibleHeader<ScrollView>(true, onSnap);
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop, flexGrow: 1}), [scrollPaddingTop]);

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

    const top = useAnimatedStyle(() => {
        return {
            top: headerHeight.value,
            zIndex: searchValue ? 10 : 0,
        };
    }, [searchValue]);

    let content = notImplementedComponent;
    if (lastSearchedValue) {
        if (loading) {
            content = (<Loader/>);
        } else {
            content = (
                <Results
                    selectedTab={selectedTab}
                    searchValue={lastSearchedValue}
                    postIds={postIds}
                    fileInfos={filteredFileInfos}
                />
            );
        }
    }

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
                style={{flex: 1}}
                edges={EDGES}
            >
                <Animated.View style={animated}>
                    <Animated.View style={top}>
                        <RoundedHeaderContext/>
                        {header}
                    </Animated.View>
                    <AnimatedScrollView
                        contentContainerStyle={paddingTop}
                        nestedScrollEnabled={true}
                        scrollToOverflowEnabled={true}
                        showsVerticalScrollIndicator={false}
                        indicatorStyle='black'
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        removeClippedSubviews={true}
                        ref={scrollRef}
                    >
                        {content}
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
