// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useNavigation} from '@react-navigation/native';
import React, {useMemo, useState, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {Text, ScrollView, View} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import FreezeScreen from '@components/freeze_screen';
import NavigationHeader from '@components/navigation_header';
import {useTheme} from '@context/theme';
import {useCollapsibleHeader} from '@hooks/header';

import SearchModifiers from './search_modifiers/search_modifiers';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const SearchScreen = () => {
    const nav = useNavigation();
    const isFocused = useIsFocused();
    const theme = useTheme();
    const intl = useIntl();
    const searchScreenIndex = 1;
    const stateIndex = nav.getState().index;
    const {searchTerm} = nav.getState().routes[stateIndex].params;

    const [searchValue, setSearchValue] = useState<string>(searchTerm);

    useEffect(() => {
        setSearchValue(searchTerm);
    }, [searchTerm]);

    const animated = useAnimatedStyle(() => {
        if (isFocused) {
            return {
                opacity: withTiming(1, {duration: 150}),
                transform: [{translateX: withTiming(0, {duration: 150})}],
            };
        }

        return {
            opacity: withTiming(0, {duration: 150}),
            transform: [{translateX: withTiming(stateIndex < searchScreenIndex ? 25 : -25, {duration: 150})}],
        };
    }, [isFocused, stateIndex]);

    const isLargeTitle = true;
    const hasSearch = true;

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll} = useCollapsibleHeader<ScrollView>(isLargeTitle, false, hasSearch);
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop}), [scrollPaddingTop]);

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
                onSubmitEditing={() => {
                    // eslint-disable-next-line no-console
                    console.log('Execute search');
                }}
                blurOnSubmit={true}
                placeholder={intl.formatMessage({id: 'screen.search.placeholder', defaultMessage: 'Search messages & files'})}
                value={searchValue}
            />
            <SafeAreaView
                style={{flex: 1}}
                edges={['bottom', 'left', 'right']}
            >
                <Animated.View style={[{flex: 1}, animated]}>
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
                        <SearchModifiers
                            setSearchValue={setSearchValue}
                            searchValue={searchValue}
                        />
                    </AnimatedScrollView>
                </Animated.View>
            </SafeAreaView>
        </FreezeScreen>
    );
};

export default SearchScreen;

