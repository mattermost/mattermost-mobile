// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIsFocused, useNavigation} from '@react-navigation/native';
import React, {useMemo} from 'react';
import {Text, FlatList, View, Platform} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

import Badge from '@components/badge';
import NavigationHeader from '@components/navigation_header';
import {useTheme} from '@context/theme';
import {useCollapsibleHeader} from '@hooks/header';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const SearchScreen = () => {
    const nav = useNavigation();
    const isFocused = useIsFocused();
    const theme = useTheme();
    const searchScreenIndex = 1;
    const stateIndex = nav.getState().index;

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

    const {scrollPaddingTop, scrollRef, scrollValue, onScroll} = useCollapsibleHeader<FlatList<string>>(true, false, true);
    const paddingTop = useMemo(() => ({paddingTop: scrollPaddingTop}), [scrollPaddingTop]);
    const data = [
        'Search Screen 1',
        'Search Screen 2',
        'Search Screen 3',
        'Search Screen 4',
        'Search Screen 5',
    ];

    return (
        <>
            <NavigationHeader
                isLargeTitle={true}
                leftComponent={(
                    <View>
                        <Badge
                            type='Small'
                            visible={true}
                            value={1}
                            style={{top: 0, left: 2, position: 'relative'}}
                            borderColor='transparent'
                        />
                    </View>
                )}
                onBackPress={() => {
                    // eslint-disable-next-line no-console
                    console.log('BACK');
                }}
                rightButtons={[{
                    iconName: 'magnify',
                    onPress: () => true,
                }, {
                    iconName: Platform.select({android: 'dots-vertical', default: 'dots-horizontal'}),
                    onPress: () => true,
                    rippleRadius: 15,
                    borderless: true,
                    buttonType: 'opacity',
                }]}
                showBackButton={true}
                subtitle='Search messages across teams'
                title='Search'
                hasSearch={true}
                scrollValue={scrollValue}
                forwardedRef={scrollRef}
                onChangeText={(text) => {
                    // eslint-disable-next-line no-console
                    console.log('Search for value', text);
                }}
                onSubmitEditing={() => {
                    // eslint-disable-next-line no-console
                    console.log('Execute search');
                }}
                blurOnSubmit={true}
            />
            <SafeAreaView
                style={{flex: 1}}
                edges={['bottom', 'left', 'right']}
            >
                <Animated.View style={[{flex: 1}, animated]}>
                    <AnimatedFlatList
                        contentContainerStyle={paddingTop}
                        data={data}
                        scrollToOverflowEnabled={true}
                        showsVerticalScrollIndicator={false}
                        indicatorStyle='black'
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        ref={scrollRef}
                        renderItem={({item, index}) => {
                            const height = index === data.length - 1 ? undefined : 400;
                            return (
                                <View style={{flex: 1, alignItems: 'center'}}>
                                    <Text style={{fontSize: 20, color: theme.centerChannelColor, height}}>{item as string}</Text>
                                </View>
                            );
                        }}
                    />
                </Animated.View>
            </SafeAreaView>
        </>
    );
};

export default SearchScreen;

