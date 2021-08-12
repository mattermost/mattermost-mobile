// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {Platform, Text, View} from 'react-native';
import {Navigation} from 'react-native-navigation';

import BottomTabBar from '@components/bottom_tab_bar';
import {useTheme} from '@context/theme';
import {goToScreen, showModal} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';

const Home = (props: any) => {
    const {componentId} = props;

    const theme = useTheme();
    const styles = getStyleSheet(theme);

    useEffect(() => {
        const listener = {
            componentDidAppear: () => {
                // eslint-disable-next-line no-console
                console.log('componentDidAppear', `>>> ${componentId} on ${Platform.OS} <<<`);
            },
            componentDidDisappear: () => {
                // eslint-disable-next-line no-console
                console.log('componentDidDisappear', `>>> ${componentId} on ${Platform.OS} <<<`);
            },
        };

        const unsubscribe = Navigation.events().registerComponentListener(listener, props.componentId);
        return () => {
            unsubscribe.remove();
        };
    }, []);

    return (
        <View
            style={styles.container}
            testID='home.screen'
        >
            <View
                key='home.body.screen'
            >
                <Text style={styles.screenTitle}>{` ${componentId} `}</Text>
                <View style={styles.textContainer}>
                    <Text
                        style={{marginBottom: 15}}
                        onPress={() => {
                            return showModal('Channel', 'modal', {as: 'modal'});
                        }}
                    >
                        {'Open Modal'}
                    </Text>
                    <Text
                        onPress={() => {
                            return goToScreen('Channel', 'Channel', {as: 'screen'});
                        }}
                    >
                        {'Go to another screen'}
                    </Text>
                </View>
            </View>
            <View
                key='bottom.tabbar'
                style={styles.tabContainer}
            >
                <BottomTabBar theme={theme}/>
            </View>
        </View>
    );
};

Home.options = {
    topBar: {
        visible: false,
    },
};

const getStyleSheet = makeStyleSheetFromTheme((theme) => ({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: theme.centerChannelBg,
    },
    tabContainer: {
        position: 'absolute',
        bottom: 0,
    },
    textContainer: {
        marginTop: 30,
        alignItems: 'center',
    },
    screenTitle: {
        fontSize: 30,
        alignSelf: 'center',
    },
}));

export default Home;
