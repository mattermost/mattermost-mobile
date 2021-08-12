// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef} from 'react';
import {Platform, Text, View} from 'react-native';
import {Navigation, NavigationComponentProps} from 'react-native-navigation';
import {SafeAreaView} from 'react-native-safe-area-context';

import BottomTabBar from '@components/bottom_tab_bar';
import {goToScreen, showModal} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';

type HomeProps = NavigationComponentProps & {
    theme: Theme;
}

const Home = ({componentId, theme}: HomeProps) => {
    const tabRef = useRef<typeof BottomTabBar>();
    const styles = getStyleSheet(theme);

    useEffect(() => {
        const listener = {
            componentDidAppear: () => {
                // eslint-disable-next-line no-console
                console.log('componentDidAppear', `>>> ${componentId} on ${Platform.OS} <<<`);

                // @ts-expect-error: animate() exists on the BottomTabBar component
                tabRef?.current?.animate();
            },
            componentDidDisappear: () => {
                // eslint-disable-next-line no-console
                console.log('componentDidDisappear', `>>> ${componentId} on ${Platform.OS} <<<`);
            },
        };

        const unsubscribe = Navigation.events().registerComponentListener(listener, componentId);
        return () => {
            unsubscribe.remove();
        };
    }, []);

    useEffect(() => {
        // Subscribe
        const commandListener = Navigation.events().registerCommandListener((name, params) => {
            console.log('>>>>>>>>>>>>>>> name, params', name, params);
        });

        // Unsubscribe
        commandListener.remove();
    }, []);

    return [
        <SafeAreaView
            style={styles.flex}
            mode='margin'
            edges={['left', 'right', 'bottom']}
            key='home.safearea'
        >
            <View
                style={styles.container}
                testID='home.screen'
            >
                <View
                    key='home.body.screen'
                    style={styles.body}
                >
                    <View style={styles.teamContainer}>
                        {/*    Render team icons in here*/}
                    </View>
                    <View>
                        {/* Render SectionList from RN */}
                        <Text style={styles.screenTitle}>{` ${componentId} `}</Text>
                        <View style={styles.textContainer}>
                            <Text
                                style={{marginBottom: 15}}
                                onPress={() => {
                                    return showModal('Modal', 'modal', {theme});
                                }}
                            >
                                {'Open Modal'}
                            </Text>
                            <Text
                                onPress={() => {
                                    // @ts-expect-error: animate() exists on the BottomTabBar component
                                    tabRef?.current?.animate();
                                    return goToScreen('ChannelList', 'Channel', {theme});
                                }}
                            >
                                {'Go to another screen'}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </SafeAreaView>,
        <View
            key='bottom.tabbar'
            style={styles.tabContainer}
        >
            <BottomTabBar
                theme={theme}
                ref={tabRef}
            />
        </View>,

    ];
};

Home.options = {
    topBar: {
        visible: false,
    },
};

const getStyleSheet = makeStyleSheetFromTheme(() => ({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    body: {
        flex: 1,
        backgroundColor: '#145DBF',
    },
    tabContainer: {
        position: 'absolute',
        bottom: 0,
        backgroundColor: '#FFFFFF',
    },
    textContainer: {
        marginTop: 30,
        alignItems: 'center',
    },
    screenTitle: {
        fontSize: 30,
        alignSelf: 'center',
    },
    teamContainer: {
        height: '88.4%',
        width: '17.4%',
        backgroundColor: '#0B428C',
        position: 'absolute',
        bottom: 0,
        left: 0,
        borderTopRightRadius: 12,
    },
}));

export default Home;
