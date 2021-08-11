// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {Platform, Text, View} from 'react-native';
import {Navigation} from 'react-native-navigation';
import Animated, {useAnimatedStyle, useSharedValue, withTiming, runOnJS} from 'react-native-reanimated';
import {goToScreen, showModal} from '@screens/navigation';

import BottomTabBar from './bottom_tab_bar';

const Placeholder = (props: any) => {
    let backgroundColor: string;
    const {componentId} = props;

    const [isFocused, setIsFocused] = useState(true);

    useEffect(() => {
        const listener = {
            componentDidAppear: () => {
                // eslint-disable-next-line no-console
                console.log('componentDidAppear', `>>> ${componentId} on ${Platform.OS} <<<`);
                setIsFocused(true);
            },
            componentDidDisappear: () => {
                // eslint-disable-next-line no-console
                console.log('componentDidDisappear', `>>> ${componentId} on ${Platform.OS} <<<`);
                setIsFocused(false);
            },
        };

        // Register the listener to all events related to our component
        const unsubscribe = Navigation.events().registerComponentListener(listener, props.componentId);
        return () => {
            // unregister the listener during cleanup
            unsubscribe.remove();
        };
    }, []);

    switch (componentId) {
        case 'TAB_HOME_': {
            backgroundColor = 'grey';
            break;
        }
        case 'TAB_USER_': {
            backgroundColor = 'blue';
            break;
        }
        case 'TAB_SEARCH_': {
            backgroundColor = 'brown';
            break;
        }
        default: {
            backgroundColor = 'green';
            break;
        }
    }

    const animatedValue = useSharedValue(0);

    const navigateTo = () => {
        return goToScreen('Placeholder2', 'Channel', {as: 'screen'});
    };

    const animatedTabbarStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateY: withTiming(
                        animatedValue.value,
                        {duration: 650},
                        (isFinished) => {
                            if (isFinished) {
                                if (animatedValue.value > 0) {
                                    runOnJS(navigateTo)();
                                }
                                animatedValue.value = 0;
                            }
                        },
                    ),
                },
            ],
        };
    }, []);

    const renderOnHomeOnly = () => {
        return (
            <View style={{marginTop: 30, alignItems: 'center'}}>
                <Text
                    style={{marginBottom: 15}}
                    onPress={() => {
                        return showModal('Placeholder2', 'modal', {
                            as: 'modal',
                        });
                    }}
                >
                    {'Open Modal'}
                </Text>
                <Text
                    onPress={() => {
                        animatedValue.value = 100;
                    }}
                >
                    {'Go to another screen'}
                </Text>
            </View>
        );
    };

    const renderBody = () => {
        if (componentId !== 'TAB_HOME_' && !isFocused) {
            console.log('returning null for', `>>> ${componentId} on ${Platform.OS} <<<`);
            return null;
        }

        return [
            <View
                testID='placeholder.screen'
                key='placeholder.screen'
                style={{
                    backgroundColor,
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Text
                    style={{color: 'white', fontSize: 30}}
                >{` ${componentId} Screen `}</Text>
                {componentId === 'TAB_HOME_' && renderOnHomeOnly()}
            </View>,
            <Animated.View
                key='bottom.tabbar'
                style={animatedTabbarStyle}
            >
                <BottomTabBar/>
            </Animated.View>,
        ];
    };

    return renderBody();
};

Placeholder.options = {
    topBar: {
        visible: false,
        title: {
            color: '#fff',
            text: '1st screen',
        },
    },
};

export default Placeholder;
