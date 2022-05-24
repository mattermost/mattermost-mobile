// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useNavigation} from '@react-navigation/native';
import React, {useCallback, useState, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView, StyleSheet} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import FreezeScreen from '@components/freeze_screen';
import NavigationHeader from '@components/navigation_header';
import {useCollapsibleHeader} from '@hooks/header';

// import RecentSearches from './recent_searches/recent_searches';
// import SearchModifiers from './search_modifiers/search_modifiers';
// import Filter from './results/filter';
import Header, {SelectTab} from './results/header';
import Results from './results/results';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const EDGES: Edge[] = ['bottom', 'left', 'right'];

const styles = StyleSheet.create({
    grow: {
        flexGrow: 1,
    },
});

const TOP_MARGIN = 12;

const SearchScreen = () => {
    const nav = useNavigation();
    const isFocused = useIsFocused();
    const intl = useIntl();
    const insets = useSafeAreaInsets();
    const searchScreenIndex = 1;
    const stateIndex = nav.getState().index;
    const {searchTerm} = nav.getState().routes[stateIndex].params;

    const [searchValue, setSearchValue] = useState<string>(searchTerm);
    const [selectedTab, setSelectedTab] = useState<string>('messages');

    useEffect(() => {
        setSearchValue(searchTerm);
    }, [searchTerm]);

    const handleSearch = () => {
        // execute the search for the text in the navigation text box
        // handle recent searches
        // - add recent if doesn't exist
        // - updated recent createdAt if exists??

        // console.log('execute the search for : ', searchValue);
    };

    const isLargeTitle = true;
    const hasSearch = true;

    const {scrollPaddingTop, scrollRef, headerPosition, onScroll, setHeaderVisibility} = useCollapsibleHeader<ScrollView>(isLargeTitle, false, hasSearch);

    const onHeaderTabSelect = useCallback((tab: SelectTab) => {
        setSelectedTab(tab);
    }, [setSelectedTab]);

    const animated = useAnimatedStyle(() => {
        if (isFocused) {
            return {
                opacity: withTiming(1, {duration: 150}),
                marginTop: (scrollPaddingTop + TOP_MARGIN) - headerPosition.value,
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
    }, [isFocused, stateIndex, insets.top]);

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
                headerPosition={headerPosition}
                setHeaderVisibility={setHeaderVisibility}
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
                    <Header
                        onTabSelect={onHeaderTabSelect}
                        numberFiles={0}
                        numberMessages={0}
                    />
                    <AnimatedScrollView
                        contentContainerStyle={styles.grow}
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
                        />
                        {/* <Filter/> */}
                    </AnimatedScrollView>
                </Animated.View>
            </SafeAreaView>
        </FreezeScreen>
    );
};

export default SearchScreen;

