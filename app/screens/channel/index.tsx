// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View} from 'react-native';
import {
    Colors,
    DebugInstructions,
    Header,
    LearnMoreLinks,
    ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

import type {LaunchProps} from '@typings/launch';

import {logout} from '@actions/remote/user';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';

type ChannelProps = LaunchProps;

const Channel = (props: ChannelProps) => {
    // TODO: If we have LaunchProps, ensure we load the correct channel/post/modal.
    const {launchType} = props;
    console.log(launchType); // eslint-disable-line no-console
    // TODO: If LaunchProps.error is true, use the LaunchProps.launchType to determine which
    // error message to display. For example:
    // if (props.launchError) {
    //     let erroMessage;
    //     if (props.launchType === LaunchType.DeepLink) {
    //         errorMessage = intl.formatMessage({id: 'mobile.launchError.deepLink', defaultMessage: 'Did not find a server for this deep link'});
    //     } else if (props.launchType === LaunchType.Notification) {
    //         errorMessage = intl.formatMessage({id: 'mobile.launchError.notification', defaultMessage: 'Did not find a server for this notification'});
    //     }
    // }
    const serverUrl = useServerUrl();
    const theme = useTheme();

    const doLogout = () => {
        logout(serverUrl!);
    };

    return (
        <>
            <StatusBar barStyle='dark-content'/>
            <SafeAreaView>
                <ScrollView
                    contentInsetAdjustmentBehavior='automatic'
                    style={styles.scrollView}
                >
                    <Header/>
                    <View style={styles.body}>
                        <View style={styles.sectionContainer}>
                            <Text
                                onPress={doLogout}
                                style={styles.sectionTitle}
                            >{`Logout from ${serverUrl}`}</Text>
                            <Text style={[styles.sectionDescription, {color: theme.centerChannelColor}]}>
                                {'Edit '}<Text style={[styles.highlight, {color: theme.centerChannelColor}]}>{'screens/channel/index.tsx'}</Text>{' to change this'}
                                {' screen and then come back to see your edits.'}
                            </Text>
                        </View>
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>{'See Your Changes'}</Text>
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

export default Channel;
