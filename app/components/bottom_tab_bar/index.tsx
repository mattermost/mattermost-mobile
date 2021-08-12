// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TouchableWithFeedback from '@components/touchable_with_feedback';
import {TabBarStacks} from '@constants/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import React from 'react';
import {Text, useWindowDimensions, View} from 'react-native';
import {Navigation} from 'react-native-navigation';

//todo: pass a config object and map through array to create tab buttons

type BottomTabBarProps = {
    theme: Theme;
};

const BottomTabBar = ({theme}: BottomTabBarProps) => {
    const dimensions = useWindowDimensions();
    const tabWidth = dimensions.width / 4;
    const styles = getStyleSheet(theme);
    const buttonStyle = [styles.buttonStyle, {width: tabWidth}];
    const centerContent = {justifyContent: 'center', alignItems: 'center'};

    return (
        <View style={[styles.container, styles.shadow]}>
            <View style={buttonStyle}>
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
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        width: '100%',
        height: 84,

        // backgroundColor: theme.centerChannelBg,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    buttonStyle: {
        height: 84,
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
