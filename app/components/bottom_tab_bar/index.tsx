// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {forwardRef, useImperativeHandle, useRef} from 'react';
import {Text, useWindowDimensions, View} from 'react-native';
import {Navigation} from 'react-native-navigation';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import TouchableWithFeedback from '@components/touchable_with_feedback';
import {TabBarHeight, TabBarStacks} from '@constants/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';

//todo: pass a config object and map through array to create tab buttons

type BottomTabBarProps = {
    theme: Theme;
};

const BottomTabBar = forwardRef((props: BottomTabBarProps, ref) => {
    const dimensions = useWindowDimensions();
    const hideFlag = useRef<boolean>(false);
    const tabRef = useRef<Animated.View>();

    const animatedValue = useSharedValue(0);

    const animatedTabbarStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateY: withTiming(
                        animatedValue.value,
                        {
                            duration: 250,
                        },
                    ),
                },
            ],
        };
    }, []);

    useImperativeHandle(ref, () => ({
        animate: () => {
            animatedValue.value = hideFlag?.current ? 0 : TabBarHeight;
            hideFlag.current = !hideFlag.current;
        },
    }));

    const tabWidth = dimensions.width / 4;
    const styles = getStyleSheet(props.theme);
    const buttonStyle = [styles.buttonStyle, {width: tabWidth}];
    const centerContent = {justifyContent: 'center', alignItems: 'center'};

    return (
        <Animated.View
            style={[styles.container, styles.shadow, animatedTabbarStyle]}
            ref={tabRef}
        >
            <View
                style={buttonStyle}

            >
                <TouchableWithFeedback
                    underlayColor={'white'}
                    disabled={false}
                    onPress={() => {
                        return Navigation.mergeOptions(TabBarStacks.TAB_HOME, {
                            bottomTabs: {currentTabIndex: 0},
                        });
                    }}
                    style={[buttonStyle, centerContent]}
                >
                    <Text>{'Home'}</Text>
                </TouchableWithFeedback>
            </View>
            <View style={buttonStyle}>
                <TouchableWithFeedback
                    underlayColor={'white'}
                    disabled={false}
                    onLongPress={() => null}
                    onPress={() => {
                        return Navigation.mergeOptions(TabBarStacks.TAB_SEARCH, {
                            bottomTabs: {currentTabIndex: 1},
                        });
                    }}
                    style={[buttonStyle, centerContent]}
                >
                    <Text>{'Search'}</Text>
                </TouchableWithFeedback>
            </View>
            <View style={buttonStyle}>
                <TouchableWithFeedback
                    disabled={false}
                    underlayColor={'white'}
                    onLongPress={() => null}
                    onPress={() => {
                        return Navigation.mergeOptions(TabBarStacks.TAB_MENTION, {
                            bottomTabs: {currentTabIndex: 2},
                        });
                    }}
                    style={[buttonStyle, centerContent]}
                >
                    <Text>{'Mention'}</Text>
                </TouchableWithFeedback>
            </View>
            <View style={buttonStyle}>
                <TouchableWithFeedback
                    disabled={false}
                    onLongPress={() => null}
                    underlayColor={'white'}
                    onPress={() => {
                        return Navigation.mergeOptions(TabBarStacks.TAB_ACCOUNT, {
                            bottomTabs: {currentTabIndex: 3},
                        });
                    }}
                    style={[buttonStyle, centerContent]}
                >
                    <Text>{'Account'}</Text>
                </TouchableWithFeedback>
            </View>
        </Animated.View>
    );
});

const getStyleSheet = makeStyleSheetFromTheme(() => ({
    container: {
        width: '100%',
        height: 84,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    buttonStyle: {
        height: TabBarHeight,
    },
    shadow: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: 8,
        },
    },
}));

export default BottomTabBar;
