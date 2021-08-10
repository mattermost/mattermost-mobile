// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, useWindowDimensions, View} from 'react-native';
import {Navigation} from 'react-native-navigation';

import TouchableWithFeedback from '@components/touchable_with_feedback';

//todo: pass a config object and map through array to create tab buttons

type BottomTabBarProps = {};
const BottomTabBar = (props: BottomTabBarProps) => {
    const dimensions = useWindowDimensions();
    const buttonStyle = {
        width: dimensions.width / 4,
        backgroundColor: '#f89955',
        height: 84,
    };
    const centerContent = {justifyContent: 'center', alignItems: 'center'};

    return (
        <View
            style={{
                width: dimensions.width,
                height: 84,
                backgroundColor: 'white',
                flexDirection: 'row',
                justifyContent: 'space-around',
                position: 'absolute',
                bottom: 0,
            }}
        >
            <View style={buttonStyle}>
                <TouchableWithFeedback
                    underlayColor={'white'}
                    disabled={false}
                    onPress={() => {
                        console.log('>>> pressing home tab ');
                        return Navigation.mergeOptions('tab_home_stack', {
                            bottomTabs: {currentTabIndex: 0},
                        });
                    }}
                    style={[buttonStyle, centerContent]}
                >
                    <Text>{'A'}</Text>
                </TouchableWithFeedback>
            </View>
            <View style={buttonStyle}>
                <TouchableWithFeedback
                    underlayColor={'white'}
                    disabled={false}
                    onLongPress={() => null}
                    onPress={() => {
                        console.log('>>> pressing search tab ');
                        return Navigation.mergeOptions('tab_search_stack', {
                            bottomTabs: {currentTabIndex: 1},
                        });
                    }}
                    style={[buttonStyle, centerContent]}
                >
                    <Text>{'B'}</Text>
                </TouchableWithFeedback>
            </View>
            <View style={buttonStyle}>
                <TouchableWithFeedback
                    disabled={false}
                    underlayColor={'white'}
                    onLongPress={() => null}
                    onPress={() => {
                        console.log('>>> pressing mention tab ');
                        return Navigation.mergeOptions('tab_mention_stack', {
                            bottomTabs: {currentTabIndex: 2},
                        });
                    }}
                    style={[buttonStyle, centerContent]}
                >
                    <Text>{'C'}</Text>
                </TouchableWithFeedback>
            </View>
            <View style={buttonStyle}>
                <TouchableWithFeedback
                    disabled={false}
                    onLongPress={() => null}
                    underlayColor={'white'}
                    onPress={() => {
                        console.log('>>> pressing user tab ');
                        return Navigation.mergeOptions('tab_user_stack', {
                            bottomTabs: {currentTabIndex: 3},
                        });
                    }}
                    style={[buttonStyle, centerContent]}
                >
                    <Text>{'D'}</Text>
                </TouchableWithFeedback>
            </View>
        </View>
    );
};

export default BottomTabBar;
