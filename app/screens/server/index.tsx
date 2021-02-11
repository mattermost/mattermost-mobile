// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {Colors, DebugInstructions, LearnMoreLinks, ReloadInstructions} from 'react-native/Libraries/NewAppScreen';

import {Screens} from '@constants';
import {goToScreen} from '@screens/navigation';

declare const global: { HermesInternal: null | {} };

const App = () => {
    return (
        <>
            <StatusBar barStyle='dark-content'/>
            <SafeAreaView>
                <ScrollView
                    contentInsetAdjustmentBehavior='automatic'
                    style={styles.scrollView}
                >
                    {global.HermesInternal == null ? null : (
                        <View style={styles.engine}>
                            <Text style={styles.footer}>{'Engine: Hermes'}</Text>
                        </View>
                    )}
                    <View style={styles.body}>
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>{'Step One'}</Text>
                            <Text style={styles.sectionDescription}>
                                {'Edit '}
                                <Text
                                    style={styles.highlight}
                                >{'screens/server/index.tsx'}</Text>{' to change this'}
                                {'XXXXXscreen and then come back to see your edits.'}
                            </Text>
                        </View>
                        <View style={styles.sectionContainer}>
                            <Text
                                style={styles.sectionTitle}
                                onPress={() => goToScreen(Screens.CHANNEL, 'Channel')}
                            >{'See Your Changes'}</Text>
                            <Text style={styles.sectionDescription}>
                                <ReloadInstructions/>
                            </Text>
                        </View>
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>{'Debug'}</Text>
                            <Text style={styles.sectionDescription}>
                                <DebugInstructions/>
                            </Text>
                        </View>
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>{'Learn More'}</Text>
                            <Text style={styles.sectionDescription}>
                                {'Read the docs to discover what to do next:'}
                            </Text>
                        </View>
                        <LearnMoreLinks/>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </>
    );
};

const styles = StyleSheet.create({
    scrollView: {
        backgroundColor: Colors.lighter,
    },
    engine: {
        position: 'absolute',
        right: 0,
    },
    body: {
        backgroundColor: Colors.white,
    },
    sectionContainer: {
        marginTop: 32,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: Colors.black,
    },
    sectionDescription: {
        marginTop: 8,
        fontSize: 18,
        fontWeight: '400',
        color: Colors.dark,
    },
    highlight: {
        fontWeight: '700',
    },
    footer: {
        color: Colors.dark,
        fontSize: 12,
        fontWeight: '600',
        padding: 4,
        paddingRight: 12,
        textAlign: 'right',
    },
});

export default App;
